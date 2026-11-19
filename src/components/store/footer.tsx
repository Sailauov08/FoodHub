import { getLocale, getTranslations } from "next-intl/server";
import { AtSign, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/store/logo";
import { LanguageSwitcher } from "@/components/store/language-switcher";
import { getRestaurant } from "@/server/restaurant";
import { formatKzPhone } from "@/lib/domain/phone";
import { pick, type Locale } from "@/i18n/config";

export async function Footer() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const r = await getRestaurant();
  const s = r.settings;
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-24 border-t border-border bg-background-deep">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div className="space-y-5">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted">{t("footer.tagline")}</p>
          <LanguageSwitcher className="w-fit" />
        </div>
        <div>
          <h2 className="mb-4 text-xs font-semibold tracking-[0.2em] text-accent uppercase">{t("footer.explore")}</h2>
          <ul className="space-y-1 text-sm">
            {(["menu", "offers", "about", "contact"] as const).map((k) => (
              <li key={k}>
                <Link href={`/${k}`} className="inline-block py-1 text-muted transition-colors hover:text-cream">
                  {t(`nav.${k}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-xs font-semibold tracking-[0.2em] text-accent uppercase">{t("footer.account")}</h2>
          <ul className="space-y-1 text-sm">
            <li>
              <Link href="/account" className="inline-block py-1 text-muted transition-colors hover:text-cream">{t("nav.account")}</Link>
            </li>
            <li>
              <Link href="/account/orders" className="inline-block py-1 text-muted transition-colors hover:text-cream">{t("account.orders")}</Link>
            </li>
            <li>
              <Link href="/cart" className="inline-block py-1 text-muted transition-colors hover:text-cream">{t("nav.cart")}</Link>
            </li>
          </ul>
        </div>
        <div className="space-y-3 text-sm">
          <h2 className="mb-4 text-xs font-semibold tracking-[0.2em] text-accent uppercase">{t("footer.contact")}</h2>
          <a href={`tel:${s.phone}`} className="flex min-h-8 items-center gap-2.5 text-muted hover:text-cream">
            <Phone className="size-4 text-accent" /> {formatKzPhone(s.phone)}
          </a>
          <a href={`mailto:${s.email}`} className="flex min-h-8 items-center gap-2.5 text-muted hover:text-cream">
            <Mail className="size-4 text-accent" /> {s.email}
          </a>
          <p className="flex items-start gap-2.5 text-muted">
            <MapPin className="mt-0.5 size-4 shrink-0 text-accent" /> {pick(s, "address", locale)}
          </p>
          {s.instagram ? (
            <a href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noopener noreferrer" className="flex min-h-8 items-center gap-2.5 text-muted hover:text-cream">
              <AtSign className="size-4 text-accent" /> @{s.instagram}
            </a>
          ) : null}
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-6 text-[12.5px] text-muted-2 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.rights", { year })}</p>
          <p>
            {t("common.demoNotice")} · {t("footer.credits")}
          </p>
        </div>
      </div>
    </footer>
  );
}
