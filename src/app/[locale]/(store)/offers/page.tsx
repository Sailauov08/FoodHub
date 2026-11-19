import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgePercent } from "lucide-react";
import { getPublicCoupons } from "@/server/catalog";
import { formatDate, formatKzt } from "@/lib/domain/money";
import { pick, type Locale } from "@/i18n/config";
import { alternatesFor } from "@/lib/site";
import { CopyCode } from "@/components/store/copy-code";
import { EmptyState } from "@/components/ui/misc";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/[locale]/offers">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "offers" });
  return { title: t("title"), description: t("subtitle"), alternates: alternatesFor("/offers", locale) };
}

export default async function OffersPage({ params }: PageProps<"/[locale]/offers">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("offers");
  const coupons = await getPublicCoupons();
  const fmt = (n: number) => formatKzt(n, locale);

  return (
    <div className="container-page pt-32 lg:pt-40">
      <h1 className="font-display text-5xl font-semibold sm:text-6xl">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">{t("subtitle")}</p>
      {coupons.length ? (
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {coupons.map((c) => (
            <article key={c.id} className="relative flex flex-col overflow-hidden rounded-[26px] border border-border bg-surface p-8">
              <span aria-hidden className="absolute -top-16 -right-16 size-48 rounded-full bg-accent/15 blur-3xl" />
              <BadgePercent className="size-8 text-accent" />
              <p className="mt-5 font-display text-5xl font-semibold text-accent">
                {c.type === "PERCENT" ? `−${c.value}%` : `−${fmt(c.value)}`}
                {c.type === "PERCENT" && c.maxDiscount ? <span className="ml-3 align-middle text-base font-normal text-muted">{t("upTo", { amount: fmt(c.maxDiscount) })}</span> : null}
              </p>
              <p className="mt-3 text-lg">{pick(c, "description", locale)}</p>
              <ul className="mt-4 space-y-1 text-sm text-muted">
                {c.minSubtotal > 0 ? <li>{t("minOrder", { amount: fmt(c.minSubtotal) })}</li> : null}
                {c.endsAt ? <li>{t("validUntil", { date: formatDate(c.endsAt, locale) })}</li> : null}
              </ul>
              <div className="mt-6">
                <CopyCode code={c.code} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState className="mt-12" icon={<BadgePercent />} title={t("empty")} text={t("emptyText")} />
      )}
    </div>
  );
}
