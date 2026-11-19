import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchX } from "lucide-react";
import { getCategories, getMenuProducts, type MenuSort } from "@/server/catalog";
import { toCardView } from "@/lib/product-view";
import { ProductCard } from "@/components/store/product-card";
import { MenuFilters } from "@/components/store/menu-filters";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pick, type Locale } from "@/i18n/config";
import { alternatesFor } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/menu">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("menuTitle"), description: t("menuDescription"), alternates: alternatesFor("/menu", locale) };
}

const SORTS: MenuSort[] = ["popular", "price-asc", "price-desc", "name"];

export default async function MenuPage({ params, searchParams }: PageProps<"/[locale]/menu">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const category = str(sp.category)?.slice(0, 80);
  const q = str(sp.q)?.slice(0, 60);
  const sortRaw = str(sp.sort) as MenuSort | undefined;
  const sort: MenuSort = sortRaw && SORTS.includes(sortRaw) ? sortRaw : "popular";
  const availableOnly = str(sp.available) === "1";

  const t = await getTranslations();
  const [categories, products] = await Promise.all([
    getCategories(),
    getMenuProducts({ category, q, sort, availableOnly, locale }),
  ]);
  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <div className="container-page pt-32 lg:pt-40">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">FoodHub</p>
        <h1 className="mt-3 font-display text-5xl leading-[1.05] font-semibold text-balance sm:text-6xl">
          {activeCategory ? pick(activeCategory, "name", locale) : t("menu.title")}
        </h1>
        <p className="mt-4 text-lg text-muted">{t("menu.subtitle")}</p>
      </header>

      <MenuFilters
        categories={categories.map((c) => ({ slug: c.slug, name: pick(c, "name", locale), count: c._count.products }))}
        active={{ category: category ?? null, q: q ?? "", sort, availableOnly }}
      />

      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {t("menu.results", { count: products.length })}
      </p>

      {products.length ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={toCardView(p, locale)} priority={i < 4} />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-6"
          icon={<SearchX />}
          title={t("menu.noResults")}
          text={t("menu.noResultsText")}
          action={
            <Button asChild variant="outline">
              <Link href="/menu">{t("menu.resetFilters")}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
