/**
 * Pure, framework-free pricing logic. Used by the server (authoritative) and in tests.
 * The client never sends prices; it only sends product/variant/modifier ids and quantities.
 */

export type PricingOption = { id: string; price: number; isAvailable: boolean; isArchived: boolean };
export type PricingGroup = { id: string; minSelect: number; maxSelect: number; options: PricingOption[] };
export type PricingVariant = { id: string; price: number; isAvailable: boolean; isArchived: boolean };
export type PricingProduct = {
  id: string;
  price: number;
  isAvailable: boolean;
  isArchived: boolean;
  maxPerOrder: number;
  categoryActive?: boolean;
  variants: PricingVariant[];
  modifierGroups: PricingGroup[];
};

export type LineInput = {
  productId: string;
  variantId?: string | null;
  modifierOptionIds: string[];
  quantity: number;
};

export type LineError =
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_UNAVAILABLE"
  | "VARIANT_REQUIRED"
  | "VARIANT_INVALID"
  | "VARIANT_UNAVAILABLE"
  | "MODIFIER_INVALID"
  | "MODIFIER_UNAVAILABLE"
  | "MODIFIER_MIN"
  | "MODIFIER_MAX"
  | "QUANTITY_INVALID";

export type PricedLine =
  | {
      ok: true;
      unitPrice: number;
      lineTotal: number;
      variantId: string | null;
      optionIds: string[];
    }
  | { ok: false; error: LineError };

export const MAX_LINE_QUANTITY_HARD_CAP = 50;

export function lineKey(productId: string, variantId: string | null | undefined, optionIds: string[]): string {
  return [productId, variantId ?? "-", [...new Set(optionIds)].sort().join(",")].join("|");
}

export function priceLine(product: PricingProduct | undefined, line: LineInput): PricedLine {
  if (!product) return { ok: false, error: "PRODUCT_NOT_FOUND" };
  if (product.isArchived || !product.isAvailable || product.categoryActive === false)
    return { ok: false, error: "PRODUCT_UNAVAILABLE" };

  const maxQty = Math.min(product.maxPerOrder, MAX_LINE_QUANTITY_HARD_CAP);
  if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > maxQty)
    return { ok: false, error: "QUANTITY_INVALID" };

  let unitPrice = product.price;
  let variantId: string | null = null;
  const liveVariants = product.variants.filter((v) => !v.isArchived);
  if (liveVariants.length > 0) {
    if (!line.variantId) return { ok: false, error: "VARIANT_REQUIRED" };
    const variant = liveVariants.find((v) => v.id === line.variantId);
    if (!variant) return { ok: false, error: "VARIANT_INVALID" };
    if (!variant.isAvailable) return { ok: false, error: "VARIANT_UNAVAILABLE" };
    unitPrice = variant.price;
    variantId = variant.id;
  } else if (line.variantId) {
    return { ok: false, error: "VARIANT_INVALID" };
  }

  const selected = new Set(line.modifierOptionIds);
  if (selected.size !== line.modifierOptionIds.length) return { ok: false, error: "MODIFIER_INVALID" };

  const known = new Set<string>();
  for (const group of product.modifierGroups) {
    const liveOptions = group.options.filter((o) => !o.isArchived);
    const chosen = liveOptions.filter((o) => selected.has(o.id));
    for (const o of liveOptions) known.add(o.id);
    if (chosen.some((o) => !o.isAvailable)) return { ok: false, error: "MODIFIER_UNAVAILABLE" };
    if (chosen.length < group.minSelect) return { ok: false, error: "MODIFIER_MIN" };
    if (chosen.length > group.maxSelect) return { ok: false, error: "MODIFIER_MAX" };
    unitPrice += chosen.reduce((sum, o) => sum + o.price, 0);
  }
  for (const id of selected) if (!known.has(id)) return { ok: false, error: "MODIFIER_INVALID" };

  return {
    ok: true,
    unitPrice,
    lineTotal: unitPrice * line.quantity,
    variantId,
    optionIds: [...selected].sort(),
  };
}

// ---------- Coupons ----------

export type CouponRule = {
  type: "PERCENT" | "FIXED";
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  usedCount: number;
  isActive: boolean;
};

export type CouponError = "COUPON_INACTIVE" | "COUPON_NOT_STARTED" | "COUPON_EXPIRED" | "COUPON_EXHAUSTED" | "COUPON_USER_LIMIT" | "COUPON_MIN_SUBTOTAL";

export function evaluateCoupon(
  coupon: CouponRule,
  ctx: { subtotal: number; now: Date; customerUsage: number },
): { ok: true; discount: number } | { ok: false; error: CouponError } {
  if (!coupon.isActive) return { ok: false, error: "COUPON_INACTIVE" };
  if (coupon.startsAt && ctx.now < coupon.startsAt) return { ok: false, error: "COUPON_NOT_STARTED" };
  if (coupon.endsAt && ctx.now > coupon.endsAt) return { ok: false, error: "COUPON_EXPIRED" };
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return { ok: false, error: "COUPON_EXHAUSTED" };
  if (coupon.perUserLimit !== null && ctx.customerUsage >= coupon.perUserLimit) return { ok: false, error: "COUPON_USER_LIMIT" };
  if (ctx.subtotal < coupon.minSubtotal) return { ok: false, error: "COUPON_MIN_SUBTOTAL" };

  let discount =
    coupon.type === "PERCENT" ? Math.floor((ctx.subtotal * Math.min(Math.max(coupon.value, 0), 100)) / 100) : Math.max(coupon.value, 0);
  if (coupon.maxDiscount !== null) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, ctx.subtotal);
  return { ok: true, discount };
}

// ---------- Totals ----------

export type DeliverySettings = { deliveryFee: number; freeDeliveryThreshold: number | null; minOrderValue: number };

export function computeDeliveryFee(fulfillment: "DELIVERY" | "PICKUP", subtotal: number, s: DeliverySettings): number {
  if (fulfillment === "PICKUP") return 0;
  if (s.freeDeliveryThreshold !== null && subtotal >= s.freeDeliveryThreshold) return 0;
  return s.deliveryFee;
}

export function computeTotals(input: {
  lineTotals: number[];
  discount: number;
  fulfillment: "DELIVERY" | "PICKUP";
  settings: DeliverySettings;
}) {
  const subtotal = input.lineTotals.reduce((a, b) => a + b, 0);
  const discount = Math.min(Math.max(input.discount, 0), subtotal);
  const deliveryFee = computeDeliveryFee(input.fulfillment, subtotal, input.settings);
  const total = subtotal - discount + deliveryFee;
  return {
    subtotal,
    discount,
    deliveryFee,
    total,
    belowMinimum: subtotal < input.settings.minOrderValue,
    amountToMinimum: Math.max(0, input.settings.minOrderValue - subtotal),
  };
}
