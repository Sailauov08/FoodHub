import { pick, type Locale } from "@/i18n/config";
import { formatKzt } from "@/lib/domain/money";
import type { ProductCardData } from "@/server/catalog";

/** Serializable product card model passed from server components to client cards. */
export type ProductCardView = {
  id: string;
  slug: string;
  name: string;
  names: { kk: string; ru: string; en: string };
  description: string;
  image: string | null;
  priceLabel: string;
  startingPrice: number;
  compareAtLabel: string | null;
  isAvailable: boolean;
  tags: string[];
  category: string;
  weightGrams: number | null;
  needsCustomization: boolean;
  hasVariants: boolean;
  defaultVariant: { id: string; names: { kk: string; ru: string; en: string }; price: number } | null;
  maxPerOrder: number;
};

export function toCardView(p: ProductCardData, locale: Locale): ProductCardView {
  const liveVariants = p.variants.filter((v) => v.isAvailable);
  const def = liveVariants.find((v) => v.isDefault) ?? liveVariants[0] ?? null;
  const starting = liveVariants.length ? Math.min(...liveVariants.map((v) => v.price)) : p.price;
  const requiredGroups = p.modifierGroups.some((g) => g.minSelect > 0);
  return {
    id: p.id,
    slug: p.slug,
    name: pick(p, "name", locale),
    names: { kk: p.nameKk, ru: p.nameRu, en: p.nameEn },
    description: pick(p, "description", locale),
    image: p.images[0]?.url ?? null,
    priceLabel: formatKzt(starting, locale),
    startingPrice: starting,
    compareAtLabel: p.compareAtPrice && p.compareAtPrice > starting ? formatKzt(p.compareAtPrice, locale) : null,
    isAvailable: p.isAvailable && (p.variants.length === 0 || liveVariants.length > 0),
    tags: p.tags,
    category: pick(p.category, "name", locale),
    weightGrams: p.weightGrams,
    needsCustomization: requiredGroups || p.variants.length > 1,
    hasVariants: p.variants.length > 0,
    defaultVariant: def ? { id: def.id, names: { kk: def.nameKk, ru: def.nameRu, en: def.nameEn }, price: def.price } : null,
    maxPerOrder: p.maxPerOrder,
  };
}
