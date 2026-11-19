"use client";

import { useTranslations } from "next-intl";
import { ShoppingBag } from "lucide-react";
import { useCart, cartCount } from "@/stores/cart";
import { useCartQuote } from "@/hooks/use-cart-quote";
import { Link } from "@/i18n/navigation";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CartLine, ClearCartButton, CouponForm, SummaryRows, quoteLineFor } from "@/components/store/cart-parts";

export function CartDrawer() {
  const t = useTranslations("cart");
  const tc = useTranslations("common");
  const open = useCart((s) => s.drawerOpen);
  const setOpen = useCart((s) => s.setDrawerOpen);
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const { quote, loading, error } = useCartQuote("DELIVERY", open);
  const count = cartCount(items);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent closeLabel={tc("close")} aria-describedby="cart-drawer-desc">
        <div className="border-b border-border px-6 pt-6 pb-4">
          <SheetTitle className="text-2xl">{t("drawerTitle")}</SheetTitle>
          <SheetDescription id="cart-drawer-desc" className="mt-1">
            {t("items", { count })}
          </SheetDescription>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="grid size-20 place-items-center rounded-full bg-accent-soft text-accent">
              <ShoppingBag className="size-9" />
            </div>
            <p className="font-display text-2xl font-semibold">{t("empty")}</p>
            <p className="text-sm text-muted">{t("emptyText")}</p>
            <Button asChild className="mt-2">
              <Link href="/menu" onClick={() => setOpen(false)}>
                {t("browse")}
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {items.map((item, i) => (
                <CartLine key={item.key} item={item} line={quoteLineFor(quote, items, i)} compact />
              ))}
            </ul>
            <div className="space-y-4 border-t border-border bg-surface/60 px-6 pt-4 pb-6">
              <div className="flex items-center justify-between">
                <ClearCartButton onConfirm={clear} />
                {error ? <span className="text-[12px] text-warning">{t("quoteFailed")}</span> : null}
              </div>
              <CouponForm />
              <SummaryRows quote={quote} loading={loading} />
              {quote?.hasInvalidLines ? <p className="text-[13px] text-danger">{t("invalidItems")}</p> : null}
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline">
                  <Link href="/cart" onClick={() => setOpen(false)}>
                    {t("viewCart")}
                  </Link>
                </Button>
                {quote && (quote.hasInvalidLines || quote.belowMinimum) ? (
                  <Button disabled>{t("checkout")}</Button>
                ) : (
                  <Button asChild>
                    <Link href="/checkout" onClick={() => setOpen(false)}>
                      {t("checkout")}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
