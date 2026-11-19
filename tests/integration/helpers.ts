import { randomUUID } from "node:crypto";

export const hasTestDb = !!process.env.TEST_DATABASE_URL;

// Imported lazily so suites can be skipped cleanly when no test database is configured.
const getDb = async () => (await import("@/lib/db")).db;

const TABLES = [
  "AuditLog",
  "CouponRedemption",
  "Payment",
  "OrderStatusHistory",
  "OrderItemModifier",
  "OrderItem",
  "Order",
  "CartItem",
  "Cart",
  "Favorite",
  "Address",
  "Coupon",
  "ModifierOption",
  "ModifierGroup",
  "ProductVariant",
  "ProductImage",
  "Product",
  "Category",
  "RestaurantSettings",
  "Restaurant",
  "RequestLimit",
  "rateLimit",
  "verification",
  "session",
  "account",
  "user",
];

export async function resetDb() {
  const db = await getDb();
  await db.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

/** Minimal restaurant: open 24/7, one burger with required sauce + optional extras, a pizza with sizes, an unavailable item and coupons. */
export async function seedFixture() {
  const db = await getDb();
  const restaurant = await db.restaurant.create({ data: { slug: "foodhub", name: "FoodHub" } });
  await db.restaurantSettings.create({
    data: {
      restaurantId: restaurant.id,
      phone: "+77000000000",
      email: "test@foodhub.example",
      addressKk: "a",
      addressRu: "a",
      addressEn: "a",
      deliveryFee: 990,
      freeDeliveryThreshold: 15000,
      minOrderValue: 3000,
      openingHours: Array.from({ length: 7 }, (_, day) => ({ day, open: "00:00", close: "00:00", closed: false })),
    },
  });
  const category = await db.category.create({ data: { restaurantId: restaurant.id, slug: "burgers", nameKk: "Б", nameRu: "Б", nameEn: "Burgers" } });
  const burger = await db.product.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: category.id,
      slug: "burger",
      nameKk: "Бургер",
      nameRu: "Бургер",
      nameEn: "Burger",
      descriptionKk: "d",
      descriptionRu: "d",
      descriptionEn: "d",
      price: 2500,
      maxPerOrder: 10,
      modifierGroups: {
        create: [
          { nameKk: "Тұздық", nameRu: "Соус", nameEn: "Sauce", minSelect: 1, maxSelect: 1, options: { create: [{ nameKk: "BBQ", nameRu: "BBQ", nameEn: "BBQ", price: 0 }] } },
          { nameKk: "Қосымша", nameRu: "Добавки", nameEn: "Extras", minSelect: 0, maxSelect: 2, options: { create: [{ nameKk: "Бекон", nameRu: "Бекон", nameEn: "Bacon", price: 450 }] } },
        ],
      },
    },
    include: { modifierGroups: { include: { options: true }, orderBy: { sortOrder: "asc" } } },
  });
  const pizza = await db.product.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: category.id,
      slug: "pizza",
      nameKk: "Пицца",
      nameRu: "Пицца",
      nameEn: "Pizza",
      descriptionKk: "d",
      descriptionRu: "d",
      descriptionEn: "d",
      price: 3000,
      variants: { create: [{ nameKk: "30", nameRu: "30", nameEn: "30", price: 3000, isDefault: true }, { nameKk: "40", nameRu: "40", nameEn: "40", price: 4500, sortOrder: 1 }] },
    },
    include: { variants: { orderBy: { sortOrder: "asc" } } },
  });
  const unavailable = await db.product.create({
    data: { restaurantId: restaurant.id, categoryId: category.id, slug: "gone", nameKk: "x", nameRu: "x", nameEn: "x", descriptionKk: "d", descriptionRu: "d", descriptionEn: "d", price: 1000, isAvailable: false },
  });
  const once = await db.coupon.create({
    data: { restaurantId: restaurant.id, code: "ONCE", descriptionKk: "d", descriptionRu: "d", descriptionEn: "d", type: "FIXED", value: 1000, minSubtotal: 0, usageLimit: 1 },
  });
  const percent = await db.coupon.create({
    data: { restaurantId: restaurant.id, code: "TEN", descriptionKk: "d", descriptionRu: "d", descriptionEn: "d", type: "PERCENT", value: 10, minSubtotal: 0, perUserLimit: 1 },
  });

  const sauce = burger.modifierGroups[0]!.options[0]!;
  const bacon = burger.modifierGroups[1]!.options[0]!;
  return { restaurant, category, burger, pizza, unavailable, sauce, bacon, once, percent };
}

export async function createUser(role: "CUSTOMER" | "KITCHEN" | "MANAGER" | "ADMIN" = "CUSTOMER", isDemo = false) {
  const db = await getDb();
  const id = randomUUID();
  const u = await db.user.create({ data: { id, name: `${role} user`, email: `${role.toLowerCase()}-${id.slice(0, 8)}@test.kz`, role, isDemo } });
  return { id: u.id, name: u.name, email: u.email, role, phone: null, isDemo };
}

export function checkoutInput(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: randomUUID(),
    customerName: "Test Customer",
    customerPhone: "+77011112233",
    customerEmail: "",
    fulfillment: "DELIVERY" as const,
    paymentMethod: "CASH_ON_DELIVERY" as const,
    addressStreet: "Abai ave 10",
    locale: "en" as const,
    couponCode: null,
    ...overrides,
  };
}
