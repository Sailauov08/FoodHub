import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { DemoCatalog } from "@/server/demo-reset";
import { checkoutInput, createUser, hasTestDb, resetDb, seedFixture } from "./helpers";

type DbMod = typeof import("@/lib/db");
type ResetMod = typeof import("@/server/demo-reset");

const DAY = 86_400_000;

// The real session module pulls in next-intl navigation, which needs the Next.js runtime. The cron route only
// needs AuthError (via the shared route error handler).
vi.mock("@/lib/session", () => ({ AuthError: class AuthError extends Error {} }));

/** A catalogue matching seedFixture(), standing in for prisma/seed-data.ts. */
const catalog: DemoCatalog = {
  categories: [{ slug: "burgers", name: ["Б", "Б", "Burgers"] }],
  products: [
    {
      slug: "burger",
      category: "burgers",
      name: ["Бургер", "Бургер", "Burger"],
      description: ["d", "d", "d"],
      price: 2500,
      groups: [
        { name: ["Тұздық", "Соус", "Sauce"], min: 1, max: 1, options: [{ name: ["BBQ", "BBQ", "BBQ"], price: 0 }] },
        { name: ["Қосымша", "Добавки", "Extras"], min: 0, max: 2, options: [{ name: ["Бекон", "Бекон", "Bacon"], price: 450 }] },
      ],
    },
    {
      slug: "pizza",
      category: "burgers",
      name: ["Пицца", "Пицца", "Pizza"],
      description: ["d", "d", "d"],
      price: 3000,
      variants: [
        { name: ["30", "30", "30"], price: 3000, isDefault: true },
        { name: ["40", "40", "40"], price: 4500 },
      ],
    },
    { slug: "gone", category: "burgers", name: ["x", "x", "x"], description: ["d", "d", "d"], price: 1000, available: false },
  ],
  coupons: [
    {
      code: "TEN",
      descriptionKk: "d",
      descriptionRu: "d",
      descriptionEn: "d",
      type: "PERCENT",
      value: 10,
      minSubtotal: 0,
      maxDiscount: null,
      perUserLimit: 1,
    },
  ],
};

