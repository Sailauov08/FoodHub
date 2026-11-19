import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { checkoutInput, createUser, hasTestDb, resetDb, seedFixture } from "./helpers";

type DbMod = typeof import("@/lib/db");
type OrdersMod = typeof import("@/server/orders");

describe.skipIf(!hasTestDb)("orders (PostgreSQL integration)", () => {
  let db: DbMod["db"];
  let checkoutSchema: typeof import("@/lib/validation").checkoutSchema;
  let createOrder: OrdersMod["createOrder"];
  let CheckoutError: OrdersMod["CheckoutError"];
  let getOrderForViewer: OrdersMod["getOrderForViewer"];
  let quoteCart: OrdersMod["quoteCart"];
  let transitionOrder: OrdersMod["transitionOrder"];
  let TransitionError: OrdersMod["TransitionError"];
  let getAnalytics: typeof import("@/server/analytics").getAnalytics;
  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    ({ checkoutSchema } = await import("@/lib/validation"));
    ({ createOrder, CheckoutError, getOrderForViewer, quoteCart, transitionOrder, TransitionError } = await import("@/server/orders"));
    ({ getAnalytics } = await import("@/server/analytics"));
  });

  let fx: Awaited<ReturnType<typeof seedFixture>>;
  beforeEach(async () => {
    await resetDb();
    fx = await seedFixture();
  });

  const parse = (o: Record<string, unknown>) => checkoutSchema.parse(checkoutInput(o));

  it("creates an order atomically with server-calculated prices and snapshots", async () => {
    const input = parse({
      lines: [
        { productId: fx.burger.id, modifierOptionIds: [fx.sauce.id, fx.bacon.id], quantity: 2 },
        { productId: fx.pizza.id, variantId: fx.pizza.variants[1]!.id, modifierOptionIds: [], quantity: 1 },
      ],
    });
    const res = await createOrder(input, null);
    const order = await db.order.findUniqueOrThrow({
      where: { id: res.orderId },
      include: { items: { include: { modifiers: true } }, payment: true, statusHistory: true },
    });
    // (2500 + 450) * 2 + 4500 = 10400; delivery 990 (below 15000).
    expect(order.subtotal).toBe(10400);
    expect(order.deliveryFee).toBe(990);
    expect(order.total).toBe(11390);
    expect(order.status).toBe("PENDING");
    expect(order.items).toHaveLength(2);
    expect(order.items.find((i) => i.productId === fx.burger.id)?.modifiers).toHaveLength(2);
    expect(order.payment).toMatchObject({ method: "CASH_ON_DELIVERY", status: "UNPAID", amount: 11390 });
    expect(order.statusHistory).toHaveLength(1);
    expect(order.number).toMatch(/^FH-\d{6}-[A-Z0-9]{5}$/);
    expect(order.trackingTokenHash).not.toBe(res.token);
  });

  it("is idempotent: retrying with the same key returns the same order", async () => {
    const input = parse({ lines: [{ productId: fx.burger.id, modifierOptionIds: [fx.sauce.id], quantity: 2 }] });
    const [a, b] = await Promise.all([createOrder(input, null), createOrder(input, null)]);
    const c = await createOrder(input, null);
    expect(new Set([a.orderId, b.orderId, c.orderId]).size).toBe(1);
    expect(a.token).toBe(c.token);
    expect(await db.order.count()).toBe(1);
  });

  it("refuses to replay an idempotency key for a different customer", async () => {
    const input = parse({ lines: [{ productId: fx.burger.id, modifierOptionIds: [fx.sauce.id], quantity: 2 }] });
    await createOrder(input, null);
    await expect(createOrder({ ...input, customerPhone: "+77019998877" }, null)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("rejects unavailable products, missing required modifiers and small orders", async () => {
    await expect(createOrder(parse({ lines: [{ productId: fx.unavailable.id, modifierOptionIds: [], quantity: 5 }] }), null)).rejects.toBeInstanceOf(CheckoutError);
    await expect(createOrder(parse({ lines: [{ productId: fx.burger.id, modifierOptionIds: [], quantity: 2 }] }), null)).rejects.toMatchObject({ code: "INVALID_LINES" });
    await expect(createOrder(parse({ lines: [{ productId: fx.burger.id, modifierOptionIds: [fx.sauce.id], quantity: 1 }] }), null)).rejects.toMatchObject({ code: "MIN_ORDER" });
    expect(await db.order.count()).toBe(0);
  });

  it("refuses orders while the restaurant is not accepting them", async () => {
    await db.restaurantSettings.update({ where: { restaurantId: fx.restaurant.id }, data: { acceptingOrders: false } });
    await expect(createOrder(parse({ lines: [{ productId: fx.burger.id, modifierOptionIds: [fx.sauce.id], quantity: 2 }] }), null)).rejects.toMatchObject({ code: "RESTAURANT_CLOSED" });
  });

  it("enforces coupon usage limits atomically and releases them on cancellation", async () => {
    const lines = [{ productId: fx.burger.id, modifierOptionIds: [fx.sauce.id], quantity: 2 }];
    const first = await createOrder(parse({ lines, couponCode: "once" }), null);
    const order = await db.order.findUniqueOrThrow({ where: { id: first.orderId } });
    expect(order.discount).toBe(1000);
    expect(order.total).toBe(5000 - 1000 + 990);
    await expect(createOrder(parse({ lines, couponCode: "ONCE", customerPhone: "+77015554433" }), null)).rejects.toMatchObject({ code: "COUPON_INVALID" });

    await transitionOrder({ orderId: first.orderId, to: "CANCELLED", actor: { id: null, role: "GUEST" } });
    expect((await db.coupon.findUniqueOrThrow({ where: { id: fx.once.id } })).usedCount).toBe(0);
    await expect(createOrder(parse({ lines, couponCode: "ONCE", customerPhone: "+77015554433" }), null)).resolves.toBeTruthy();
  });

  it("enforces per-customer coupon limits by account and phone", async () => {
    const user = await createUser();
    const lines = [{ productId: fx.burger.id, modifierOptionIds: [fx.sauce.id], quantity: 2 }];
    await createOrder(parse({ lines, couponCode: "TEN" }), user);
    const { quote } = await quoteCart({ lines, couponCode: "TEN", fulfillment: "DELIVERY", userId: user.id, phone: null });
    expect(quote.couponError).toBe("COUPON_USER_LIMIT");
    const guest = await quoteCart({ lines, couponCode: "TEN", fulfillment: "DELIVERY", userId: null, phone: "+77011112233" });
    expect(guest.quote.couponError).toBe("COUPON_USER_LIMIT");
  });

  it("protects order tracking: owner, staff and token holders only", async () => {
    const owner = await createUser();
    const other = await createUser();
    const staff = await createUser("KITCHEN");
    const res = await createOrder(parse({ lines: [{ productId: fx.burger.id, modifierOptionIds: [fx.sauce.id], quantity: 2 }] }), owner);
    expect(await getOrderForViewer(res.orderId, owner, null)).not.toBeNull();
    expect(await getOrderForViewer(res.orderId, staff, null)).toMatchObject({ access: "staff" });
    expect(await getOrderForViewer(res.orderId, null, res.token)).toMatchObject({ access: "token" });
    expect(await getOrderForViewer(res.orderId, other, null)).toBeNull();
    expect(await getOrderForViewer(res.orderId, null, null)).toBeNull();
    expect(await getOrderForViewer(res.orderId, null, `${res.token.slice(0, -1)}x`)).toBeNull();
  });

  it("runs the status machine with RBAC, history and payment updates", async () => {
    const kitchen = await createUser("KITCHEN");
    const manager = await createUser("MANAGER");
    const { orderId } = await createOrder(parse({ lines: [{ productId: fx.burger.id, modifierOptionIds: [fx.sauce.id], quantity: 2 }] }), null);

    await transitionOrder({ orderId, to: "CONFIRMED", actor: { id: kitchen.id, role: "KITCHEN" } });
    await expect(transitionOrder({ orderId, to: "CANCELLED", actor: { id: null, role: "GUEST" } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(transitionOrder({ orderId, to: "DELIVERED", actor: { id: manager.id, role: "MANAGER" } })).rejects.toBeInstanceOf(TransitionError);
    await transitionOrder({ orderId, to: "PREPARING", actor: { id: kitchen.id, role: "KITCHEN" } });
    await transitionOrder({ orderId, to: "READY", actor: { id: kitchen.id, role: "KITCHEN" } });
    await expect(transitionOrder({ orderId, to: "OUT_FOR_DELIVERY", actor: { id: kitchen.id, role: "KITCHEN" } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(transitionOrder({ orderId, to: "PICKED_UP", actor: { id: manager.id, role: "MANAGER" } })).rejects.toMatchObject({ code: "WRONG_FULFILLMENT" });
    await transitionOrder({ orderId, to: "OUT_FOR_DELIVERY", actor: { id: manager.id, role: "MANAGER" } });
    await transitionOrder({ orderId, to: "DELIVERED", actor: { id: manager.id, role: "MANAGER" } });

    const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { payment: true, statusHistory: { orderBy: { createdAt: "asc" } } } });
    expect(order.status).toBe("DELIVERED");
    expect(order.confirmedAt && order.preparingAt && order.readyAt && order.completedAt).toBeTruthy();
    expect(order.payment?.status).toBe("PAID");
    expect(order.statusHistory.map((h) => h.to)).toEqual(["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"]);
    expect(order.statusHistory[1]).toMatchObject({ actorId: kitchen.id, actorRole: "KITCHEN" });
  });

  it("counts only paid orders as revenue", async () => {
    const manager = await createUser("MANAGER");
    const lines = [{ productId: fx.burger.id, modifierOptionIds: [fx.sauce.id], quantity: 2 }];
    const paid = await createOrder(parse({ lines, fulfillment: "PICKUP", paymentMethod: "PAY_ON_PICKUP", addressStreet: "" }), null);
    await createOrder(parse({ lines }), null); // pending, unpaid
    const cancelled = await createOrder(parse({ lines }), null);
    for (const to of ["CONFIRMED", "PREPARING", "READY", "PICKED_UP"] as const) {
      await transitionOrder({ orderId: paid.orderId, to, actor: { id: manager.id, role: "MANAGER" } });
    }
    await transitionOrder({ orderId: cancelled.orderId, to: "CANCELLED", actor: { id: manager.id, role: "MANAGER" } });

    const data = await getAnalytics({ from: new Date(Date.now() - 86400000), to: new Date(Date.now() + 86400000), granularity: "day" });
    expect(data.kpis.revenue).toBe(5000);
    expect(data.kpis.paidOrders).toBe(1);
    expect(data.kpis.averageOrderValue).toBe(5000);
    expect(data.kpis.ordersPlaced).toBe(3);
    expect(data.kpis.cancelled).toBe(1);
    expect(data.topItems[0]).toMatchObject({ productId: fx.burger.id, quantity: 2, revenue: 5000 });
    expect(data.revenueSeries.reduce((a, s) => a + s.revenue, 0)).toBe(5000);
  });
});
