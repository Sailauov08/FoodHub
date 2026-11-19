import { getTranslations, setRequestLocale } from "next-intl/server";
import { Heart } from "lucide-react";
import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/session";
import { productCardInclude } from "@/server/catalog";
import { toCardView } from "@/lib/product-view";
import { ProductCard } from "@/components/store/product-card";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import { isPreview } from "@/lib/preview";

export default async function AccountFavorites({ params }: PageProps<"/[locale]/account/favorites">) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Preview mode: the layout shows a setup-required screen; never touch the database here.
  if (isPreview) return null;
  const user = await requirePageRole("ANY", "/account/favorites");
  const t = await getTranslations();
  const favorites = await db.favorite.findMany({
    where: { userId: user.id, product: { isArchived: false } },
    orderBy: { createdAt: "desc" },
    include: { product: { include: productCardInclude } },
  });
  return (
    <section>
      <h2 className="mb-4 font-display text-2xl font-semibold">{t("account.favorites")}</h2>
      {favorites.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((f) => (
            <ProductCard key={f.productId} product={toCardView(f.product, locale as Locale)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Heart />}
          title={t("account.noFavorites")}
          text={t("account.noFavoritesText")}
          action={
            <Button asChild>
              <Link href="/menu">{t("cart.browse")}</Link>
            </Button>
          }
        />
      )}
    </section>
  );
}
