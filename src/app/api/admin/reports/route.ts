import { db } from "@/lib/db";
import { assertRole, MANAGEMENT_ROLES } from "@/lib/session";
import { parseRange } from "@/server/analytics";
import { getRestaurant } from "@/server/restaurant";
import { handleRouteError, jsonError } from "@/server/http";

/** Neutralises spreadsheet formula injection and quotes CSV fields. */
function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(header: string[], rows: unknown[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

export async function GET(req: Request) {
  try {
    const user = await assertRole(MANAGEMENT_ROLES);
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const range = parseRange({ from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined });
    const r = await getRestaurant();

    let csv: string;
    if (type === "orders") {
      const orders = await db.order.findMany({
        where: { restaurantId: r.id, createdAt: { gte: range.from, lt: range.to } },
        orderBy: { createdAt: "asc" },
        include: { payment: true, _count: { select: { items: true } } },
        take: 10000,
      });
      // Minimum necessary data: no phone numbers or addresses in exports.
      csv = toCsv(
        ["number", "created_at", "status", "fulfillment", "items", "subtotal", "discount", "delivery_fee", "total", "coupon", "payment_method", "payment_status", "paid_at"],
        orders.map((o) => [
          o.number,
          o.createdAt,
          o.status,
          o.fulfillment,
          o._count.items,
          o.subtotal,
          o.discount,
          o.deliveryFee,
          o.total,
          o.couponCode,
          o.payment?.method,
          o.payment?.status,
          o.payment?.paidAt,
        ]),
      );
    } else if (type === "products") {
      const rows = await db.$queryRaw<{ name: string; quantity: bigint; revenue: bigint }[]>`
        SELECT MAX(oi."nameEn") AS name, SUM(oi."quantity")::bigint AS quantity, SUM(oi."lineTotal")::bigint AS revenue
        FROM "OrderItem" oi JOIN "Order" o ON o."id" = oi."orderId" JOIN "Payment" p ON p."orderId" = o."id"
        WHERE p."status" = 'PAID' AND o."restaurantId" = ${r.id} AND p."paidAt" >= ${range.from} AND p."paidAt" < ${range.to}
        GROUP BY oi."productId" ORDER BY quantity DESC`;
      csv = toCsv(["product", "quantity_sold", "paid_revenue_kzt"], rows.map((x) => [x.name, Number(x.quantity), Number(x.revenue)]));
    } else {
      return jsonError("BAD_REQUEST", 400);
    }

    await db.auditLog.create({ data: { actorId: user.id, action: "report.export", entity: "Report", entityId: type, meta: { from: range.from, to: range.to } } });
    const filename = `foodhub-${type}-${range.from.toISOString().slice(0, 10)}.csv`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleRouteError(err, "admin.reports");
  }
}
