/**
 * Repeatable development/production seed.
 *  - Upserts the restaurant, settings, categories, products and public coupons.
 *  - Existing products keep their variants/modifiers (so past orders and carts stay valid).
 *  - Staff accounts are created ONLY from SEED_* environment variables (no hard-coded credentials).
 *  - Never creates fake orders or analytics.
 */
import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Role } from "../src/generated/prisma/client";
import { categories, coupons, products } from "./seed-data";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL / DIRECT_URL in .env before seeding.");
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

const openingHours = Array.from({ length: 7 }, (_, day) => ({
  day,
  open: "10:00",
  close: day >= 4 ? "02:00" : "23:00", // Fri–Sun open late
  closed: false,
}));

async function seedStaff(role: Role, email?: string, password?: string) {
  if (!email || !password) {
    console.log(`  - ${role}: skipped (SEED_${role}_EMAIL / SEED_${role}_PASSWORD not set)`);
    return;
  }
  if (password.length < 12) throw new Error(`SEED_${role}_PASSWORD must be at least 12 characters`);
  const normalized = email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email: normalized } });
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { role } });
    console.log(`  - ${role}: ${normalized} exists, role ensured (password unchanged)`);
    return;
  }
  const id = randomUUID();
  await db.user.create({
    data: {
      id,
      email: normalized,
      name: role.charAt(0) + role.slice(1).toLowerCase(),
      emailVerified: true,
      role,
      accounts: {
        create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) },
      },
    },
  });
  console.log(`  - ${role}: created ${normalized}`);
}

/** Public showcase accounts, one per role. They share DEMO_PASSWORD, which is shown on the login page. */
export const DEMO_ACCOUNTS: { email: string; name: string; role: Role }[] = [
  { email: "admin@foodhub.example.com", name: "Demo Admin", role: "ADMIN" },
  { email: "manager@foodhub.example.com", name: "Demo Manager", role: "MANAGER" },
  { email: "kitchen@foodhub.example.com", name: "Demo Kitchen", role: "KITCHEN" },
  { email: "customer@foodhub.example.com", name: "Demo Customer", role: "CUSTOMER" },
];

async function seedDemoAccounts(password?: string) {
  if (!password) {
    console.log("  - demo accounts: skipped (DEMO_PASSWORD not set)");
    return;
  }
  if (password.length < 12) throw new Error("DEMO_PASSWORD must be at least 12 characters");
  const hash = await hashPassword(password);
  for (const d of DEMO_ACCOUNTS) {
    const existing = await db.user.findUnique({ where: { email: d.email } });
    if (existing) {
      // Keep demo accounts usable: role, flag and the shared password are reset on every seed run.
      await db.user.update({ where: { id: existing.id }, data: { role: d.role, isDemo: true, name: d.name } });
      await db.account.updateMany({ where: { userId: existing.id, providerId: "credential" }, data: { password: hash } });
      await db.session.deleteMany({ where: { userId: existing.id } });
      console.log(`  - demo ${d.role}: ${d.email} reset`);
      continue;
    }
    const id = randomUUID();
    await db.user.create({
      data: {
        id,
        email: d.email,
        name: d.name,
        emailVerified: true,
        role: d.role,
        isDemo: true,
        accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: hash } },
      },
    });
    console.log(`  - demo ${d.role}: created ${d.email}`);
  }
}

