import { getTranslations, setRequestLocale } from "next-intl/server";
import { Heart, MapPin, Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/session";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { OrderList } from "@/components/store/order-list";
import { isPreview } from "@/lib/preview";

export default async function AccountOverview({ params }: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Preview mode: the layout shows a setup-required screen; never touch the database here.
  if (isPreview) return null;
  const user = await requirePageRole("ANY", "/account");
  const t = await getTranslations();
  const [orderCount, addressCount, favoriteCount, recent] = await Promise.all([
    db.order.count({ where: { userId: user.id } }),
    db.address.count({ where: { userId: user.id } }),
    db.favorite.count({ where: { userId: user.id } }),
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, number: true, status: true, total: true, createdAt: true, fulfillment: true, _count: { select: { items: true } } },
    }),
  ]);

  const stats = [
    { href: "/account/orders", icon: Receipt, label: t("account.orders"), value: orderCount },
    { href: "/account/addresses", icon: MapPin, label: t("account.addresses"), value: addressCount },
    { href: "/account/favorites", icon: Heart, label: t("account.favorites"), value: favoriteCount },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ href, icon: Icon, label, value }) => (
          <Link key={href} href={href} className="group rounded-[20px] border border-border bg-surface p-5 transition-colors hover:border-accent/50">
            <Icon className="size-5 text-accent" />
            <p className="mt-4 font-display text-3xl font-semibold">{value}</p>
            <p className="text-sm text-muted">{label}</p>
          </Link>
        ))}
      </div>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">{t("account.recentOrders")}</h2>
          {orderCount > 3 ? (
            <Link href="/account/orders" className="text-sm font-semibold text-accent hover:underline">
              {t("account.viewAll")}
            </Link>
          ) : null}
        </div>
        {recent.length ? (
          <OrderList orders={recent} />
        ) : (
          <EmptyState
            icon={<Receipt />}
            title={t("account.noOrders")}
            text={t("account.noOrdersText")}
            action={
              <Button asChild>
                <Link href="/menu">{t("cart.browse")}</Link>
              </Button>
            }
          />
        )}
      </section>
    </div>
  );
}
