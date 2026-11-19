import type { Metadata, Viewport } from "next";
// Self-hosted fonts (bundled from npm) — no runtime dependency on Google Fonts; include Cyrillic/Kazakh glyphs.
import "@fontsource-variable/inter";
import "@fontsource/noto-serif/500.css";
import "@fontsource/noto-serif/600.css";
import "@fontsource/noto-serif/700.css";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { routing } from "@/i18n/routing";
import { siteUrl, alternatesFor } from "@/lib/site";
import { DemoRoleSwitcher } from "@/components/demo/demo-role-switcher";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#111318",
  colorScheme: "dark",
};

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t("title"), template: "%s · FoodHub" },
    description: t("description"),
    applicationName: "FoodHub",
    alternates: alternatesFor("/", locale),
    openGraph: {
      type: "website",
      siteName: "FoodHub",
      title: t("title"),
      description: t("description"),
      locale: locale === "kk" ? "kk_KZ" : locale === "ru" ? "ru_RU" : "en_US",
      images: [{ url: "/images/og-burger.jpg", width: 1600, height: 1600, alt: "FoodHub" }],
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description"), images: ["/images/og-burger.jpg"] },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-dvh bg-background antialiased">
        <a
          href="#main"
          className="sr-only z-[100] rounded-md bg-accent px-4 py-2 font-semibold text-accent-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          {children}
          <DemoRoleSwitcher />
        </NextIntlClientProvider>
        <Toaster
          theme="dark"
          position="top-center"
          richColors
          toastOptions={{ style: { background: "#20242d", border: "1px solid rgb(255 248 240 / 0.12)", color: "#fff8f0" } }}
        />
      </body>
    </html>
  );
}
