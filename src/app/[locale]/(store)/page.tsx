import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, ChefHat, MapPinned, Receipt, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Hero, type HeroSlide } from "@/components/store/hero";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/misc";
import { countProducts, getCategories, getFeaturedProducts, getProductsBySlugs, getPublicCoupons } from "@/server/catalog";
import { getRestaurant } from "@/server/restaurant";
import { toCardView } from "@/lib/product-view";
import { formatKzt } from "@/lib/domain/money";
import { pick, type Locale } from "@/i18n/config";
import { siteUrl } from "@/lib/site";
import { CopyCode } from "@/components/store/copy-code";

export const revalidate = 300;

const HERO = [
  { slug: "black-angus-burger", image: "/images/hero/black-angus.webp" },
  { slug: "smoky-steakhouse-burger", image: "/images/hero/smoky-steakhouse.webp" },
  { slug: "double-cheeseburger", image: "/images/hero/double-cheese.webp" },
];

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations();
  const r = await getRestaurant();
  const [categories, featured, coupons, heroProducts, productCount] = await Promise.all([
    getCategories(),
    getFeaturedProducts(),
    getPublicCoupons(),
    getProductsBySlugs(HERO.map((h) => h.slug)),
    countProducts(),
  ]);

  const slides: HeroSlide[] = HERO.flatMap((h) => {
    const p = heroProducts.find((x) => x.slug === h.slug);
    return p ? [{ image: h.image, slug: p.slug, name: pick(p, "name", locale), price: formatKzt(p.price, locale) }] : [];
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "FoodHub",
    url: siteUrl(),
    servesCuisine: ["Burgers", "Pizza", "Sushi"],
    priceRange: "₸₸",
    telephone: r.settings.phone,
    image: `${siteUrl()}/images/og-burger.jpg`,
    hasMenu: `${siteUrl()}/menu`,
    acceptsReservations: false,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {slides.length ? <Hero slides={slides} /> : <div className="h-28" />}

      {/* Categories */}
      <section className="container-page mt-20 lg:mt-24" aria-label={t("home.categoriesTitle")}>
        <SectionHeading eyebrow={t("home.categoriesEyebrow")} title={t("home.categoriesTitle")} />
        <ul className="no-scrollbar -mx-4 mt-8 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-7">
          {categories.map((c) => (
            <li key={c.id} className="w-36 shrink-0 snap-start sm:w-auto">
              <Link href={`/menu?category=${c.slug}`} className="group block">
                <span className="relative block aspect-square overflow-hidden rounded-[22px] border border-border bg-surface">
                  {c.image ? (
                    <Image src={c.image} alt="" fill sizes="(min-width: 1024px) 14vw, 40vw" className="object-cover opacity-80 transition-[transform,opacity] duration-500 group-hover:scale-110 group-hover:opacity-100" />
                  ) : null}
                  <span className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                  <span className="absolute inset-x-3 bottom-3">
                    <span className="block font-display text-lg leading-tight font-semibold">{pick(c, "name", locale)}</span>
                    <span className="text-[12px] text-muted">{t("home.itemsCount", { count: c._count.products })}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Featured */}
      <section className="container-page mt-24" aria-label={t("home.featuredTitle")}>
        <SectionHeading
          eyebrow={t("home.featuredEyebrow")}
          title={t("home.featuredTitle")}
          action={
            <Link href="/menu" className="group inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-accent">
              {t("home.seeAll")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          }
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={toCardView(p, locale)} />
          ))}
        </div>
      </section>

      {/* Offers */}
      {coupons.length ? (
        <section className="container-page mt-24" aria-label={t("home.offersTitle")}>
          <SectionHeading eyebrow={t("home.offersEyebrow")} title={t("home.offersTitle")} />
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {coupons.slice(0, 2).map((c, i) => (
              <article
                key={c.id}
                className="relative overflow-hidden rounded-[26px] border border-border p-7 sm:p-9"
                style={{
                  background:
                    i === 0
                      ? "radial-gradient(500px 240px at 90% 10%, rgb(255 107 53 / .28), transparent 70%), #181b22"
                      : "radial-gradient(500px 240px at 90% 10%, rgb(255 248 240 / .10), transparent 70%), #181b22",
                }}
              >
                <p className="font-display text-5xl font-semibold text-accent sm:text-6xl">
                  {c.type === "PERCENT" ? `−${c.value}%` : `−${formatKzt(c.value, locale)}`}
                </p>
                <p className="mt-3 max-w-sm text-lg text-cream">{pick(c, "description", locale)}</p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span className="text-sm text-muted">{t("home.useCode")}</span>
                  <CopyCode code={c.code} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* Advantages */}
      <section className="container-page mt-24" aria-label={t("home.advantagesTitle")}>
        <h2 className="sr-only">{t("home.advantagesTitle")}</h2>
        <ul className="grid gap-px overflow-hidden rounded-[26px] border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ChefHat, k: "adv1" },
            { icon: Receipt, k: "adv2" },
            { icon: MapPinned, k: "adv3" },
            { icon: Truck, k: "adv4" },
          ].map(({ icon: Icon, k }) => (
            <li key={k} className="bg-surface p-7">
              <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                <Icon className="size-6" />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold">{t(`home.${k}Title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(`home.${k}Text`)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Story */}
      <section className="container-page mt-24" aria-labelledby="story-title">
        <div className="grid items-center gap-10 overflow-hidden rounded-[30px] border border-border bg-surface lg:grid-cols-2">
          <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[480px]">
            <Image src="/images/story.jpg" alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            <span className="absolute inset-0 bg-gradient-to-r from-transparent to-surface/40" />
          </div>
          <div className="p-8 pt-0 sm:p-12 lg:pt-12">
            <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">{t("home.storyEyebrow")}</p>
            <h2 id="story-title" className="mt-3 font-display text-4xl leading-tight font-semibold text-balance">{t("home.storyTitle")}</h2>
            <p className="mt-5 leading-relaxed text-muted">{t("home.storyText")}</p>
            <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-border pt-6">
              <div>
                <dt className="sr-only">{t("home.stat1")}</dt>
                <dd className="font-display text-3xl font-semibold text-accent">{productCount}</dd>
                <dd className="text-[12.5px] text-muted">{t("home.stat1")}</dd>
              </div>
              <div>
                <dt className="sr-only">{t("home.stat2")}</dt>
                <dd className="font-display text-3xl font-semibold text-accent">{r.settings.estimatedDeliveryMin}</dd>
                <dd className="text-[12.5px] text-muted">{t("home.stat2")}</dd>
              </div>
              <div>
                <dt className="sr-only">{t("home.stat3")}</dt>
                <dd className="font-display text-3xl font-semibold text-accent">3</dd>
                <dd className="text-[12.5px] text-muted">{t("home.stat3")}</dd>
              </div>
            </dl>
            <Button asChild variant="outline" className="mt-8">
              <Link href="/about">{t("home.storyCta")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page mt-24">
        <div className="relative overflow-hidden rounded-[30px] bg-accent px-8 py-14 text-accent-foreground sm:px-14">
          <div aria-hidden className="absolute -top-24 -right-24 size-80 rounded-full bg-white/15 blur-2xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <h2 className="font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl">{t("home.ctaTitle")}</h2>
              <p className="mt-4 max-w-xl text-[17px] font-medium opacity-80">{t("home.ctaText")}</p>
            </div>
            <div className="lg:text-right">
              <Button asChild size="lg" className="bg-background text-cream shadow-none hover:bg-surface">
                <Link href="/menu">
                  {t("home.ctaButton")}
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