describe.skipIf(!hasTestDb)("daily demo reset (PostgreSQL integration)", () => {
  let db: DbMod["db"];
  let resetDemoData: ResetMod["resetDemoData"];
  let createOrder: typeof import("@/server/orders").createOrder;
  let checkoutSchema: typeof import("@/lib/validation").checkoutSchema;
  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    ({ resetDemoData } = await import("@/server/demo-reset"));
    ({ createOrder } = await import("@/server/orders"));
    ({ checkoutSchema } = await import("@/lib/validation"));
  });

  let fx: Awaited<ReturnType<typeof seedFixture>>;
  beforeEach(async () => {
    await resetDb();
    fx = await seedFixture();
  });

  const lines = () => [{ productId: fx.burger.id, modifierOptionIds: [fx.sauce.id], quantity: 2 }];

  async function demoUser(email: string, role: "ADMIN" | "CUSTOMER", name: string) {
    const id = randomUUID();
    return db.user.create({ data: { id, email, name, role, isDemo: true, phone: "+77019998877", locale: "en" } });
  }

  async function session(userId: string, expiresAt = new Date(Date.now() + DAY)) {
    return db.session.create({ data: { id: randomUUID(), token: randomUUID(), userId, expiresAt } });
  }

  it("restores the showcase and keeps real users and recent orders", async () => {
    // Baseline: align the fixture with the catalogue so the assertions below only count the day's changes.
    await resetDemoData(db, { catalog });

    // --- What a day of visitors leaves behind ---
    const oldOrder = await createOrder(checkoutSchema.parse(checkoutInput({ lines: lines(), couponCode: "TEN" })), null);
    await db.order.update({ where: { id: oldOrder.orderId }, data: { createdAt: new Date(Date.now() - 10 * DAY) } });
    const recentOrder = await createOrder(checkoutSchema.parse(checkoutInput({ lines: lines(), customerPhone: "+77015554433" })), null);
    const demoAdmin = await demoUser("admin@foodhub.example.com", "ADMIN", "Hacked name");
    const demoCustomer = await demoUser("customer@foodhub.example.com", "CUSTOMER", "Demo Customer");
    const realCustomer = await createUser("CUSTOMER");
    const realSession = await session(realCustomer.id);
    await session(demoAdmin.id);
    await session(realCustomer.id, new Date(Date.now() - 1000)); // expired
    await db.address.create({ data: { userId: demoCustomer.id, label: "Home", street: "Visitor street 1" } });
    await db.favorite.create({ data: { userId: demoCustomer.id, productId: fx.pizza.id } });
    await db.cart.create({ data: { userId: demoCustomer.id } });
    await db.requestLimit.create({ data: { key: "checkout:1.2.3.4", count: 3, windowEnd: new Date(Date.now() - 1000) } });

    await db.product.update({ where: { id: fx.burger.id }, data: { nameEn: "Vandalised", price: 1, isFeatured: true } });
    await db.product.update({ where: { id: fx.pizza.id }, data: { isArchived: true } });
    await db.productVariant.update({ where: { id: fx.pizza.variants[1]!.id }, data: { price: 1 } });
    await db.productVariant.create({ data: { productId: fx.pizza.id, nameKk: "99", nameRu: "99", nameEn: "99", price: 1, sortOrder: 2 } });
    await db.modifierOption.create({ data: { groupId: fx.bacon.groupId, nameKk: "Gold", nameRu: "Gold", nameEn: "Gold", price: 1 } });
    await db.productImage.create({ data: { productId: fx.burger.id, url: "https://example.com/x.jpg", alt: "x" } });
    const visitorCategory = await db.category.create({ data: { restaurantId: fx.restaurant.id, slug: "visitor", nameKk: "v", nameRu: "v", nameEn: "v" } });
    await db.product.create({
      data: { restaurantId: fx.restaurant.id, categoryId: visitorCategory.id, slug: "visitor-dish", nameKk: "v", nameRu: "v", nameEn: "v", descriptionKk: "d", descriptionRu: "d", descriptionEn: "d", price: 5 },
    });
    await db.coupon.update({ where: { id: fx.percent.id }, data: { value: 90, isActive: false } });
    await db.coupon.create({ data: { restaurantId: fx.restaurant.id, code: "HACK", descriptionKk: "d", descriptionRu: "d", descriptionEn: "d", type: "FIXED", value: 1, isPublic: true } });

    await db.auditLog.create({ data: { actorId: demoAdmin.id, action: "x", entity: "Product", createdAt: new Date(Date.now() - 10 * DAY) } });

    // --- Reset ---
    const summary = await resetDemoData(db, { catalog, retentionDays: 7 });

    expect(summary).toMatchObject({ ordersDeleted: 1, productsArchived: 1, categoriesHidden: 1, couponsDisabled: 1, demoUsersReset: 2 });
    expect(summary.productsRestored).toBe(2); // burger (name, price, image, option) + pizza (archive, variants)

    // Orders: old one gone with its redemption, recent one kept.
    expect(await db.order.findUnique({ where: { id: oldOrder.orderId } })).toBeNull();
    expect(await db.order.findUnique({ where: { id: recentOrder.orderId } })).not.toBeNull();
    expect(await db.couponRedemption.count()).toBe(0);

    // Menu back to the seed.
    const burger = await db.product.findUniqueOrThrow({ where: { id: fx.burger.id }, include: { images: true, modifierGroups: { include: { options: true } } } });
    expect(burger).toMatchObject({ nameEn: "Burger", price: 2500, isFeatured: false, isArchived: false });
    expect(burger.images.map((i) => i.url)).toEqual(["/images/products/burger.jpg"]);
    const extras = burger.modifierGroups.find((g) => g.nameEn === "Extras")!;
    expect(extras.options.filter((o) => !o.isArchived).map((o) => o.nameEn)).toEqual(["Bacon"]);
    const pizza = await db.product.findUniqueOrThrow({ where: { id: fx.pizza.id }, include: { variants: { where: { isArchived: false }, orderBy: { sortOrder: "asc" } } } });
    expect(pizza.isArchived).toBe(false);
    expect(pizza.variants.map((v) => [v.nameEn, v.price])).toEqual([["30", 3000], ["40", 4500]]);
    expect((await db.product.findUniqueOrThrow({ where: { id: fx.unavailable.id } })).isAvailable).toBe(false);
    expect((await db.product.findFirstOrThrow({ where: { slug: "visitor-dish" } })).isArchived).toBe(true);
    expect((await db.category.findUniqueOrThrow({ where: { id: visitorCategory.id } })).isActive).toBe(false);

    // Promo codes.
    expect(await db.coupon.findUniqueOrThrow({ where: { id: fx.percent.id } })).toMatchObject({ value: 10, isActive: true, isPublic: true, usedCount: 0 });
    expect((await db.coupon.findFirstOrThrow({ where: { code: "HACK" } })).isActive).toBe(false);
    expect((await db.coupon.findUniqueOrThrow({ where: { id: fx.once.id } })).isActive).toBe(false);

    // Demo accounts reset and signed out; the real customer and their live session are untouched.
    expect(await db.user.findUniqueOrThrow({ where: { id: demoAdmin.id } })).toMatchObject({ name: "Demo Admin", phone: null, locale: "kk" });
    expect(await db.address.count({ where: { userId: demoCustomer.id } })).toBe(0);
    expect(await db.favorite.count({ where: { userId: demoCustomer.id } })).toBe(0);
    expect(await db.cart.count({ where: { userId: demoCustomer.id } })).toBe(0);
    expect(await db.session.count({ where: { userId: demoAdmin.id } })).toBe(0);
    expect(await db.user.findUnique({ where: { id: realCustomer.id } })).not.toBeNull();
    expect((await db.session.findMany({ where: { userId: realCustomer.id } })).map((s) => s.id)).toEqual([realSession.id]);
    expect(await db.requestLimit.count()).toBe(0);
    expect(await db.auditLog.count({ where: { actorId: demoAdmin.id } })).toBe(0);

    // Idempotent: a second run has nothing left to do.
    const again = await resetDemoData(db, { catalog, retentionDays: 7 });
    expect(again).toMatchObject({
      ordersDeleted: 0,
      productsRestored: 0,
      productsArchived: 0,
      categoriesRestored: 0,
      categoriesHidden: 0,
      couponsRestored: 0,
      couponsDisabled: 0,
      demoUsersReset: 0,
      demoSessionsDeleted: 0,
    });
  });

  describe("cron endpoint", () => {
    const env = { ...process.env };
    afterEach(() => {
      process.env = { ...env };
    });
    const call = async (auth?: string) => {
      const { GET } = await import("@/app/api/cron/demo-reset/route");
      return GET(new Request("http://localhost/api/cron/demo-reset", { headers: auth ? { authorization: auth } : {} }));
    };

    it("is hidden unless explicitly enabled and requires the cron secret", async () => {
      delete process.env.DEMO_RESET_ENABLED;
      process.env.CRON_SECRET = "a-very-long-test-cron-secret";
      expect((await call(`Bearer ${process.env.CRON_SECRET}`)).status).toBe(404);

      process.env.DEMO_RESET_ENABLED = "true";
      expect((await call()).status).toBe(401);
      expect((await call("Bearer wrong-secret-of-another-length")).status).toBe(401);
      const ok = await call(`Bearer ${process.env.CRON_SECRET}`);
      expect(ok.status).toBe(200);
      expect((await ok.json()).ok).toBe(true);
    });
  });
});
