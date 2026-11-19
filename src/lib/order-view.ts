import type { Locale } from "@/i18n/config";

/** Snapshot strings for variants/modifiers are stored as "kk / ru / en". */
export function splitLocalized(value: string | null | undefined, locale: Locale): string {
  if (!value) return "";
  const parts = value.split(" / ");
  if (parts.length !== 3) return value;
  return (locale === "kk" ? parts[0] : locale === "ru" ? parts[1] : parts[2]) ?? value;
}

export function itemName(item: { nameKk: string; nameRu: string; nameEn: string }, locale: Locale): string {
  return locale === "kk" ? item.nameKk : locale === "ru" ? item.nameRu : item.nameEn;
}

export const STATUS_VARIANT: Record<string, "warning" | "info" | "soft" | "success" | "danger" | "neutral"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  PREPARING: "soft",
  READY: "success",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "neutral",
  PICKED_UP: "neutral",
  CANCELLED: "danger",
};
