import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/session";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { OrderList } from "@/components/store/order-list";
import { isPreview } from "@/lib/preview";

const PAGE_SIZE = 10;

export default async function AccountOrders({ params, searchParams }: PageProps<"/[locale]/account/orders">) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Preview mode: the layout shows a setup-required screen; never touch the database here.
  if (isPreview) return null;
  const user = await requirePageRole("ANY", "/account/orders");
  const t = await getTranslations();
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const [total, orders] = await Promise.all([
    db.order.count({ where: { userId: user.id } }),
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, number: true, status: true, total: true, createdAt: true, fulfillment: true, _count: { select: { items: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section>
      <h2 className="mb-4 font-display text-2xl font-semibold">{t("account.orders")}</h2>
      {orders.length ? (
        <>
          <OrderList orders={orders} />
          {pages > 1 ? (
            <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
              <Button asChild variant="outline" size="sm" className={page <= 1 ? "pointer-events-none opacity-40" : ""}>
                <Link href={`/account/orders?page=${page - 1}`} aria-disabled={page <= 1}>
                  <ChevronLeft /> {t("common.previous")}
                </Link>
              </Button>
              <span className="text-sm text-muted">{t("common.page", { page, pages })}</span>
              <Button asChild variant="outline" size="sm" className={page >= pages ? "pointer-events-none opacity-40" : ""}>
                <Link href={`/account/orders?page=${page + 1}`} aria-disabled={page >= pages}>
                  {t("common.next")} <ChevronRight />
                </Link>
              </Button>
            </nav>
          ) : null}
        </>
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
  );
}
