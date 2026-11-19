import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, AtSign, Mail, MapPin, Phone } from "lucide-react";
import { getRestaurant } from "@/server/restaurant";
import { isOpenAt } from "@/lib/domain/hours";
import { formatKzPhone } from "@/lib/domain/phone";
import { pick, type Locale } from "@/i18n/config";
import { alternatesFor } from "@/lib/site";
import { Badge } from "@/components/ui/misc";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("title"), description: t("subtitle"), alternates: alternatesFor("/contact", locale) };
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations();
  const r = await getRestaurant();
  const s = r.settings;
  const open = isOpenAt(r.hours, new Date(), s.timezone);

  const cards = [
    { icon: Phone, label: t("contact.phone"), value: formatKzPhone(s.phone), href: `tel:${s.phone}` },
    { icon: Mail, label: t("contact.email"), value: s.email, href: `mailto:${s.email}` },
    { icon: MapPin, label: t("contact.address"), value: pick(s, "address", locale), href: null },
    ...(s.instagram ? [{ icon: AtSign, label: t("contact.instagram"), value: `@${s.instagram}`, href: `https://instagram.com/${s.instagram}` }] : []),
  ];

  return (
    <div className="container-page pt-32 lg:pt-40">
      <h1 className="font-display text-5xl font-semibold sm:text-6xl">{t("contact.title")}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">{t("contact.subtitle")}</p>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map(({ icon: Icon, label, value, href }) => {
            const inner = (
              <>
                <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <Icon className="size-5" />
                </span>
                <span className="mt-5 block text-sm text-muted">{label}</span>
                <span className="mt-1 block text-lg font-semibold break-words">{value}</span>
              </>
            );
            return href ? (
              <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} className="rounded-[22px] border border-border bg-surface p-6 transition-colors hover:border-accent/50">
                {inner}
              </a>
            ) : (
              <div key={label} className="rounded-[22px] border border-border bg-surface p-6">
                {inner}
              </div>
            );
          })}
          <p className="text-sm text-muted sm:col-span-2">{t("contact.orderHelp")}</p>
        </div>

        <section className="rounded-[22px] border border-border bg-surface p-6" aria-labelledby="hours-title">
          <div className="flex items-center justify-between">
            <h2 id="hours-title" className="flex items-center gap-2 font-display text-xl font-semibold">
              <Clock className="size-5 text-accent" /> {t("contact.hours")}
            </h2>
            <Badge variant={open ? "success" : "danger"}>{open ? t("contact.openNow") : t("contact.closedNow")}</Badge>
          </div>
          <dl className="mt-5 divide-y divide-border text-sm">
            {r.hours.map((h) => (
              <div key={h.day} className="flex justify-between py-2.5">
                <dt className="text-muted">{t(`days.${h.day}`)}</dt>
                <dd className="font-medium tabular-nums">{h.closed ? t("days.closed") : `${h.open} – ${h.close}`}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
