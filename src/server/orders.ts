import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  computeTotals,
  evaluateCoupon,
  priceLine,
  type CouponError,
  type LineError,
  type PricingProduct,
} from "@/lib/domain/pricing";
import { canTransition, timestampFieldFor, type ActorRole, type OrderStatusValue } from "@/lib/domain/order-status";
import type { CartLineDTO, CheckoutData } from "@/lib/validation";
import { getOrderingState, getRestaurant } from "@/server/restaurant";
import type { SessionUser } from "@/lib/session";
import { isPreview } from "@/lib/preview";
import { previewCoupons, previewProducts } from "@/server/preview-data";

// ---------- Quote (authoritative price calculation from the database) ----------

const pricingInclude = {
  category: { select: { isActive: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 1 },
  variants: { orderBy: { sortOrder: "asc" } },
  modifierGroups: {
    orderBy: { sortOrder: "asc" },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  },
} satisfies Prisma.ProductInclude;

type PricingRow = Prisma.ProductGetPayload<{ include: typeof pricingInclude }>;

export type QuoteLine = {
  index: number;
  productId: string;
  slug: string | null;
  nameKk: string;
  nameRu: string;
  nameEn: string;
  imageUrl: string | null;
  variantId: string | null;
  variantName: { kk: string; ru: string; en: string } | null;
  modifiers: { id: string; groupKk: string; groupRu: string; groupEn: string; kk: string; ru: string; en: string; price: number }[];
  quantity: number;
  maxPerOrder: number;
  unitPrice: number | null;
  lineTotal: number | null;
  error: LineError | null;
};

export type Quote = {
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  minOrderValue: number;
  belowMinimum: boolean;
  amountToMinimum: number;
  freeDeliveryThreshold: number | null;
  coupon: { code: string; id: string; discount: number } | null;
  couponError: CouponError | "COUPON_NOT_FOUND" | null;
  hasInvalidLines: boolean;
  canOrder: boolean;
  preview: boolean;
};

function toPricing(p: PricingRow): PricingProduct {
  return {
    id: p.id,
    price: p.price,
    isAvailable: p.isAvailable,
    isArchived: p.isArchived,
    maxPerOrder: p.maxPerOrder,
    categoryActive: p.category.isActive,
    variants: p.variants,
    modifierGroups: p.modifierGroups.map((g) => ({
      id: g.id,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      options: g.options,
    })),
  };
}

export async function couponUsage(couponId: string, userId: string | null, phone: string | null) {
  if (isPreview || (!userId && !phone)) return 0;
  return db.couponRedemption.count({
    where: {
      couponId,
      order: { status: { not: "CANCELLED" } },
      OR: [...(userId ? [{ userId }] : []), ...(phone ? [{ phone }] : [])],
    },
  });
}

export async function quoteCart(input: {
  lines: CartLineDTO[];
  couponCode?: string | null;
  fulfillment: "DELIVERY" | "PICKUP";
  userId?: string | null;
  phone?: string | null;
}): Promise<{ quote: Quote; rows: Map<string, PricingRow> }> {
  const restaurant = await getRestaurant();
  const ids = [...new Set(input.lines.map((l) => l.productId))];
  const products: PricingRow[] = !ids.length
    ? []
    : isPreview
      ? (previewProducts.filter((p) => ids.includes(p.id)) as unknown as PricingRow[])
      : await db.product.findMany({ where: { id: { in: ids }, restaurantId: restaurant.id }, include: pricingInclude });
  const rows = new Map(products.map((p) => [p.id, p]));

  const lines: QuoteLine[] = input.lines.map((line, index) => {
    const row = rows.get(line.productId);
    const priced = priceLine(row ? toPricing(row) : undefined, {
      productId: line.productId,
      variantId: line.variantId ?? null,
      modifierOptionIds: line.modifierOptionIds,
      quantity: line.quantity,
    });
    const variant = row?.variants.find((v) => v.id === line.variantId) ?? null;
    const selected = new Set(line.modifierOptionIds);
    const modifiers =
      row?.modifierGroups.flatMap((g) =>
        g.options
          .filter((o) => selected.has(o.id))
          .map((o) => ({
            id: o.id,
            groupKk: g.nameKk,
            groupRu: g.nameRu,
            groupEn: g.nameEn,
            kk: o.nameKk,
            ru: o.nameRu,
            en: o.nameEn,
            price: o.price,
          })),
      ) ?? [];
    return {
      index,
      productId: line.productId,
      slug: row?.slug ?? null,
      nameKk: row?.nameKk ?? "—",
      nameRu: row?.nameRu ?? "—",
      nameEn: row?.nameEn ?? "—",
      imageUrl: row?.images[0]?.url ?? null,
      variantId: variant?.id ?? null,
      variantName: variant ? { kk: variant.nameKk, ru: variant.nameRu, en: variant.nameEn } : null,
      modifiers,
      quantity: line.quantity,
      maxPerOrder: row?.maxPerOrder ?? 1,
      unitPrice: priced.ok ? priced.unitPrice : null,
      lineTotal: priced.ok ? priced.lineTotal : null,
      error: priced.ok ? null : priced.error,
    };
  });

  const validTotals = lines.filter((l) => l.lineTotal !== null).map((l) => l.lineTotal as number);
  const subtotal = validTotals.reduce((a, b) => a + b, 0);

  let coupon: Quote["coupon"] = null;
  let couponError: Quote["couponError"] = null;
  const code = input.couponCode?.trim().toUpperCase();
  if (code) {
    const c = isPreview
      ? (previewCoupons.find((x) => x.code === code) ?? null)
      : await db.coupon.findUnique({ where: { restaurantId_code: { restaurantId: restaurant.id, code } } });
    if (!c) couponError = "COUPON_NOT_FOUND";
    else {
      const usage = c.perUserLimit !== null ? await couponUsage(c.id, input.userId ?? null, input.phone ?? null) : 0;
      const result = evaluateCoupon(c, { subtotal, now: new Date(), customerUsage: usage });
      if (result.ok) coupon = { code: c.code, id: c.id, discount: result.discount };
      else couponError = result.error;
    }
  }

  const s = restaurant.settings;
  const totals = computeTotals({
    lineTotals: validTotals,
    discount: coupon?.discount ?? 0,
    fulfillment: input.fulfillment,
    settings: { deliveryFee: s.deliveryFee, freeDeliveryThreshold: s.freeDeliveryThreshold, minOrderValue: s.minOrderValue },
  });
  const ordering = await getOrderingState();

  return {
    rows,
    quote: {
      lines,
      ...totals,
      minOrderValue: s.minOrderValue,
      freeDeliveryThreshold: s.freeDeliveryThreshold,
      coupon,
      couponError,
      hasInvalidLines: lines.some((l) => l.error !== null),
      canOrder: ordering.canOrder,
      preview: isPreview,
    },
  };
}

// ---------- Tokens ----------

/**
 * Tracking token derived from the idempotency key with a server secret, so an idempotent replay
 * can return the same token without the raw token ever being stored (only its hash is persisted).
 */
export function deriveTrackingToken(idempotencyKey: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`order-tracking:${idempotencyKey}`).digest("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(token: string, hash: string): boolean {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function orderNumber(now = new Date()): string {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty", year: "2-digit", month: "2-digit", day: "2-digit" })
    .format(now)
    .replace(/-/g, "");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(5);
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `FH-${d}-${suffix}`;
}

