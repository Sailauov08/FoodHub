"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/stores/cart";
import { priceLine } from "@/lib/domain/pricing";
import { formatKzt } from "@/lib/domain/money";
import type { Locale } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { QuantityStepper } from "@/components/store/cart-parts";
import { cn } from "@/lib/utils";

type L = { kk: string; ru: string; en: string };
export type ConfiguratorProduct = {
  id: string;
  slug: string;
  names: L;
  image: string | null;
  price: number;
  isAvailable: boolean;
  maxPerOrder: number;
  variants: { id: string; names: L; price: number; isDefault: boolean; isAvailable: boolean }[];
  groups: {
    id: string;
    names: L;
    minSelect: number;
    maxSelect: number;
    options: { id: string; names: L; price: number; isAvailable: boolean }[];
  }[];
};

export function ProductConfigurator({ product }: { product: ConfiguratorProduct }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const add = useCart((s) => s.add);
  const setDrawerOpen = useCart((s) => s.setDrawerOpen);
  const fmt = (n: number) => formatKzt(n, locale);

  const initialVariant =
    product.variants.find((v) => v.isDefault && v.isAvailable) ?? product.variants.find((v) => v.isAvailable) ?? null;
  const [variantId, setVariantId] = useState<string | null>(initialVariant?.id ?? null);
  // Pre-select the first available option of required single-choice groups.
  const [selected, setSelected] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      product.groups.map((g) => {
        const first = g.options.find((o) => o.isAvailable);
        return [g.id, g.minSelect === 1 && g.maxSelect === 1 && first ? [first.id] : []];
      }),
    ),
  );
  const [quantity, setQuantity] = useState(1);
  const [showErrors, setShowErrors] = useState(false);

  const optionIds = useMemo(() => Object.values(selected).flat(), [selected]);
  // Same pure pricing function the server uses — the server still recalculates at checkout.
  const priced = priceLine(
    {
      id: product.id,
      price: product.price,
      isAvailable: product.isAvailable,
      isArchived: false,
      maxPerOrder: product.maxPerOrder,
      variants: product.variants.map((v) => ({ ...v, isArchived: false })),
      modifierGroups: product.groups.map((g) => ({ ...g, options: g.options.map((o) => ({ ...o, isArchived: false })) })),
    },
    { productId: product.id, variantId, modifierOptionIds: optionIds, quantity },
  );
  const unitPrice =
    (product.variants.find((v) => v.id === variantId)?.price ?? product.price) +
    product.groups.flatMap((g) => g.options).filter((o) => optionIds.includes(o.id)).reduce((a, o) => a + o.price, 0);

  function toggle(groupId: string, optionId: string, max: number) {
    setSelected((prev) => {
      const cur = prev[groupId] ?? [];
      if (max === 1) return { ...prev, [groupId]: cur[0] === optionId ? [] : [optionId] };
      if (cur.includes(optionId)) return { ...prev, [groupId]: cur.filter((id) => id !== optionId) };
      if (cur.length >= max) return prev;
      return { ...prev, [groupId]: [...cur, optionId] };
    });
  }

  function addToCart() {
    if (!priced.ok) {
      setShowErrors(true);
      toast.error(t("product.selectRequired"));
      return;
    }
    const variant = product.variants.find((v) => v.id === variantId);
    const chosen = product.groups.flatMap((g) => g.options).filter((o) => optionIds.includes(o.id));
    add({
      productId: product.id,
      variantId,
      modifierOptionIds: priced.optionIds,
      quantity,
      snapshot: {
        slug: product.slug,
        name: product.names,
        image: product.image,
        variant: variant?.names ?? null,
        modifiers: chosen.map((o) => o.names),
        unitPrice: priced.unitPrice,
        maxPerOrder: product.maxPerOrder,
      },
    });
    toast.success(t("menu.added"), {
      description: product.names[locale],
      action: { label: t("cart.viewCart"), onClick: () => setDrawerOpen(true) },
    });
  }

  if (!product.isAvailable) {
    return (
      <div className="rounded-[22px] border border-border bg-surface p-6">
        <p className="font-display text-xl font-semibold">{t("product.unavailableTitle")}</p>
        <p className="mt-2 text-sm text-muted">{t("product.unavailableText")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {product.variants.length ? (
        <fieldset>
          <legend className="mb-3 flex items-center gap-2 font-semibold">
            {t("product.size")}
            <Badge variant="soft">{t("product.required")}</Badge>
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup">
            {product.variants.map((v) => {
              const active = v.id === variantId;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={!v.isAvailable}
                  onClick={() => setVariantId(v.id)}
                  className={cn(
                    "flex flex-col items-start rounded-[14px] border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    active ? "border-accent bg-accent-soft" : "border-border-strong hover:border-accent/50",
                  )}
                >
                  <span className="font-semibold">{v.names[locale]}</span>
                  <span className={cn("text-sm", active ? "text-accent" : "text-muted")}>{fmt(v.price)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {product.groups.map((g) => {
        const cur = selected[g.id] ?? [];
        const required = g.minSelect > 0;
        const invalid = showErrors && (cur.length < g.minSelect || cur.length > g.maxSelect);
        const rule =
          g.maxSelect === 1 ? t("product.chooseOne") : g.minSelect > 0 ? t("product.chooseBetween", { min: g.minSelect, max: g.maxSelect }) : t("product.chooseUpTo", { max: g.maxSelect });
        return (
          <fieldset key={g.id} aria-invalid={invalid || undefined}>
            <legend className="mb-3 flex flex-wrap items-center gap-2 font-semibold">
              {g.names[locale]}
              <Badge variant={required ? "soft" : "neutral"}>{required ? t("product.required") : t("product.optional")}</Badge>
              <span className="text-[13px] font-normal text-muted">{rule}</span>
            </legend>
            <div className={cn("divide-y divide-border overflow-hidden rounded-[16px] border", invalid ? "border-danger" : "border-border")}>
              {g.options.map((o) => {
                const on = cur.includes(o.id);
                const disabled = !o.isAvailable || (!on && g.maxSelect > 1 && cur.length >= g.maxSelect);
                return (
                  <button
                    key={o.id}
                    type="button"
                    role={g.maxSelect === 1 ? "radio" : "checkbox"}
                    aria-checked={on}
                    disabled={disabled}
                    onClick={() => toggle(g.id, o.id, g.maxSelect)}
                    className="flex w-full items-center gap-3 bg-surface px-4 py-3.5 text-left transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center border transition-colors",
                        g.maxSelect === 1 ? "rounded-full" : "rounded-[6px]",
                        on ? "border-accent bg-accent text-accent-foreground" : "border-border-strong",
                      )}
                    >
                      {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
                    </span>
                    <span className="flex-1">{o.names[locale]}</span>
                    {o.price > 0 ? <span className="text-sm text-muted tabular-nums">+{fmt(o.price)}</span> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <div className="sticky bottom-3 z-20 flex items-center gap-3 rounded-[20px] border border-border-strong bg-background/90 p-3 shadow-2xl backdrop-blur-xl sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
        <QuantityStepper value={quantity} max={product.maxPerOrder} onChange={(v) => setQuantity(Math.max(1, Math.min(v, product.maxPerOrder)))} />
        <Button size="lg" className="flex-1 px-4" onClick={addToCart}>
          <ShoppingBag className="size-5" />
          {t("product.addFor", { price: fmt(unitPrice * quantity) })}
        </Button>
      </div>
      {quantity >= product.maxPerOrder ? <p className="text-[13px] text-muted">{t("product.maxQty", { max: product.maxPerOrder })}</p> : null}
    </div>
  );
}
