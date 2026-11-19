/**
 * Read-only snapshot of recent orders (no personal data printed).
 * Usage: npx tsx scripts/db-inspect.ts
 */
import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
const orders = await db.order.findMany({
  orderBy: { createdAt: "desc" },
  take: 10,
  select: {
    number: true,
    status: true,
    fulfillment: true,
    subtotal: true,
    discount: true,
    deliveryFee: true,
    total: true,
    couponCode: true,
    payment: { select: { method: true, status: true } },
    statusHistory: { select: { to: true, actorRole: true }, orderBy: { createdAt: "asc" } },
    _count: { select: { items: true } },
  },
});
for (const o of orders) {
  console.log(
    `${o.number} ${o.status} ${o.fulfillment} items=${o._count.items} subtotal=${o.subtotal} discount=${o.discount} delivery=${o.deliveryFee} total=${o.total} coupon=${o.couponCode ?? "-"} payment=${o.payment?.method}/${o.payment?.status} history=${o.statusHistory.map((h) => `${h.to}(${h.actorRole})`).join(">")}`,
  );
}
const counts = await Promise.all([db.user.count(), db.product.count(), db.order.count(), db.coupon.findMany({ select: { code: true, usedCount: true } })]);
console.log(`users=${counts[0]} products=${counts[1]} orders=${counts[2]} coupons=${JSON.stringify(counts[3])}`);
}

main().finally(() => db.$disconnect());
