"use client";

import Image from "next/image";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Minus, Plus, Tag, Trash2, X } from "lucide-react";
import { useCart, type CartItem } from "@/stores/cart";
import type { Quote, QuoteLine } from "@/server/orders";
import { formatKzt } from "@/lib/domain/money";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";

type Localized = { kk: string; ru: string; en: string };
export const pickL = (v: Localized | null | undefined, locale: Locale) => (v ? v[locale] || v.kk : "");

/** Matches quote lines to cart items (quote preserves request order). */
export function quoteLineFor(quote: Quote | null, items: CartItem[], index: number): QuoteLine | null {
  if (!quote || quote.lines.length !== items.length) return null;
  const line = quote.lines[index];
  return line && line.productId === items[index]?.productId && line.quantity === items[index]?.quantity ? line : null;
}

export function QuantityStepper({
  value,
  max,
  onChange,
  size = "md",
  label,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  size?: "sm" | "md";
  label?: string;
}) {
  const t = useTranslations("product");
  const btn = size === "sm" ? "size-8" : "size-10";
  return (
    <div role="group" aria-label={label ?? t("quantity")} className="inline-flex items-center rounded-full border border-border-strong bg-surface">
      <button type="button" className={cn(btn, "grid place-items-center rounded-full text-cream transition-colors hover:bg-surface-2 disabled:opacity-40")} onClick={() => onChange(value - 1)} aria-label={t("decrease")}>
        <Minus className="size-4" />
      </button>
      <span className={cn("min-w-8 text-center font-semibold tabular-nums", size === "sm" ? "text-sm" : "text-base")} aria-live="polite">
        {value}
      </span>
      <button type="button" className={cn(btn, "grid place-items-center rounded-full text-cream transition-colors hover:bg-surface-2 disabled:opacity-40")} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={t("increase")}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function CartLine({ item, line, compact = false }: { item: CartItem; line: QuoteLine | null; compact?: boolean }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);

  const name = line ? (locale === "kk" ? line.nameKk : locale === "ru" ? line.nameRu : line.nameEn) : pickL(item.snapshot?.name, locale) || "…";
  const image = line?.imageUrl ?? item.snapshot?.image ?? null;
  const variant = line?.variantName ? pickL(line.variantName, locale) : pickL(item.snapshot?.variant, locale);
  const modifiers = line ? line.modifiers.map((m) => m[locale] || m.kk) : (item.snapshot?.modifiers ?? []).map((m) => pickL(m, locale));
  const price = line?.lineTotal ?? (item.snapshot ? item.snapshot.unitPrice * item.quantity : null);
  const max = line?.maxPerOrder ?? item.snapshot?.maxPerOrder ?? 20;
  const slug = line?.slug ?? item.snapshot?.slug;

  return (
    <li className={cn("flex gap-3.5", line?.error && "opacity-90")}>
      <div className={cn("relative shrink-0 overflow-hidden rounded-[14px] bg-surface-2", compact ? "size-[72px]" : "size-24")}>
        {image ? <Image src={image} alt="" fill sizes="96px" className="object-cover" /> : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          {slug ? (
            <Link href={`/menu/${slug}`} className="line-clamp-2 font-semibold leading-snug hover:text-accent">
              {name}
            </Link>
          ) : (
            <span className="line-clamp-2 font-semibold leading-snug">{name}</span>
          )}
          <button type="button" onClick={() => remove(item.key)} className="-mt-1 -mr-1 shrink-0 rounded-full p-1.5 text-muted-2 transition-colors hover:bg-surface-2 hover:text-danger" aria-label={t("cart.removeItem", { name })}>
            <X className="size-4" />
          </button>
        </div>
        {variant || modifiers.length ? (
          <p className="line-clamp-2 text-[13px] text-muted">{[variant, ...modifiers].filter(Boolean).join(" · ")}</p>
        ) : null}
        {line?.error ? (
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-danger">
            <AlertTriangle className="size-3.5" />
            {t(`lineErrors.${line.error}`)}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <QuantityStepper size="sm" value={item.quantity} max={max} onChange={(v) => setQuantity(item.key, v)} />
          <span className="font-semibold tabular-nums">{price !== null ? formatKzt(price, locale) : "—"}</span>
        </div>
      </div>
    </li>
  );
}

export function CouponForm() {
  const t = useTranslations("cart");
  const couponCode = useCart((s) => s.couponCode);
  const setCoupon = useCart((s) => s.setCoupon);
  const [value, setValue] = useState("");
  const apply = () => {
    if (value.trim()) setCoupon(value);
    setValue("");
  };

  if (couponCode) {
    return (
      <div className="flex items-center justify-between rounded-[12px] border border-accent/40 bg-accent-soft px-3.5 py-2.5 text-sm">
        <span className="flex items-center gap-2 font-semibold text-accent">
          <Tag className="size-4" />
          {couponCode}
        </span>
        <button type="button" onClick={() => setCoupon(null)} className="text-[13px] text-muted underline-offset-2 hover:text-cream hover:underline">
          {t("couponRemove")}
        </button>
      </div>
    );
  }
  return (
    <div className="flex gap-2" role="group" aria-label={t("coupon")}>
      <label htmlFor="coupon" className="sr-only">
        {t("coupon")}
      </label>
      <Input
        id="coupon"
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
        }} placeholder={t("couponPlaceholder")} maxLength={32} className="h-10 uppercase" autoComplete="off" />
      <Button type="button" variant="secondary" size="sm" className="h-10 px-4" disabled={!value.trim()} onClick={apply}>
        {t("apply")}
      </Button>
    </div>
  );
}

export function SummaryRows({
  quote,
  loading,
  showDelivery = true,
}: {
  quote: Quote | null;
  loading: boolean;
  showDelivery?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const couponCode = useCart((s) => s.couponCode);
  const fmt = (n: number) => formatKzt(n, locale);
  return (
    <div className={cn("space-y-2.5 text-[15px]", loading && "opacity-70 transition-opacity")} aria-busy={loading}>
      {couponCode && quote?.couponError ? (
        <p className="flex items-center gap-1.5 text-[13px] text-danger" role="alert">
          <AlertTriangle className="size-3.5" />
          {t(`couponErrors.${quote.couponError}`)}
        </p>
      ) : null}
      <Row label={t("cart.subtotal")} value={quote ? fmt(quote.subtotal) : "—"} />
      {quote && quote.discount > 0 ? <Row label={`${t("cart.discount")}${quote.coupon ? ` · ${quote.coupon.code}` : ""}`} value={`−${fmt(quote.discount)}`} accent /> : null}
      {showDelivery ? (
        <Row label={t("cart.delivery")} value={quote ? (quote.deliveryFee === 0 ? t("cart.free") : fmt(quote.deliveryFee)) : "—"} />
      ) : null}
      <div className="flex items-baseline justify-between border-t border-border pt-3">
        <span className="font-semibold">{t("cart.total")}</span>
        <span className="font-display text-2xl font-semibold tabular-nums">{quote ? fmt(quote.total) : "—"}</span>
      </div>
      {quote && quote.belowMinimum ? (
        <p className="rounded-[10px] bg-warning/10 px-3 py-2 text-[13px] text-warning">
          {t("cart.minOrder", { amount: fmt(quote.minOrderValue), missing: fmt(quote.amountToMinimum) })}
        </p>
      ) : null}
      {quote && showDelivery && quote.freeDeliveryThreshold !== null && !quote.belowMinimum ? (
        quote.subtotal >= quote.freeDeliveryThreshold ? (
          <p className="text-[13px] text-success">{t("cart.freeDeliveryReached")}</p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[13px] text-muted">{t("cart.freeDeliveryHint", { amount: fmt(quote.freeDeliveryThreshold - quote.subtotal) })}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuemin={0} aria-valuemax={quote.freeDeliveryThreshold} aria-valuenow={quote.subtotal} aria-label={t("cart.delivery")}>
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-[#ffb37a] transition-[width] duration-500" style={{ width: `${Math.min(100, (quote.subtotal / quote.freeDeliveryThreshold) * 100)}%` }} />
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={cn("font-medium tabular-nums", accent && "text-success")}>{value}</span>
    </div>
  );
}

export function ClearCartButton({ onConfirm }: { onConfirm: () => void }) {
  const t = useTranslations();
  const [asking, setAsking] = useState(false);
  if (asking) {
    return (
      <span className="flex items-center gap-2 text-[13px]">
        <span className="text-muted">{t("cart.clearConfirm")}</span>
        <button type="button" className="font-semibold text-danger hover:underline" onClick={onConfirm}>
          {t("common.yes")}
        </button>
        <button type="button" className="text-muted hover:underline" onClick={() => setAsking(false)}>
          {t("common.no")}
        </button>
      </span>
    );
  }
  return (
    <button type="button" onClick={() => setAsking(true)} className="-mx-2 flex min-h-9 items-center gap-1.5 rounded-full px-2 text-[13px] text-muted transition-colors hover:text-danger">
      <Trash2 className="size-3.5" />
      {t("cart.clear")}
    </button>
  );
}
