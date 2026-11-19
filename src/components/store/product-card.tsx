"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/stores/cart";
import type { ProductCardView } from "@/lib/product-view";
import { Badge } from "@/components/ui/misc";
import { FavoriteButton } from "@/components/store/favorite-button";
import { cn } from "@/lib/utils";

export function ProductCard({ product, priority = false }: { product: ProductCardView; priority?: boolean }) {
  const t = useTranslations();
  const add = useCart((s) => s.add);
  const setDrawerOpen = useCart((s) => s.setDrawerOpen);
  const href = `/menu/${product.slug}`;

  function quickAdd() {
    add({
      productId: product.id,
      variantId: product.defaultVariant?.id ?? null,
      modifierOptionIds: [],
      quantity: 1,
      snapshot: {
        slug: product.slug,
        name: product.names,
        image: product.image,
        variant: product.defaultVariant?.names ?? null,
        modifiers: [],
        unitPrice: product.defaultVariant?.price ?? product.startingPrice,
        maxPerOrder: product.maxPerOrder,
      },
    });
    toast.success(t("menu.added"), {
      description: product.name,
      action: { label: t("cart.viewCart"), onClick: () => setDrawerOpen(true) },
    });
  }

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[22px] border border-border bg-[linear-gradient(180deg,#1b1e26,#16181e)] transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-[0_28px_60px_-30px_rgb(255_107_53/0.35)] motion-reduce:hover:translate-y-0",
        !product.isAvailable && "opacity-75",
      )}
    >
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-surface-2" tabIndex={-1} aria-hidden>
        {product.image ? (
          <Image
            src={product.image}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 480px) 50vw, 100vw"
            className={cn("object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]", !product.isAvailable && "grayscale")}
          />
        ) : null}
        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-surface/90 to-transparent" />
      </Link>
      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
        {!product.isAvailable ? <Badge variant="neutral">{t("menu.soldOut")}</Badge> : null}
        {product.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant={tag === "bestseller" ? "default" : "outline"} className={tag !== "bestseller" ? "bg-background/70 backdrop-blur" : ""}>
            {t.has(`tags.${tag}`) ? t(`tags.${tag}`) : tag}
          </Badge>
        ))}
      </div>
      <FavoriteButton productId={product.id} className="absolute top-3 right-3" />

      <div className="flex flex-1 flex-col gap-2 p-5 pt-3">
        <p className="text-[11.5px] font-semibold tracking-[0.16em] text-muted-2 uppercase">{product.category}</p>
        <h3 className="font-display text-[21px] leading-tight font-semibold">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted">{product.description}</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            {product.hasVariants ? <span className="mr-1 text-[12px] text-muted">{t("common.from")}</span> : null}
            <span className="font-display text-[22px] font-semibold text-cream">{product.priceLabel}</span>
            {product.compareAtLabel ? <span className="ml-2 text-sm text-muted-2 line-through">{product.compareAtLabel}</span> : null}
          </div>
          {product.isAvailable ? (
            product.needsCustomization ? (
              <Link
                href={href}
                className="relative z-10 flex h-11 items-center gap-2 rounded-full border border-accent/50 px-4 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <SlidersHorizontal className="size-4" />
                {t("menu.customize")}
              </Link>
            ) : (
              <button
                type="button"
                onClick={quickAdd}
                aria-label={`${t("menu.addToCart")}: ${product.name}`}
                className="relative z-10 grid size-11 place-items-center rounded-full bg-accent text-accent-foreground shadow-[0_10px_24px_-10px_rgb(255_107_53/0.9)] transition-[transform,background-color] hover:scale-105 hover:bg-accent-hover active:scale-95"
              >
                <Plus className="size-5" strokeWidth={2.5} />
              </button>
            )
          ) : (
            <span className="text-[13px] font-medium text-muted-2">{t("menu.unavailable")}</span>
          )}
        </div>
      </div>
    </article>
  );
}
