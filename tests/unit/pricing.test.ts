import { describe, expect, it } from "vitest";
import {
  computeDeliveryFee,
  computeTotals,
  evaluateCoupon,
  lineKey,
  priceLine,
  type CouponRule,
  type PricingProduct,
} from "@/lib/domain/pricing";

const pizza: PricingProduct = {
  id: "p1",
  price: 2990,
  isAvailable: true,
  isArchived: false,
  maxPerOrder: 10,
  variants: [
    { id: "v30", price: 2990, isAvailable: true, isArchived: false },
    { id: "v40", price: 4290, isAvailable: true, isArchived: false },
    { id: "vOld", price: 100, isAvailable: true, isArchived: true },
  ],
  modifierGroups: [
    {
      id: "crust",
      minSelect: 1,
      maxSelect: 1,
      options: [
        { id: "classic", price: 0, isAvailable: true, isArchived: false },
        { id: "cheese", price: 690, isAvailable: true, isArchived: false },
        { id: "gone", price: 0, isAvailable: false, isArchived: false },
      ],
    },
    {
      id: "extras",
      minSelect: 0,
      maxSelect: 2,
      options: [
        { id: "mozz", price: 400, isAvailable: true, isArchived: false },
        { id: "mush", price: 300, isAvailable: true, isArchived: false },
        { id: "jal", price: 200, isAvailable: true, isArchived: false },
      ],
    },
  ],
};

describe("priceLine", () => {
  it("uses the variant price plus modifier prices", () => {
    const r = priceLine(pizza, { productId: "p1", variantId: "v40", modifierOptionIds: ["cheese", "mozz", "mush"], quantity: 2 });
    expect(r).toEqual({ ok: true, unitPrice: 4290 + 690 + 400 + 300, lineTotal: (4290 + 690 + 700) * 2, variantId: "v40", optionIds: ["cheese", "mozz", "mush"] });
  });

  it("requires a variant when the product has variants", () => {
    expect(priceLine(pizza, { productId: "p1", variantId: null, modifierOptionIds: ["classic"], quantity: 1 })).toEqual({ ok: false, error: "VARIANT_REQUIRED" });
  });

  it("rejects archived or unknown variants", () => {
    expect(priceLine(pizza, { productId: "p1", variantId: "vOld", modifierOptionIds: ["classic"], quantity: 1 })).toEqual({ ok: false, error: "VARIANT_INVALID" });
    expect(priceLine(pizza, { productId: "p1", variantId: "nope", modifierOptionIds: ["classic"], quantity: 1 })).toEqual({ ok: false, error: "VARIANT_INVALID" });
  });

  it("enforces required modifier groups", () => {
    expect(priceLine(pizza, { productId: "p1", variantId: "v30", modifierOptionIds: [], quantity: 1 })).toEqual({ ok: false, error: "MODIFIER_MIN" });
  });

  it("enforces max selections", () => {
    const r = priceLine(pizza, { productId: "p1", variantId: "v30", modifierOptionIds: ["classic", "mozz", "mush", "jal"], quantity: 1 });
    expect(r).toEqual({ ok: false, error: "MODIFIER_MAX" });
  });

  it("rejects unavailable, foreign and duplicate modifier ids", () => {
    expect(priceLine(pizza, { productId: "p1", variantId: "v30", modifierOptionIds: ["gone"], quantity: 1 })).toEqual({ ok: false, error: "MODIFIER_UNAVAILABLE" });
    expect(priceLine(pizza, { productId: "p1", variantId: "v30", modifierOptionIds: ["classic", "other-product-option"], quantity: 1 })).toEqual({ ok: false, error: "MODIFIER_INVALID" });
    expect(priceLine(pizza, { productId: "p1", variantId: "v30", modifierOptionIds: ["classic", "classic"], quantity: 1 })).toEqual({ ok: false, error: "MODIFIER_INVALID" });
  });

  it("validates quantity bounds", () => {
    for (const quantity of [0, -1, 1.5, 11]) {
      expect(priceLine(pizza, { productId: "p1", variantId: "v30", modifierOptionIds: ["classic"], quantity })).toEqual({ ok: false, error: "QUANTITY_INVALID" });
    }
  });

  it("rejects unavailable / archived / missing products and inactive categories", () => {
    expect(priceLine(undefined, { productId: "x", modifierOptionIds: [], quantity: 1 })).toEqual({ ok: false, error: "PRODUCT_NOT_FOUND" });
    expect(priceLine({ ...pizza, isAvailable: false }, { productId: "p1", variantId: "v30", modifierOptionIds: ["classic"], quantity: 1 })).toEqual({ ok: false, error: "PRODUCT_UNAVAILABLE" });
    expect(priceLine({ ...pizza, isArchived: true }, { productId: "p1", variantId: "v30", modifierOptionIds: ["classic"], quantity: 1 })).toEqual({ ok: false, error: "PRODUCT_UNAVAILABLE" });
    expect(priceLine({ ...pizza, categoryActive: false }, { productId: "p1", variantId: "v30", modifierOptionIds: ["classic"], quantity: 1 })).toEqual({ ok: false, error: "PRODUCT_UNAVAILABLE" });
  });

  it("rejects a variant id for products without variants", () => {
    const simple: PricingProduct = { ...pizza, variants: [], modifierGroups: [] };
    expect(priceLine(simple, { productId: "p1", variantId: "v30", modifierOptionIds: [], quantity: 1 })).toEqual({ ok: false, error: "VARIANT_INVALID" });
    expect(priceLine(simple, { productId: "p1", modifierOptionIds: [], quantity: 3 })).toMatchObject({ ok: true, unitPrice: 2990, lineTotal: 8970 });
  });
});