async function main() {
  console.log("Seeding FoodHub…");
  const restaurant = await db.restaurant.upsert({
    where: { slug: "foodhub" },
    create: { slug: "foodhub", name: "FoodHub" },
    update: {},
  });

  await db.restaurantSettings.upsert({
    where: { restaurantId: restaurant.id },
    create: {
      restaurantId: restaurant.id,
      phone: "+77000000000",
      email: "hello@foodhub.example",
      addressKk: "Алматы қ., демо мекенжай (нақты мекенжай емес)",
      addressRu: "г. Алматы, демо-адрес (не реальный адрес)",
      addressEn: "Almaty, demo address (not a real location)",
      instagram: "foodhub.demo",
      deliveryFee: 990,
      freeDeliveryThreshold: 15000,
      minOrderValue: 3000,
      estimatedDeliveryMin: 45,
      estimatedPickupMin: 20,
      acceptingOrders: true,
      timezone: "Asia/Almaty",
      openingHours,
    },
    update: {},
  });

  const categoryIds = new Map<string, string>();
  for (const [i, c] of categories.entries()) {
    const row = await db.category.upsert({
      where: { restaurantId_slug: { restaurantId: restaurant.id, slug: c.slug } },
      create: { restaurantId: restaurant.id, slug: c.slug, nameKk: c.name[0], nameRu: c.name[1], nameEn: c.name[2], image: c.image, sortOrder: i },
      update: { nameKk: c.name[0], nameRu: c.name[1], nameEn: c.name[2], image: c.image, sortOrder: i },
    });
    categoryIds.set(c.slug, row.id);
  }
  console.log(`  ✓ ${categories.length} categories`);

  let created = 0;
  for (const [i, p] of products.entries()) {
    const categoryId = categoryIds.get(p.category)!;
    const core = {
      categoryId,
      nameKk: p.name[0],
      nameRu: p.name[1],
      nameEn: p.name[2],
      descriptionKk: p.description[0],
      descriptionRu: p.description[1],
      descriptionEn: p.description[2],
      ingredientsKk: p.ingredients?.[0] ?? null,
      ingredientsRu: p.ingredients?.[1] ?? null,
      ingredientsEn: p.ingredients?.[2] ?? null,
      allergens: p.allergens ?? [],
      price: p.variants?.length ? Math.min(...p.variants.map((v) => v.price)) : p.price,
      compareAtPrice: p.compareAtPrice ?? null,
      weightGrams: p.weightGrams ?? null,
      calories: p.calories ?? null,
      isFeatured: p.featured ?? false,
      tags: p.tags ?? [],
      sortOrder: i,
    };
    const existing = await db.product.findUnique({ where: { restaurantId_slug: { restaurantId: restaurant.id, slug: p.slug } } });
    if (existing) {
      await db.product.update({ where: { id: existing.id }, data: core });
      continue;
    }
    created++;
    await db.product.create({
      data: {
        ...core,
        restaurantId: restaurant.id,
        slug: p.slug,
        isAvailable: p.available ?? true,
        popularity: p.popularity ?? 0,
        images: { create: [{ url: `/images/products/${p.slug}.jpg`, alt: p.name[2], credit: "Unsplash", sortOrder: 0 }] },
        variants: {
          create: (p.variants ?? []).map((v, vi) => ({
            nameKk: v.name[0],
            nameRu: v.name[1],
            nameEn: v.name[2],
            price: v.price,
            isDefault: v.isDefault ?? vi === 0,
            sortOrder: vi,
          })),
        },
        modifierGroups: {
          create: (p.groups ?? []).map((g, gi) => ({
            nameKk: g.name[0],
            nameRu: g.name[1],
            nameEn: g.name[2],
            minSelect: g.min,
            maxSelect: g.max,
            sortOrder: gi,
            options: {
              create: g.options.map((o, oi) => ({ nameKk: o.name[0], nameRu: o.name[1], nameEn: o.name[2], price: o.price, sortOrder: oi })),
            },
          })),
        },
      },
    });
  }
  console.log(`  ✓ ${products.length} products (${created} new)`);

  for (const c of coupons) {
    await db.coupon.upsert({
      where: { restaurantId_code: { restaurantId: restaurant.id, code: c.code } },
      create: { ...c, restaurantId: restaurant.id, isActive: true, isPublic: true },
      update: {},
    });
  }
  console.log(`  ✓ ${coupons.length} coupons`);

  console.log("  Staff accounts:");
  await seedStaff("ADMIN", process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  await seedStaff("MANAGER", process.env.SEED_MANAGER_EMAIL, process.env.SEED_MANAGER_PASSWORD);
  await seedStaff("KITCHEN", process.env.SEED_KITCHEN_EMAIL, process.env.SEED_KITCHEN_PASSWORD);
  console.log("  Demo accounts:");
  await seedDemoAccounts(process.env.DEMO_PASSWORD);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
