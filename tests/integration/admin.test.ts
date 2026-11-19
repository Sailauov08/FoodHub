import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createUser, hasTestDb, resetDb, seedFixture } from "./helpers";

// The session module is replaced (the real one needs a Next.js request); the role rules mirror it exactly:
// no user → UNAUTHENTICATED, role not allowed → FORBIDDEN. Everything below that (actions, DB) is real.
type TestUser = { id: string; name: string; email: string; role: "CUSTOMER" | "KITCHEN" | "MANAGER" | "ADMIN"; phone: null; isDemo: boolean };
const current = vi.hoisted(() => ({ user: null as null | TestUser }));
vi.mock("@/lib/session", () => {
  class AuthError extends Error {
    constructor(public readonly code: "UNAUTHENTICATED" | "FORBIDDEN") {
      super(code);
    }
  }
  return {
    AuthError,
    STAFF_ROLES: ["KITCHEN", "MANAGER", "ADMIN"],
    MANAGEMENT_ROLES: ["MANAGER", "ADMIN"],
    getSessionUser: async () => current.user,
    assertUser: async () => {
      if (!current.user) throw new AuthError("UNAUTHENTICATED");
      return current.user;
    },
    assertRole: async (roles: string[]) => {
      if (!current.user) throw new AuthError("UNAUTHENTICATED");
      if (!roles.includes(current.user.role)) throw new AuthError("FORBIDDEN");
      return current.user;
    },
  };
});

