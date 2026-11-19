import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import {
  categories as seedCategories,
  coupons as seedCoupons,
  products as seedProducts,
  type L,
  type SeedCoupon,
  type SeedProduct,
} from "../../prisma/seed-data";

/**
 * Daily clean-up for the public showcase deployment.
 *
 * Visitors sign in to the shared demo accounts and are free to place orders, move them through the kitchen
 * and edit the menu. Once a day this puts the showcase back into a predictable state:
 *  - orders older than the retention window are deleted (recent ones stay so the dashboards are not empty);
 *  - the seed menu, categories and promo codes are restored; items visitors added are archived/hidden;
 *  - the shared demo accounts get their name/role back, the demo customer's addresses, favourites and cart are
 *    cleared and every demo session is signed out;
 *  - expired sessions, verification tokens and rate-limit rows are removed.
 *
 * It never deletes a real (non-demo) user. Every step is idempotent, so a failed run can simply be repeated.
 * Writes only happen where the stored state differs from the seed, which keeps a typical run to a few queries.
 */

export type DemoCatalog = {
  categories: { slug: string; name: L }[];
  products: SeedProduct[];
  coupons: SeedCoupon[];
};

export type DemoResetOptions = {
  now?: Date;
  /** Orders newer than this many days are kept. */
  retentionDays?: number;
  /** Defaults to the seed catalogue (prisma/seed-data.ts); tests pass a small one. */
  catalog?: DemoCatalog;
  restaurantSlug?: string;
};

export type DemoResetSummary = {
  ordersDeleted: number;
  productsRestored: number;
  productsArchived: number;
  categoriesRestored: number;
  categoriesHidden: number;
  couponsRestored: number;
  couponsDisabled: number;
  demoUsersReset: number;
  demoSessionsDeleted: number;
  expiredRowsDeleted: number;
  durationMs: number;
};

const DAY_MS = 86_400_000;
const DEFAULT_CATALOG: DemoCatalog = { categories: seedCategories, products: seedProducts, coupons: seedCoupons };

const productImageUrl = (slug: string) => `/images/products/${slug}.jpg`;

