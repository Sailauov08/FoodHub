import { locales, defaultLocale, type Locale } from "@/i18n/config";

/** Public base URL. Set NEXT_PUBLIC_SITE_URL in each environment; Vercel's URL is used as a fallback. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function localizedPath(path: string, locale: string): string {
  const clean = path === "/" ? "" : path;
  return locale === defaultLocale ? clean || "/" : `/${locale}${clean}`;
}

/** Canonical + hreflang alternates for a path. */
export function alternatesFor(path: string, locale: string) {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l === "kk" ? "kk-KZ" : l === "ru" ? "ru-RU" : "en"] = localizedPath(path, l);
  languages["x-default"] = localizedPath(path, defaultLocale);
  return { canonical: localizedPath(path, locale as Locale), languages };
}
