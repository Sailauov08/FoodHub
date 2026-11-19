import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Flame, Scale } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getProductBySlug, getRelatedProducts } from "@/server/catalog";
import { toCardView } from "@/lib/product-view";
import { ProductCard } from "@/components/store/product-card";
import { ProductConfigurator, type ConfiguratorProduct } from "@/components/store/product-configurator";
import { FavoriteButton } from "@/components/store/favorite-button";
import { Badge } from "@/components/ui/misc";
import { pick, type Locale } from "@/i18n/config";
import { alternatesFor, siteUrl } from "@/lib/site";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/[locale]/menu/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return {};
  const name = pick(p, "name", locale as Locale);
  const description = pick(p, "description", locale as Locale);
  return {
    title: name,
    description,
    alternates: alternatesFor(`/menu/${slug}`, locale),
    openGraph: { title: name, description, images: p.images[0] ? [{ url: p.images[0].url }] : undefined },
  };
}

export default async function ProductPage({ params }: PageProps<"/[locale]/menu/[slug]">) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const product = await getProductBySlug(slug);
  if (!product || !product.category.isActive) notFound();
  const t = await getTranslations();
  const related = await getRelatedProducts(product.id, product.categoryId);

  const config: ConfiguratorProduct = {
    id: product.id,
    slug: product.slug,
    names: { kk: product.nameKk, ru: product.nameRu, en: product.nameEn },
    image: product.images[0]?.url ?? null,
    price: product.price,
    isAvailable: product.isAvailable,
    maxPerOrder: product.maxPerOrder,
    variants: product.variants.map((v) => ({
      id: v.id,
      names: { kk: v.nameKk, ru: v.nameRu, en: v.nameEn },
      price: v.price,
      isDefault: v.isDefault,
      isAvailable: v.isAvailable,
    })),
    groups: product.modifierGroups.map((g) => ({
      id: g.id,
      names: { kk: g.nameKk, ru: g.nameRu, en: g.nameEn },
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      options: g.options.map((o) => ({ id: o.id, names: { kk: o.nameKk, ru: o.nameRu, en: o.nameEn }, price: o.price, isAvailable: o.isAvailable })),
    })),
  };

  const name = pick(product, "name", locale);
  const ingredients = pick(product, "ingredients", locale);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    name,
    description: pick(product, "description", locale),
    image: product.images[0] ? `${siteUrl()}${product.images[0].url}` : undefined,
    offers: { "@type": "Offer", price: product.price, priceCurrency: "KZT", availability: product.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
    ...(product.calories ? { nutrition: { "@type": "NutritionInformation", calories: `${product.calories} kcal` } } : {}),
  };

  return (
    <div className="container-page pt-28 lg:pt-36">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href={`/menu?category=${product.category.slug}`} className="-ml-2 inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-sm text-muted transition-colors hover:text-cream">
        <ArrowLeft className="size-4" />
        {t("product.back")}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="relative aspect-square overflow-hidden rounded-[30px] border border-border bg-surface">
            {product.images[0] ? (
              <Image src={product.images[0].url} alt={product.images[0].alt || name} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className={product.isAvailable ? "object-cover" : "object-cover grayscale"} />
            ) : null}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Badge key={tag} variant={tag === "bestseller" ? "default" : "outline"} className={tag === "bestseller" ? "" : "bg-background/70 backdrop-blur"}>
                  {t.has(`tags.${tag}`) ? t(`tags.${tag}`) : tag}
                </Badge>
              ))}
            </div>
            <FavoriteButton productId={product.id} className="absolute top-4 right-4 size-11" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">{pick(product.category, "name", locale)}</p>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] font-semibold text-balance sm:text-5xl">{name}</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-muted">{pick(product, "description", locale)}</p>

          {product.weightGrams || product.calories ? (
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              {product.weightGrams ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-muted">
                  <Scale className="size-4 text-accent" /> {product.weightGrams} {t("common.grams")}
                </span>
              ) : null}
              {product.calories ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-muted">
                  <Flame className="size-4 text-accent" /> {product.calories} {t("common.kcal")}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8">
            <ProductConfigurator product={config} />
          </div>

          {ingredients || product.allergens.length ? (
            <div className="mt-10 space-y-5 rounded-[22px] border border-border bg-surface p-6">
              {ingredients ? (
                <div>
                  <h2 className="text-sm font-semibold text-cream">{t("product.ingredients")}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{ingredients}</p>
                </div>
              ) : null}
              {product.allergens.length ? (
                <div>
                  <h2 className="text-sm font-semibold text-cream">{t("product.allergens")}</h2>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {product.allergens.map((a) => (
                      <li key={a}>
                        <Badge variant="warning">{t.has(`allergens.${a}`) ? t(`allergens.${a}`) : a}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {related.length ? (
        <section className="mt-24" aria-label={t("product.related")}>
          <h2 className="font-display text-3xl font-semibold">{t("product.related")}</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={toCardView(p, locale)} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
