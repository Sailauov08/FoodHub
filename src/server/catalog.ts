import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getRestaurant } from "@/server/restaurant";
import type { Locale } from "@/i18n/config";
import { isPreview } from "@/lib/preview";
import { previewCategories, previewCoupons, previewProducts } from "@/server/preview-data";

const live = () => previewProducts.filter((p) => !p.isArchived);
const asCard = <T>(rows: unknown) => rows as T;

export const productCardInclude = {
  images: { orderBy: { sortOrder: "asc" }, take: 1 },
  category: { select: { slug: true, nameKk: true, nameRu: true, nameEn: true } },
  variants: { where: { isArchived: false }, orderBy: { sortOrder: "asc" } },
  modifierGroups: { select: { id: true, minSelect: true } },
} satisfies Prisma.ProductInclude;

export type ProductCardData = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

export const productDetailInclude = {
  images: { orderBy: { sortOrder: "asc" } },
  category: true,
  variants: { where: { isArchived: false }, orderBy: { sortOrder: "asc" } },
  modifierGroups: {
    orderBy: { sortOrder: "asc" },
    include: { options: { where: { isArchived: false }, orderBy: { sortOrder: "asc" } } },
  },
} satisfies Prisma.ProductInclude;

export type ProductDetailData = Prisma.ProductGetPayload<{ include: typeof productDetailInclude }>;

export const getCategories = cache(async () => {
  if (isPreview) {
    return previewCategories.map((c) => ({ ...c, _count: { products: live().filter((p) => p.categoryId === c.id).length } }));
  }
  const r = await getRestaurant();
  return db.category.findMany({
    where: { restaurantId: r.id, isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: { where: { isArchived: false } } } } },
  });
});

export type MenuSort = "popular" | "price-asc" | "price-desc" | "name";

export async function getMenuProducts(opts: {
  category?: string;
  q?: string;
  sort?: MenuSort;
  availableOnly?: boolean;
  locale: Locale;
}) {
  const q = opts.q?.trim().slice(0, 60);
  if (isPreview) {
    const needle = q?.toLocaleLowerCase();
    const nameKey = opts.locale === "kk" ? "nameKk" : opts.locale === "ru" ? "nameRu" : "nameEn";
    const rows = live()
      .filter((p) => !opts.category || p.category.slug === opts.category)
      .filter((p) => !opts.availableOnly || p.isAvailable)
      .filter((p) => !needle || [p.nameKk, p.nameRu, p.nameEn, p.descriptionKk, p.descriptionRu, p.descriptionEn].some((v) => v.toLocaleLowerCase().includes(needle)))
      .sort((a, b) =>
        opts.sort === "price-asc"
          ? a.price - b.price
          : opts.sort === "price-desc"
            ? b.price - a.price
            : opts.sort === "name"
              ? a[nameKey].localeCompare(b[nameKey])
              : b.popularity - a.popularity || a.sortOrder - b.sortOrder,
      );
    return asCard<ProductCardData[]>(rows);
  }
  const r = await getRestaurant();
  const nameField = opts.locale === "kk" ? "nameKk" : opts.locale === "ru" ? "nameRu" : "nameEn";
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    opts.sort === "price-asc"
      ? [{ price: "asc" }]
      : opts.sort === "price-desc"
        ? [{ price: "desc" }]
        : opts.sort === "name"
          ? [{ [nameField]: "asc" }]
          : [{ popularity: "desc" }, { sortOrder: "asc" }];

  return db.product.findMany({
    where: {
      restaurantId: r.id,
      isArchived: false,
      category: { isActive: true, ...(opts.category ? { slug: opts.category } : {}) },
      ...(opts.availableOnly ? { isAvailable: true } : {}),
      ...(q
        ? {
            OR: [
              { nameKk: { contains: q, mode: "insensitive" } },
              { nameRu: { contains: q, mode: "insensitive" } },
              { nameEn: { contains: q, mode: "insensitive" } },
              { descriptionKk: { contains: q, mode: "insensitive" } },
              { descriptionRu: { contains: q, mode: "insensitive" } },
              { descriptionEn: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy,
    include: productCardInclude,
    take: 100,
  });
}

export const getFeaturedProducts = cache(async () => {
  if (isPreview) return asCard<ProductCardData[]>(live().filter((p) => p.isFeatured).sort((a, b) => b.popularity - a.popularity).slice(0, 8));
  const r = await getRestaurant();
  return db.product.findMany({
    where: { restaurantId: r.id, isArchived: false, isFeatured: true, category: { isActive: true } },
    orderBy: [{ popularity: "desc" }],
    include: productCardInclude,
    take: 8,
  });
});

export const getProductBySlug = cache(async (slug: string) => {
  if (isPreview) return asCard<ProductDetailData | null>(live().find((p) => p.slug === slug) ?? null);
  const r = await getRestaurant();
  return db.product.findFirst({
    where: { restaurantId: r.id, slug, isArchived: false },
    include: productDetailInclude,
  });
});

export async function getRelatedProducts(productId: string, categoryId: string) {
  if (isPreview) {
    return asCard<ProductCardData[]>(live().filter((p) => p.categoryId === categoryId && p.id !== productId).sort((a, b) => b.popularity - a.popularity).slice(0, 4));
  }
  return db.product.findMany({
    where: { categoryId, isArchived: false, id: { not: productId }, category: { isActive: true } },
    orderBy: { popularity: "desc" },
    include: productCardInclude,
    take: 4,
  });
}

export async function getPublicCoupons() {
  if (isPreview) return previewCoupons;
  const r = await getRestaurant();
  const now = new Date();
  return db.coupon.findMany({
    where: {
      restaurantId: r.id,
      isActive: true,
      isPublic: true,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Lowest price a product can be ordered for (cheapest available variant, or base price). */
export function startingPrice(p: { price: number; variants: { price: number; isAvailable: boolean }[] }): number {
  const live = p.variants.filter((v) => v.isAvailable);
  return live.length ? Math.min(...live.map((v) => v.price)) : p.price;
}

/** Products by slug (home page hero) — works in preview mode too. */
export async function getProductsBySlugs(slugs: string[]) {
  if (isPreview) return live().filter((p) => slugs.includes(p.slug));
  const r = await getRestaurant();
  return db.product.findMany({ where: { restaurantId: r.id, slug: { in: slugs }, isArchived: false } });
}

export async function countProducts() {
  if (isPreview) return live().length;
  const r = await getRestaurant();
  return db.product.count({ where: { restaurantId: r.id, isArchived: false } });
}