describe("lineKey", () => {
  it("is independent of modifier order and duplicates", () => {
    expect(lineKey("p", "v", ["b", "a", "a"])).toBe(lineKey("p", "v", ["a", "b"]));
    expect(lineKey("p", null, [])).not.toBe(lineKey("p", "v", []));
  });
});

const baseCoupon: CouponRule = {
  type: "PERCENT",
  value: 10,
  minSubtotal: 4000,
  maxDiscount: 2000,
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  perUserLimit: 1,
  usedCount: 0,
  isActive: true,
};
const now = new Date("2026-11-04T12:00:00Z");

describe("evaluateCoupon", () => {
  it("computes percent discounts with a cap", () => {
    expect(evaluateCoupon(baseCoupon, { subtotal: 5000, now, customerUsage: 0 })).toEqual({ ok: true, discount: 500 });
    expect(evaluateCoupon(baseCoupon, { subtotal: 50000, now, customerUsage: 0 })).toEqual({ ok: true, discount: 2000 });
  });

  it("floors percent discounts to whole tenge", () => {
    expect(evaluateCoupon({ ...baseCoupon, maxDiscount: null }, { subtotal: 4999, now, customerUsage: 0 })).toEqual({ ok: true, discount: 499 });
  });

  it("never discounts more than the subtotal", () => {
    expect(evaluateCoupon({ ...baseCoupon, type: "FIXED", value: 9000, minSubtotal: 0, maxDiscount: null }, { subtotal: 3000, now, customerUsage: 0 })).toEqual({ ok: true, discount: 3000 });
  });

  it("checks activity, dates, limits and minimum", () => {
    expect(evaluateCoupon({ ...baseCoupon, isActive: false }, { subtotal: 5000, now, customerUsage: 0 })).toEqual({ ok: false, error: "COUPON_INACTIVE" });
    expect(evaluateCoupon({ ...baseCoupon, startsAt: new Date("2026-12-01") }, { subtotal: 5000, now, customerUsage: 0 })).toEqual({ ok: false, error: "COUPON_NOT_STARTED" });
    expect(evaluateCoupon({ ...baseCoupon, endsAt: new Date("2026-11-01") }, { subtotal: 5000, now, customerUsage: 0 })).toEqual({ ok: false, error: "COUPON_EXPIRED" });
    expect(evaluateCoupon({ ...baseCoupon, usageLimit: 5, usedCount: 5 }, { subtotal: 5000, now, customerUsage: 0 })).toEqual({ ok: false, error: "COUPON_EXHAUSTED" });
    expect(evaluateCoupon(baseCoupon, { subtotal: 5000, now, customerUsage: 1 })).toEqual({ ok: false, error: "COUPON_USER_LIMIT" });
    expect(evaluateCoupon(baseCoupon, { subtotal: 3999, now, customerUsage: 0 })).toEqual({ ok: false, error: "COUPON_MIN_SUBTOTAL" });
  });
});

describe("totals", () => {
  const settings = { deliveryFee: 990, freeDeliveryThreshold: 15000, minOrderValue: 3000 };

  it("adds delivery below the free threshold and none for pickup", () => {
    expect(computeDeliveryFee("DELIVERY", 5000, settings)).toBe(990);
    expect(computeDeliveryFee("DELIVERY", 15000, settings)).toBe(0);
    expect(computeDeliveryFee("PICKUP", 1000, settings)).toBe(0);
    expect(computeDeliveryFee("DELIVERY", 99999, { ...settings, freeDeliveryThreshold: null })).toBe(990);
  });

  it("computes subtotal − discount + delivery and the minimum order state", () => {
    const r = computeTotals({ lineTotals: [2000, 3000], discount: 500, fulfillment: "DELIVERY", settings });
    expect(r).toEqual({ subtotal: 5000, discount: 500, deliveryFee: 990, total: 5490, belowMinimum: false, amountToMinimum: 0 });
    const small = computeTotals({ lineTotals: [1000], discount: 0, fulfillment: "PICKUP", settings });
    expect(small).toMatchObject({ total: 1000, belowMinimum: true, amountToMinimum: 2000 });
  });

  it("clamps discounts to [0, subtotal]", () => {
    expect(computeTotals({ lineTotals: [1000], discount: 5000, fulfillment: "PICKUP", settings }).discount).toBe(1000);
    expect(computeTotals({ lineTotals: [1000], discount: -5, fulfillment: "PICKUP", settings }).discount).toBe(0);
  });
});