describe.skipIf(!hasTestDb)("admin actions (PostgreSQL integration)", () => {
  let db: typeof import("@/lib/db").db;
  let admin: typeof import("@/actions/admin");
  let updateOrderStatus: typeof import("@/actions/orders").updateOrderStatus;
  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    admin = await import("@/actions/admin");
    ({ updateOrderStatus } = await import("@/actions/orders"));
  });

  let fx: Awaited<ReturnType<typeof seedFixture>>;
  beforeEach(async () => {
    await resetDb();
    fx = await seedFixture();
    current.user = null;
  });

  const productInput = () => ({
    slug: "new-burger",
    categoryId: fx.category.id,
    nameKk: "Жаңа",
    nameRu: "Новый",
    nameEn: "New",
    descriptionKk: "d",
    descriptionRu: "d",
    descriptionEn: "d",
    allergens: ["milk"],
    price: 2000,
    compareAtPrice: "",
    weightGrams: "",
    calories: "",
    isAvailable: true,
    isFeatured: false,
    maxPerOrder: 10,
    sortOrder: 1,
    imageUrl: "/images/products/classic-beef-burger.jpg",
    variants: [
      { nameKk: "S", nameRu: "S", nameEn: "S", price: 2000, isDefault: true, isAvailable: true },
      { nameKk: "L", nameRu: "L", nameEn: "L", price: 2800, isDefault: false, isAvailable: true },
    ],
    modifierGroups: [{ nameKk: "g", nameRu: "g", nameEn: "g", minSelect: 0, maxSelect: 1, options: [{ nameKk: "o", nameRu: "o", nameEn: "o", price: 100, isAvailable: true }] }],
  });

  it("denies product management to customers, kitchen staff and anonymous users", async () => {
    expect(await admin.saveProduct(null, productInput() as never)).toEqual({ ok: false, error: "UNAUTHENTICATED" });
    current.user = await createUser("CUSTOMER");
    expect(await admin.saveProduct(null, productInput() as never)).toEqual({ ok: false, error: "FORBIDDEN" });
    current.user = await createUser("KITCHEN");
    expect(await admin.setProductAvailability(fx.burger.id, false)).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(await db.product.count({ where: { slug: "new-burger" } })).toBe(0);
  });

  it("lets managers create, edit, toggle and archive products", async () => {
    current.user = await createUser("MANAGER");
    const created = await admin.saveProduct(null, productInput() as never);
    expect(created.ok).toBe(true);
    const id = created.ok ? created.data!.id : "";
    const p = await db.product.findUniqueOrThrow({ where: { id }, include: { variants: true, modifierGroups: { include: { options: true } }, images: true } });
    expect(p.price).toBe(2000); // lowest variant
    expect(p.variants).toHaveLength(2);
    expect(p.modifierGroups[0]?.options).toHaveLength(1);

    // Removing a variant archives it rather than deleting history.
    const edit = { ...productInput(), variants: [{ id: p.variants.find((v) => v.nameEn === "L")!.id, nameKk: "L", nameRu: "L", nameEn: "L", price: 3000, isDefault: true, isAvailable: true }] };
    expect((await admin.saveProduct(id, edit as never)).ok).toBe(true);
    const after = await db.productVariant.findMany({ where: { productId: id } });
    expect(after.filter((v) => !v.isArchived).map((v) => v.price)).toEqual([3000]);
    expect(after.filter((v) => v.isArchived)).toHaveLength(1);

    expect((await admin.setProductAvailability(id, false)).ok).toBe(true);
    expect((await db.product.findUniqueOrThrow({ where: { id } })).isAvailable).toBe(false);
    expect((await admin.archiveProduct(id)).ok).toBe(true);
    expect((await db.product.findUniqueOrThrow({ where: { id } })).isArchived).toBe(true);
    expect(await db.auditLog.count({ where: { entityId: id } })).toBeGreaterThanOrEqual(4);
  });

  it("validates product input on the server", async () => {
    current.user = await createUser("ADMIN");
    const res = await admin.saveProduct(null, { ...productInput(), slug: "Bad Slug!", imageUrl: "https://evil.example/x.png" } as never);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("VALIDATION");
      expect(res.fieldErrors).toMatchObject({ slug: "slug", imageUrl: "imageUrl" });
    }
  });

  it("lets demo admins explore but blocks irreversible and account-level actions", async () => {
    const victim = await createUser("CUSTOMER");
    current.user = await createUser("ADMIN", true);
    expect(await admin.setUserRole(victim.id, "ADMIN")).toEqual({ ok: false, error: "DEMO_RESTRICTED" });
    expect(await admin.archiveProduct(fx.burger.id)).toEqual({ ok: false, error: "DEMO_RESTRICTED" });
    expect(await admin.deleteCoupon(fx.once.id)).toEqual({ ok: false, error: "DEMO_RESTRICTED" });
    expect(await admin.deleteCategory(fx.category.id)).toEqual({ ok: false, error: "DEMO_RESTRICTED" });
    expect((await db.user.findUniqueOrThrow({ where: { id: victim.id } })).role).toBe("CUSTOMER");
    expect((await db.product.findUniqueOrThrow({ where: { id: fx.burger.id } })).isArchived).toBe(false);
    // Non-destructive management still works so the demo is meaningful.
    expect((await admin.saveProduct(null, productInput() as never)).ok).toBe(true);
    expect((await admin.setProductAvailability(fx.burger.id, false)).ok).toBe(true);
  });

  it("restricts settings and role changes to admins, and prevents self-demotion", async () => {
    const manager = await createUser("MANAGER");
    current.user = manager;
    expect(await admin.setUserRole(manager.id, "ADMIN")).toEqual({ ok: false, error: "FORBIDDEN" });
    const adminUser = await createUser("ADMIN");
    current.user = adminUser;
    expect(await admin.setUserRole(adminUser.id, "CUSTOMER")).toEqual({ ok: false, error: "SELF_ROLE_CHANGE" });
    expect((await admin.setUserRole(manager.id, "KITCHEN")).ok).toBe(true);
    expect((await db.user.findUniqueOrThrow({ where: { id: manager.id } })).role).toBe("KITCHEN");
  });

  it("refuses to delete a category that still has products", async () => {
    current.user = await createUser("ADMIN");
    expect(await admin.deleteCategory(fx.category.id)).toEqual({ ok: false, error: "CATEGORY_NOT_EMPTY" });
  });

  it("validates and saves coupons", async () => {
    current.user = await createUser("MANAGER");
    const bad = await admin.saveCoupon(null, { code: "X1", descriptionKk: "d", descriptionRu: "d", descriptionEn: "d", type: "PERCENT", value: 120, minSubtotal: 0, isActive: true, isPublic: true } as never);
    expect(bad.ok).toBe(false);
    const good = await admin.saveCoupon(null, { code: "autumn", descriptionKk: "d", descriptionRu: "d", descriptionEn: "d", type: "PERCENT", value: 15, minSubtotal: 5000, maxDiscount: "", usageLimit: "", perUserLimit: 1, startsAt: "", endsAt: "", isActive: true, isPublic: true } as never);
    expect(good.ok).toBe(true);
    expect(await db.coupon.findFirst({ where: { code: "AUTUMN" } })).toMatchObject({ value: 15, perUserLimit: 1, maxDiscount: null });
  });

  it("only staff can change order status through the action", async () => {
    const { createOrder } = await import("@/server/orders");
    const { checkoutSchema } = await import("@/lib/validation");
    const { checkoutInput } = await import("./helpers");
    const { orderId } = await createOrder(checkoutSchema.parse(checkoutInput({ lines: [{ productId: fx.burger.id, modifierOptionIds: [fx.sauce.id], quantity: 2 }] })), null);
    current.user = await createUser("CUSTOMER");
    expect(await updateOrderStatus({ orderId, to: "CONFIRMED" })).toEqual({ ok: false, error: "FORBIDDEN" });
    current.user = await createUser("KITCHEN");
    expect((await updateOrderStatus({ orderId, to: "CONFIRMED" })).ok).toBe(true);
    expect(await updateOrderStatus({ orderId, to: "DELIVERED" })).toEqual({ ok: false, error: "INVALID_TRANSITION" });
  });
});
