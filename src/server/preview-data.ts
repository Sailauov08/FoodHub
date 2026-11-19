import "server-only";
import { categories as seedCategories, products as seedProducts } from "../../prisma/seed-data";

/** In-memory catalog shaped like Prisma results, built from prisma/seed-data.ts (preview mode only). */

const epoch = new Date("2026-01-01T00:00:00Z");
const RID = "r_foodhub";

const openingHours = Array.from({ length: 7 }, (_, day) => ({ day, open: "10:00", close: day >= 4 ? "02:00" : "23:00", closed: false }));

export const previewRestaurant = {
  id: RID,
  slug: "foodhub",
  name: "FoodHub",
  createdAt: epoch,
  updatedAt: epoch,
  settings: {
    id: "s_foodhub",
    restaurantId: RID,
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
    acceptingOrders: false,
    timezone: "Asia/Almaty",
    openingHours,
    updatedAt: epoch,
  },
  hours: openingHours,
};

export const previewCategories = seedCategories.map((c, i) => ({
  id: `c_${c.slug}`,
  restaurantId: RID,
  slug: c.slug,
  nameKk: c.name[0],
  nameRu: c.name[1],
  nameEn: c.name[2],
  image: c.image,
  sortOrder: i,
  isActive: true,
  createdAt: epoch,
  updatedAt: epoch,
}));

export const previewProducts = seedProducts.map((p, i) => {
  const id = `p_${p.slug}`;
  const category = previewCategories.find((c) => c.slug === p.category)!;
  const variants = (p.variants ?? []).map((v, vi) => ({
    id: `${id}_v${vi}`,
    productId: id,
    nameKk: v.name[0],
    nameRu: v.name[1],
    nameEn: v.name[2],
    price: v.price,
    isDefault: v.isDefault ?? vi === 0,
    isAvailable: true,
    isArchived: false,
    sortOrder: vi,
  }));
  const modifierGroups = (p.groups ?? []).map((g, gi) => {
    const gid = `${id}_g${gi}`;
    return {
      id: gid,
      productId: id,
      nameKk: g.name[0],
      nameRu: g.name[1],
      nameEn: g.name[2],
      minSelect: g.min,
      maxSelect: g.max,
      sortOrder: gi,
      options: g.options.map((o, oi) => ({
        id: `${gid}_o${oi}`,
        groupId: gid,
        nameKk: o.name[0],
        nameRu: o.name[1],
        nameEn: o.name[2],
        price: o.price,
        isAvailable: true,
        isArchived: false,
        sortOrder: oi,
      })),
    };
  });
  return {
    id,
    restaurantId: RID,
    categoryId: category.id,
    slug: p.slug,
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
    price: variants.length ? Math.min(...variants.map((v) => v.price)) : p.price,
    compareAtPrice: p.compareAtPrice ?? null,
    weightGrams: p.weightGrams ?? null,
    calories: p.calories ?? null,
    isAvailable: p.available ?? true,
    isFeatured: p.featured ?? false,
    isArchived: false,
    popularity: p.popularity ?? 0,
    maxPerOrder: 20,
    sortOrder: i,
    tags: p.tags ?? [],
    createdAt: epoch,
    updatedAt: epoch,
    images: [{ id: `${id}_img`, productId: id, url: `/images/products/${p.slug}.jpg`, alt: p.name[2], credit: "Unsplash", sortOrder: 0 }],
    category,
    variants,
    modifierGroups,
  };
});

export type PreviewProduct = (typeof previewProducts)[number];

export const previewCoupons = [
  {
    id: "cp_welcome10",
    restaurantId: RID,
    code: "WELCOME10",
    descriptionKk: "Алғашқы тапсырысқа 10% жеңілдік (2 000 ₸-ге дейін)",
    descriptionRu: "Скидка 10% на первый заказ (до 2 000 ₸)",
    descriptionEn: "10% off your first order (up to 2,000 ₸)",
    type: "PERCENT" as const,
    value: 10,
    minSubtotal: 4000,
    maxDiscount: 2000,
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    perUserLimit: 1,
    usedCount: 0,
    isActive: true,
    isPublic: true,
    createdAt: epoch,
    updatedAt: epoch,
  },
  {
    id: "cp_pickup500",
    restaurantId: RID,
    code: "PICKUP500",
    descriptionKk: "8 000 ₸-ден асатын тапсырысқа 500 ₸ жеңілдік",
    descriptionRu: "500 ₸ скидки на заказ от 8 000 ₸",
    descriptionEn: "500 ₸ off orders over 8,000 ₸",
    type: "FIXED" as const,
    value: 500,
    minSubtotal: 8000,
    maxDiscount: null,
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    perUserLimit: null,
    usedCount: 0,
    isActive: true,
    isPublic: true,
    createdAt: epoch,
    updatedAt: epoch,
  },
];
