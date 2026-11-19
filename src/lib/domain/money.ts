import type { Locale } from "@/i18n/config";

/*
 * Deterministic formatting. Browsers ship different ICU data than Node (Chromium has incomplete kk-KZ),
 * so Intl output for Kazakh can differ between server and client and break hydration. Numbers and dates
 * are therefore formatted by hand; Intl is used only for numeric date parts in a fixed locale (en-GB).
 */

function group(n: number, sep: string): string {
  const neg = n < 0;
  const digits = Math.abs(Math.round(n)).toString();
  const out = digits.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return neg ? `-${out}` : out;
}

const sepFor = (locale: Locale) => (locale === "en" ? "," : " ");

/** Formats a whole-tenge amount, e.g. "2 490 ₸" (kk/ru) or "2,490 ₸" (en). */
export function formatKzt(amount: number, locale: Locale = "kk"): string {
  return `${group(amount, sepFor(locale))} ₸`;
}

export function formatNumber(value: number, locale: Locale = "kk"): string {
  const whole = Math.trunc(value);
  const frac = Math.round(Math.abs(value - whole) * 10);
  const base = group(whole, sepFor(locale));
  return frac ? `${base}${locale === "en" ? "." : ","}${frac}` : base;
}

const MONTHS: Record<Locale, string[]> = {
  kk: ["қаң.", "ақп.", "нау.", "сәу.", "мам.", "мау.", "шіл.", "там.", "қыр.", "қаз.", "қар.", "жел."],
  ru: ["янв.", "февр.", "мар.", "апр.", "мая", "июн.", "июл.", "авг.", "сент.", "окт.", "нояб.", "дек."],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

function parts(date: Date | string, timeZone: string) {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(date));
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "0";
  return { y: get("year"), m: Number(get("month")), d: Number(get("day")), hh: get("hour").padStart(2, "0"), mm: get("minute") };
}

export function formatDate(date: Date | string, locale: Locale = "kk", timeZone = "Asia/Almaty"): string {
  const { y, m, d } = parts(date, timeZone);
  const mon = MONTHS[locale][m - 1];
  if (locale === "en") return `${mon} ${d}, ${y}`;
  if (locale === "ru") return `${d} ${mon} ${y} г.`;
  return `${y} ж. ${d} ${mon}`;
}

/** Compact chart label: "4 қар." / "4 нояб." / "Nov 4", or month + 2-digit year for monthly buckets. */
export function formatShortDate(date: Date | string, locale: Locale = "kk", monthly = false, timeZone = "Asia/Almaty"): string {
  const { y, m, d } = parts(date, timeZone);
  const mon = MONTHS[locale][m - 1];
  if (monthly) return `${mon} ${y.slice(-2)}`;
  return locale === "en" ? `${mon} ${d}` : `${d} ${mon}`;
}

/** 24-hour HH:MM, identical in every locale (the locale argument is kept for a uniform signature). */
export function formatTime(date: Date | string, locale: Locale = "kk", timeZone = "Asia/Almaty"): string {
  void locale;
  const { hh, mm } = parts(date, timeZone);
  return `${hh}:${mm}`;
}

export function formatDateTime(date: Date | string, locale: Locale = "kk", timeZone = "Asia/Almaty"): string {
  return `${formatDate(date, locale, timeZone)}, ${formatTime(date, locale, timeZone)}`;
}