// ---------- Create order ----------

export class CheckoutError extends Error {
  constructor(
    public readonly code:
      | "RESTAURANT_CLOSED"
      | "INVALID_LINES"
      | "MIN_ORDER"
      | "COUPON_INVALID"
      | "IDEMPOTENCY_CONFLICT",
    public readonly details?: Record<string, unknown>,
  ) {
    super(code);
  }
}

export type CreatedOrder = { orderId: string; number: string; token: string; replay: boolean };

export async function createOrder(input: CheckoutData, user: SessionUser | null): Promise<CreatedOrder> {
  // Idempotent replay: the same key returns the same order (only to the same customer).
  const existing = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return replay(existing, input, user);

  const ordering = await getOrderingState();
  if (!ordering.canOrder) throw new CheckoutError("RESTAURANT_CLOSED");

  const { quote, rows } = await quoteCart({
    lines: input.lines,
    couponCode: input.couponCode,
    fulfillment: input.fulfillment,
    userId: user?.id ?? null,
    phone: input.customerPhone,
  });
  if (quote.hasInvalidLines) {
    throw new CheckoutError("INVALID_LINES", {
      lines: quote.lines.filter((l) => l.error).map((l) => ({ index: l.index, error: l.error })),
    });
  }
  if (quote.belowMinimum) throw new CheckoutError("MIN_ORDER", { minOrderValue: quote.minOrderValue });
  if (input.couponCode && !quote.coupon) throw new CheckoutError("COUPON_INVALID", { reason: quote.couponError });

  const restaurant = await getRestaurant();
  const token = deriveTrackingToken(input.idempotencyKey);
  const now = new Date();
  const etaMinutes =
    input.fulfillment === "DELIVERY" ? restaurant.settings.estimatedDeliveryMin : restaurant.settings.estimatedPickupMin;

  try {
    const order = await db.$transaction(async (tx) => {
      if (quote.coupon) {
        // Atomic usage-limit guard: only increments while below the limit.
        const updated = await tx.$executeRaw`
          UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
          WHERE "id" = ${quote.coupon.id} AND "isActive" = true
            AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
        if (updated !== 1) throw new CheckoutError("COUPON_INVALID", { reason: "COUPON_EXHAUSTED" });
      }

      const created = await tx.order.create({
        data: {
          number: orderNumber(now),
          restaurantId: restaurant.id,
          userId: user?.id ?? null,
          trackingTokenHash: hashToken(token),
          idempotencyKey: input.idempotencyKey,
          status: "PENDING",
          fulfillment: input.fulfillment,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail || user?.email || null,
          addressStreet: input.fulfillment === "DELIVERY" ? input.addressStreet : null,
          addressApartment: input.fulfillment === "DELIVERY" ? input.addressApartment || null : null,
          addressEntrance: input.fulfillment === "DELIVERY" ? input.addressEntrance || null : null,
          addressFloor: input.fulfillment === "DELIVERY" ? input.addressFloor || null : null,
          addressNotes: input.fulfillment === "DELIVERY" ? input.addressNotes || null : null,
          comment: input.comment || null,
          locale: input.locale,
          subtotal: quote.subtotal,
          discount: quote.discount,
          deliveryFee: quote.deliveryFee,
          total: quote.total,
          couponId: quote.coupon?.id ?? null,
          couponCode: quote.coupon?.code ?? null,
          estimatedReadyAt: new Date(now.getTime() + etaMinutes * 60_000),
          items: {
            create: quote.lines.map((l) => {
              const row = rows.get(l.productId)!;
              return {
                productId: l.productId,
                variantId: l.variantId,
                nameKk: row.nameKk,
                nameRu: row.nameRu,
                nameEn: row.nameEn,
                variantName: l.variantName ? `${l.variantName.kk} / ${l.variantName.ru} / ${l.variantName.en}` : null,
                imageUrl: l.imageUrl,
                unitPrice: l.unitPrice!,
                quantity: l.quantity,
                lineTotal: l.lineTotal!,
                modifiers: {
                  create: l.modifiers.map((m) => ({
                    modifierOptionId: m.id,
                    groupName: `${m.groupKk} / ${m.groupRu} / ${m.groupEn}`,
                    name: `${m.kk} / ${m.ru} / ${m.en}`,
                    price: m.price,
                  })),
                },
              };
            }),
          },
          statusHistory: {
            create: { from: null, to: "PENDING", actorId: user?.id ?? null, actorRole: user ? user.role : "GUEST" },
          },
          payment: {
            create: {
              method: input.paymentMethod,
              status: "UNPAID",
              amount: quote.total,
            },
          },
        },
      });

      if (quote.coupon) {
        await tx.couponRedemption.create({
          data: {
            couponId: quote.coupon.id,
            orderId: created.id,
            userId: user?.id ?? null,
            phone: input.customerPhone,
            discount: quote.discount,
          },
        });
      }

      for (const l of quote.lines) {
        await tx.product.update({ where: { id: l.productId }, data: { popularity: { increment: l.quantity } } });
      }
      return created;
    });
    return { orderId: order.id, number: order.number, token, replay: false };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const dup = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (dup) return replay(dup, input, user);
    }
    throw err;
  }
}

function replay(
  existing: { id: string; number: string; userId: string | null; customerPhone: string },
  input: CheckoutData,
  user: SessionUser | null,
): CreatedOrder {
  const sameCustomer = existing.userId ? existing.userId === user?.id : existing.customerPhone === input.customerPhone;
  if (!sameCustomer) throw new CheckoutError("IDEMPOTENCY_CONFLICT");
  return { orderId: existing.id, number: existing.number, token: deriveTrackingToken(input.idempotencyKey), replay: true };
}

// ---------- Access ----------

export const orderDetailInclude = {
  items: { include: { modifiers: true }, orderBy: { id: "asc" } },
  statusHistory: { orderBy: { createdAt: "asc" } },
  payment: true,
} satisfies Prisma.OrderInclude;

export type OrderDetail = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

/** Returns the order only if the viewer is its owner, staff, or holds the secret tracking token. */
export async function getOrderForViewer(orderId: string, viewer: SessionUser | null, token: string | null) {
  if (isPreview) return null;
  if (!/^[a-z0-9]{10,40}$/i.test(orderId)) return null;
  const order = await db.order.findUnique({ where: { id: orderId }, include: orderDetailInclude });
  if (!order) return null;
  const isStaff = !!viewer && viewer.role !== "CUSTOMER";
  const isOwner = !!viewer && order.userId === viewer.id;
  const hasToken = !!token && token.length <= 64 && tokenMatches(token, order.trackingTokenHash);
  if (!isStaff && !isOwner && !hasToken) return null;
  return { order, access: isStaff ? ("staff" as const) : isOwner ? ("owner" as const) : ("token" as const) };
}

// ---------- Status transitions ----------

export class TransitionError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "INVALID_TRANSITION" | "FORBIDDEN" | "WRONG_FULFILLMENT" | "CONFLICT") {
    super(code);
  }
}

export async function transitionOrder(params: {
  orderId: string;
  to: OrderStatusValue;
  actor: { id: string | null; role: ActorRole };
  note?: string;
}) {
  const { orderId, to, actor, note } = params;
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    if (!order) throw new TransitionError("NOT_FOUND");
    const from = order.status as OrderStatusValue;
    const check = canTransition(from, to, order.fulfillment, actor.role);
    if (!check.ok) throw new TransitionError(check.reason);

    const now = new Date();
    const tsField = timestampFieldFor(to);
    // Optimistic concurrency: only update if the status has not changed since we read it.
    const res = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: {
        status: to,
        ...(tsField ? { [tsField]: now } : {}),
        ...(to === "CANCELLED" ? { cancelReason: note ?? null } : {}),
      },
    });
    if (res.count !== 1) throw new TransitionError("CONFLICT");

    await tx.orderStatusHistory.create({
      data: { orderId, from: order.status, to, actorId: actor.id, actorRole: actor.role, note: note ?? null },
    });

    if (order.payment) {
      if (to === "DELIVERED" || to === "PICKED_UP") {
        // Cash collected on hand-over.
        await tx.payment.update({ where: { orderId }, data: { status: "PAID", paidAt: now } });
      } else if (to === "CANCELLED" && order.payment.status === "UNPAID") {
        await tx.payment.update({ where: { orderId }, data: { status: "VOIDED" } });
      }
    }

    if (to === "CANCELLED" && order.couponId) {
      // Release the coupon use.
      await tx.coupon.updateMany({ where: { id: order.couponId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
    }

    if (actor.role !== "CUSTOMER" && actor.role !== "GUEST") {
      await tx.auditLog.create({
        data: { actorId: actor.id, action: "order.status", entity: "Order", entityId: orderId, meta: { from, to } },
      });
    }
    return { from, to };
  });
}