export async function resetDemoData(db: PrismaClient, options: DemoResetOptions = {}): Promise<DemoResetSummary> {
  const started = Date.now();
  const now = options.now ?? new Date();
  const retentionDays = options.retentionDays ?? 7;
  const catalog = options.catalog ?? DEFAULT_CATALOG;

  const restaurant = await db.restaurant.findUnique({ where: { slug: options.restaurantSlug ?? "foodhub" } });
  if (!restaurant) throw new Error("Restaurant not found: run the seed first.");
  const restaurantId = restaurant.id;

  // 1. Orders outside the retention window (items, history, payment and redemptions cascade).
  const cutoff = new Date(now.getTime() - retentionDays * DAY_MS);
  const { count: ordersDeleted } = await db.order.deleteMany({ where: { restaurantId, createdAt: { lt: cutoff } } });

  // 2. Categories.
  const categoryRows = await db.category.findMany({ where: { restaurantId } });
  const categoryBySlug = new Map(categoryRows.map((c) => [c.slug, c]));
  let categoriesRestored = 0;
  for (const [i, c] of catalog.categories.entries()) {
    const row = categoryBySlug.get(c.slug);
    if (!row) continue; // the seed creates missing rows; the reset only restores what exists
    const wanted = { nameKk: c.name[0], nameRu: c.name[1], nameEn: c.name[2], sortOrder: i, isActive: true };
    if (differs(row, wanted)) {
      await db.category.update({ where: { id: row.id }, data: wanted });
      categoriesRestored++;
    }
  }
  const seedCategorySlugs = catalog.categories.map((c) => c.slug);
  const { count: categoriesHidden } = await db.category.updateMany({
    where: { restaurantId, slug: { notIn: seedCategorySlugs }, isActive: true },
    data: { isActive: false },
  });

  // 3. Products, with their image, variants and modifier groups.
  const productRows = await db.product.findMany({
    where: { restaurantId, slug: { in: catalog.products.map((p) => p.slug) } },
    include: { images: true, variants: true, modifierGroups: { include: { options: true } } },
  });
  const productBySlug = new Map(productRows.map((p) => [p.slug, p]));
  let productsRestored = 0;
  for (const [i, p] of catalog.products.entries()) {
    const row = productBySlug.get(p.slug);
    const categoryId = categoryBySlug.get(p.category)?.id;
    if (!row || !categoryId) continue;
    let changed = false;

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
      price: p.variants?.length ? Math.min(...p.variants.map((v) => v.price)) : p.price,
      compareAtPrice: p.compareAtPrice ?? null,
      weightGrams: p.weightGrams ?? null,
      calories: p.calories ?? null,
      isFeatured: p.featured ?? false,
      isAvailable: p.available ?? true,
      isArchived: false,
      sortOrder: i,
    };
    if (differs(row, core) || !sameList(row.allergens, p.allergens ?? []) || !sameList(row.tags, p.tags ?? [])) {
      await db.product.update({ where: { id: row.id }, data: { ...core, allergens: p.allergens ?? [], tags: p.tags ?? [] } });
      changed = true;
    }

    const url = productImageUrl(p.slug);
    if (row.images.length !== 1 || row.images[0]!.url !== url) {
      await db.productImage.deleteMany({ where: { productId: row.id } });
      await db.productImage.create({ data: { productId: row.id, url, alt: p.name[2], credit: "Unsplash", sortOrder: 0 } });
      changed = true;
    }

    // Variants are matched by English name; extra ones are archived (order history keeps referencing them).
    const keepVariantIds = new Set<string>();
    for (const [vi, v] of (p.variants ?? []).entries()) {
      const wanted = {
        nameKk: v.name[0],
        nameRu: v.name[1],
        nameEn: v.name[2],
        price: v.price,
        isDefault: v.isDefault ?? vi === 0,
        isAvailable: true,
        isArchived: false,
        sortOrder: vi,
      };
      const match = row.variants.find((x) => x.nameEn === v.name[2] && !keepVariantIds.has(x.id));
      if (match) {
        keepVariantIds.add(match.id);
        if (differs(match, wanted)) {
          await db.productVariant.update({ where: { id: match.id }, data: wanted });
          changed = true;
        }
      } else {
        keepVariantIds.add((await db.productVariant.create({ data: { ...wanted, productId: row.id } })).id);
        changed = true;
      }
    }
    if (row.variants.some((x) => !keepVariantIds.has(x.id) && (!x.isArchived || x.isDefault))) {
      await db.productVariant.updateMany({
        where: { productId: row.id, id: { notIn: [...keepVariantIds] } },
        data: { isArchived: true, isDefault: false },
      });
      changed = true;
    }

    // Modifier groups (removed groups are deleted, as the admin editor does) and their options.
    const keepGroupIds = new Set<string>();
    for (const [gi, g] of (p.groups ?? []).entries()) {
      const wantedGroup = { nameKk: g.name[0], nameRu: g.name[1], nameEn: g.name[2], minSelect: g.min, maxSelect: g.max, sortOrder: gi };
      const match = row.modifierGroups.find((x) => x.nameEn === g.name[2] && !keepGroupIds.has(x.id));
      let groupId: string;
      let existingOptions: (typeof row.modifierGroups)[number]["options"] = [];
      if (match) {
        groupId = match.id;
        existingOptions = match.options;
        if (differs(match, wantedGroup)) {
          await db.modifierGroup.update({ where: { id: match.id }, data: wantedGroup });
          changed = true;
        }
      } else {
        groupId = (await db.modifierGroup.create({ data: { ...wantedGroup, productId: row.id } })).id;
        changed = true;
      }
      keepGroupIds.add(groupId);

      const keepOptionIds = new Set<string>();
      for (const [oi, o] of g.options.entries()) {
        const wantedOption = { nameKk: o.name[0], nameRu: o.name[1], nameEn: o.name[2], price: o.price, isAvailable: true, isArchived: false, sortOrder: oi };
        const optionMatch = existingOptions.find((x) => x.nameEn === o.name[2] && !keepOptionIds.has(x.id));
        if (optionMatch) {
          keepOptionIds.add(optionMatch.id);
          if (differs(optionMatch, wantedOption)) {
            await db.modifierOption.update({ where: { id: optionMatch.id }, data: wantedOption });
            changed = true;
          }
        } else {
          keepOptionIds.add((await db.modifierOption.create({ data: { ...wantedOption, groupId } })).id);
          changed = true;
        }
      }
      if (existingOptions.some((x) => !keepOptionIds.has(x.id) && !x.isArchived)) {
        await db.modifierOption.updateMany({ where: { groupId, id: { notIn: [...keepOptionIds] } }, data: { isArchived: true } });
        changed = true;
      }
    }
    if (row.modifierGroups.some((x) => !keepGroupIds.has(x.id))) {
      await db.modifierGroup.deleteMany({ where: { productId: row.id, id: { notIn: [...keepGroupIds] } } });
      changed = true;
    }

    if (changed) productsRestored++;
  }
  const { count: productsArchived } = await db.product.updateMany({
    where: { restaurantId, slug: { notIn: catalog.products.map((p) => p.slug) }, isArchived: false },
    data: { isArchived: true, isFeatured: false },
  });

  // 4. Promo codes: seed codes get their terms back; codes visitors created are switched off.
  const couponRows = await db.coupon.findMany({ where: { restaurantId } });
  let couponsRestored = 0;
  for (const c of catalog.coupons) {
    const row = couponRows.find((x) => x.code === c.code);
    if (!row) continue;
    const wanted = { ...c, startsAt: null, endsAt: null, usageLimit: null, isActive: true, isPublic: true };
    if (differs(row, wanted)) {
      await db.coupon.update({ where: { id: row.id }, data: wanted });
      couponsRestored++;
    }
  }
  const { count: couponsDisabled } = await db.coupon.updateMany({
    where: { restaurantId, code: { notIn: catalog.coupons.map((c) => c.code) }, isActive: true },
    data: { isActive: false, isPublic: false },
  });
  // Usage counters follow the orders that still exist (cancelled orders already released their use).
  for (const row of couponRows) {
    const used = await db.couponRedemption.count({ where: { couponId: row.id, order: { status: { not: "CANCELLED" } } } });
    if (used !== row.usedCount) await db.coupon.update({ where: { id: row.id }, data: { usedCount: used } });
  }

  // 5. Shared demo accounts.
  const demoUsers = await db.user.findMany({ where: { email: { in: DEMO_ACCOUNTS.map((a) => a.email) } } });
  let demoUsersReset = 0;
  for (const u of demoUsers) {
    const account = DEMO_ACCOUNTS.find((a) => a.email === u.email)!;
    const wanted = { name: demoName(account.role), role: account.role, isDemo: true, phone: null, locale: "kk", image: null };
    if (differs(u, wanted)) {
      await db.user.update({ where: { id: u.id }, data: wanted });
      demoUsersReset++;
    }
  }
  const demoIds = demoUsers.map((u) => u.id);
  await db.address.deleteMany({ where: { userId: { in: demoIds } } });
  await db.favorite.deleteMany({ where: { userId: { in: demoIds } } });
  await db.cart.deleteMany({ where: { userId: { in: demoIds } } });
  const { count: demoSessionsDeleted } = await db.session.deleteMany({ where: { userId: { in: demoIds } } });

  // 6. Expired technical rows.
  const expired = await Promise.all([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.verification.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.requestLimit.deleteMany({ where: { windowEnd: { lt: now } } }),
    db.rateLimit.deleteMany({ where: { lastRequest: { lt: BigInt(now.getTime() - DAY_MS) } } }),
    db.auditLog.deleteMany({ where: { createdAt: { lt: cutoff }, actorId: { in: demoIds } } }),
  ]);

  return {
    ordersDeleted,
    productsRestored,
    productsArchived,
    categoriesRestored,
    categoriesHidden,
    couponsRestored,
    couponsDisabled,
    demoUsersReset,
    demoSessionsDeleted,
    expiredRowsDeleted: expired.reduce((n, r) => n + r.count, 0),
    durationMs: Date.now() - started,
  };
}

function demoName(role: string) {
  return `Demo ${role.charAt(0)}${role.slice(1).toLowerCase()}`;
}

function differs(row: Record<string, unknown>, wanted: Record<string, unknown>) {
  return Object.entries(wanted).some(([k, v]) => row[k] !== v);
}

function sameList(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
