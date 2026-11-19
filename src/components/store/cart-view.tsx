"use client";

import { useTranslations } from "next-intl";
import { Clock, ShoppingBag } from "lucide-react";
import { useCart } from "@/stores/cart";
import { useCartQuote } from "@/hooks/use-cart-quote";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { CartLine, ClearCartButton, CouponForm, SummaryRows, quoteLineFor } from "@/components/store/cart-parts";

export function CartView() {
  const t = useTranslations("cart");
  const tCheckout = useTranslations("checkout");
  const items = useCart((s) => s.items);
  const hydrated = useCart((s) => s.hydrated);
  const clear = useCart((s) => s.clear);
  const { quote, loading, error } = useCartQuote("DELIVERY");

  if (!hydrated) {
    return (
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        className="mt-10"
        icon={<ShoppingBag />}
        title={t("empty")}
        text={t("emptyText")}
        action={
          <Button asChild>
            <Link href="/menu">{t("browse")}</Link>
          </Button>
        }
      />
    );
  }

  // In preview mode the checkout page can still be viewed; placing the order is disabled there.
  const blocked = !quote || quote.hasInvalidLines || quote.belowMinimum || (!quote.canOrder && !quote.preview);

  return (
    <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_400px]">
      <section className="rounded-[24px] border border-border bg-surface p-5 sm:p-7">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted">{t("items", { count: items.reduce((a, i) => a + i.quantity, 0) })}</p>
          <ClearCartButton onConfirm={clear} />
        </div>
        <ul className="space-y-6">
          {items.map((item, i) => (
            <CartLine key={item.key} item={item} line={quoteLineFor(quote, items, i)} />
          ))}
        </ul>
      </section>
      <aside className="space-y-5 rounded-[24px] border border-border bg-surface p-6 lg:sticky lg:top-28">
        {quote?.preview ? (
          <p className="rounded-[14px] bg-warning/10 p-4 text-sm text-warning">{tCheckout("previewDisabled")}</p>
        ) : quote && !quote.canOrder ? (
          <div className="flex gap-3 rounded-[14px] bg-warning/10 p-4 text-sm text-warning">
            <Clock className="size-5 shrink-0" />
            <div>
              <p className="font-semibold">{t("closedTitle")}</p>
              <p className="mt-1 opacity-90">{t("closedText")}</p>
            </div>
          </div>
        ) : null}
        <CouponForm />
        <SummaryRows quote={quote} loading={loading} />
        <p className="text-[12.5px] text-muted-2">{t("deliveryAtCheckout")}</p>
        {error ? <p className="text-[13px] text-warning">{t("quoteFailed")}</p> : null}
        {quote?.hasInvalidLines ? <p className="text-[13px] text-danger">{t("invalidItems")}</p> : null}
        {blocked ? (
          <Button size="lg" className="w-full" disabled>
            {loading ? t("calculating") : t("checkout")}
          </Button>
        ) : (
          <Button asChild size="lg" className="w-full">
            <Link href="/checkout">{t("checkout")}</Link>
          </Button>
        )}
      </aside>
    </div>
  );
}
