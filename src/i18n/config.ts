export const locales = ["kk", "ru", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "kk";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** Picks the localized column (nameKk / nameRu / nameEn) from an entity. */
export function pick<T extends Record<string, unknown>>(entity: T, field: string, locale: Locale): string {
  const suffix = locale === "kk" ? "Kk" : locale === "ru" ? "Ru" : "En";
  const value = entity[`${field}${suffix}`] ?? entity[`${field}Kk`];
  return typeof value === "string" ? value : "";
}
