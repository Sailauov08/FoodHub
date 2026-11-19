import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getRestaurant } from "@/server/restaurant";

/**
 * Revenue rules (documented in ARCHITECTURE.md):
 *  - "Paid revenue" = sum of Order.total for orders whose Payment.status = PAID, bucketed by Payment.paidAt.
 *    With cash payments an order becomes PAID when it is DELIVERED or PICKED_UP.
 *  - Cancelled / unpaid orders never count toward revenue or average order value.
 *  - "Orders placed" counts every order created in the range (any status), used for funnel/status charts.
 *  - All bucketing happens in the restaurant timezone (Asia/Almaty).
 */

export type Granularity = "day" | "week" | "month";
const TZ = "Asia/Almaty";

export type AnalyticsRange = { from: Date; to: Date; granularity: Granularity };

export async function getAnalytics({ from, to, granularity }: AnalyticsRange) {
  const r = await getRestaurant();
  const gran = Prisma.raw(`'${granularity === "week" ? "week" : granularity === "month" ? "month" : "day"}'`);
  const tz = Prisma.raw(`'${TZ}'`);

  const [revenueSeries, kpiRows, statusRows, topItems, peakHours, coupons] = await Promise.all([
    db.$queryRaw<{ bucket: Date; revenue: bigint; orders: bigint }[]>`
      SELECT date_trunc(${gran}, p."paidAt" AT TIME ZONE ${tz}) AS bucket,
             COALESCE(SUM(o."total"), 0)::bigint AS revenue,
             COUNT(*)::bigint AS orders
      FROM "Payment" p JOIN "Order" o ON o."id" = p."orderId"
      WHERE p."status" = 'PAID' AND o."restaurantId" = ${r.id}
        AND p."paidAt" >= ${from} AND p."paidAt" < ${to}
      GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ revenue: bigint; paid: bigint; discount: bigint }[]>`
      SELECT COALESCE(SUM(o."total"), 0)::bigint AS revenue,
             COUNT(*)::bigint AS paid,
             COALESCE(SUM(o."discount"), 0)::bigint AS discount
      FROM "Payment" p JOIN "Order" o ON o."id" = p."orderId"
      WHERE p."status" = 'PAID' AND o."restaurantId" = ${r.id}
        AND p."paidAt" >= ${from} AND p."paidAt" < ${to}`,
    db.order.groupBy({
      by: ["status"],
      where: { restaurantId: r.id, createdAt: { gte: from, lt: to } },
      _count: { _all: true },
    }),
    db.$queryRaw<{ productId: string | null; name: string; quantity: bigint; revenue: bigint }[]>`
      SELECT oi."productId", MAX(oi."nameEn") AS name,
             SUM(oi."quantity")::bigint AS quantity, SUM(oi."lineTotal")::bigint AS revenue
      FROM "OrderItem" oi
      JOIN "Order" o ON o."id" = oi."orderId"
      JOIN "Payment" p ON p."orderId" = o."id"
      WHERE p."status" = 'PAID' AND o."restaurantId" = ${r.id}
        AND p."paidAt" >= ${from} AND p."paidAt" < ${to}
      GROUP BY oi."productId"
      ORDER BY quantity DESC
      LIMIT 10`,
    db.$queryRaw<{ hour: number; orders: bigint }[]>`
      SELECT EXTRACT(HOUR FROM o."createdAt" AT TIME ZONE ${tz})::int AS hour, COUNT(*)::bigint AS orders
      FROM "Order" o
      WHERE o."restaurantId" = ${r.id} AND o."status" <> 'CANCELLED'
        AND o."createdAt" >= ${from} AND o."createdAt" < ${to}
      GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ code: string; uses: bigint; discount: bigint }[]>`
      SELECT o."couponCode" AS code, COUNT(*)::bigint AS uses, COALESCE(SUM(o."discount"), 0)::bigint AS discount
      FROM "Order" o
      WHERE o."restaurantId" = ${r.id} AND o."couponCode" IS NOT NULL AND o."status" <> 'CANCELLED'
        AND o."createdAt" >= ${from} AND o."createdAt" < ${to}
      GROUP BY 1 ORDER BY uses DESC`,
  ]);

  // Localized names for top items (snapshot names are kept per locale in OrderItem).
  const ids = topItems.map((t) => t.productId).filter((v): v is string => !!v);
  const names = ids.length
    ? await db.product.findMany({ where: { id: { in: ids } }, select: { id: true, nameKk: true, nameRu: true, nameEn: true } })
    : [];
  const nameMap = new Map(names.map((n) => [n.id, n]));

  const kpi = kpiRows[0] ?? { revenue: BigInt(0), paid: BigInt(0), discount: BigInt(0) };
  const placed = statusRows.reduce((a, s) => a + s._count._all, 0);
  const cancelled = statusRows.find((s) => s.status === "CANCELLED")?._count._all ?? 0;
  const revenue = Number(kpi.revenue);
  const paid = Number(kpi.paid);

  const hours = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    orders: Number(peakHours.find((p) => p.hour === h)?.orders ?? 0),
  }));

  return {
    kpis: {
      revenue,
      paidOrders: paid,
      averageOrderValue: paid ? Math.round(revenue / paid) : 0,
      ordersPlaced: placed,
      cancelled,
      discounts: Number(kpi.discount),
    },
    revenueSeries: revenueSeries.map((s) => ({
      bucket: s.bucket.toISOString().slice(0, 10),
      revenue: Number(s.revenue),
      orders: Number(s.orders),
    })),
    statusDistribution: statusRows.map((s) => ({ status: s.status, count: s._count._all })),
    topItems: topItems.map((t) => {
      const n = t.productId ? nameMap.get(t.productId) : undefined;
      return {
        productId: t.productId,
        nameKk: n?.nameKk ?? t.name,
        nameRu: n?.nameRu ?? t.name,
        nameEn: n?.nameEn ?? t.name,
        quantity: Number(t.quantity),
        revenue: Number(t.revenue),
      };
    }),
    peakHours: hours,
    coupons: coupons.map((c) => ({ code: c.code, uses: Number(c.uses), discount: Number(c.discount) })),
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;

/** Start of "today" in the restaurant timezone, as a UTC Date. */
export function startOfTodayAlmaty(now = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  // Asia/Almaty is UTC+5 year-round (no DST since 2024).
  return new Date(`${ymd}T00:00:00+05:00`);
}

export function parseRange(params: { from?: string; to?: string; g?: string }): AnalyticsRange {
  const today = startOfTodayAlmaty();
  const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const from = isDate(params.from) ? new Date(`${params.from}T00:00:00+05:00`) : new Date(today.getTime() - 29 * 86400000);
  const toDay = isDate(params.to) ? new Date(`${params.to}T00:00:00+05:00`) : today;
  const to = new Date(toDay.getTime() + 86400000);
  const granularity: Granularity = params.g === "week" || params.g === "month" ? params.g : "day";
  if (to <= from || to.getTime() - from.getTime() > 400 * 86400000) {
    return { from: new Date(today.getTime() - 29 * 86400000), to: new Date(today.getTime() + 86400000), granularity };
  }
  return { from, to, granularity };
}

export function toDateInput(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
