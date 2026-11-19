import "server-only";
import { db } from "@/lib/db";
import { getRestaurant } from "@/server/restaurant";
import { maskName } from "@/lib/demo";

export type KitchenOrder = Awaited<ReturnType<typeof getKitchenOrders>>[number];

export async function getKitchenOrders(opts: { maskNames?: boolean } = {}) {
  const r = await getRestaurant();
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24);
  const orders = await db.order.findMany({
    where: {
      restaurantId: r.id,
      status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      number: true,
      status: true,
      fulfillment: true,
      customerName: true,
      comment: true,
      createdAt: true,
      confirmedAt: true,
      preparingAt: true,
      readyAt: true,
      estimatedReadyAt: true,
      items: {
        select: {
          id: true,
          nameKk: true,
          nameRu: true,
          nameEn: true,
          variantName: true,
          quantity: true,
          modifiers: { select: { id: true, name: true, groupName: true } },
        },
      },
    },
  });
  return orders.map((o) => ({
    ...o,
    customerName: opts.maskNames ? maskName(o.customerName) : o.customerName,
    createdAt: o.createdAt.toISOString(),
    confirmedAt: o.confirmedAt?.toISOString() ?? null,
    preparingAt: o.preparingAt?.toISOString() ?? null,
    readyAt: o.readyAt?.toISOString() ?? null,
    estimatedReadyAt: o.estimatedReadyAt?.toISOString() ?? null,
  }));
}
