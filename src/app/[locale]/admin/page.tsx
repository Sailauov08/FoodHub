import { getTranslations, setRequestLocale } from "next-intl/server";
import { Activity, Banknote, Receipt, ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";
import { getRestaurant } from "@/server/restaurant";
import { startOfTodayAlmaty } from "@/server/analytics";
import { formatDateTime, formatKzt } from "@/lib/domain/money";
import { STATUS_VARIANT } from "@/lib/order-view";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { PageHeader, StatCard, TableWrap } from "@/components/admin/ui";
import { Badge, EmptyState } from "@/components/ui/misc";
import { maskName } from "@/lib/demo";
import { getSessionUser } from "@/lib/session";
import { isPreview } from "@/lib/preview";

export default async function AdminDashboard({ params }: PageProps<"/[locale]/admin">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  // Preview mode: the layout shows a setup-required screen; never touch the database here.
  if (isPreview) return null;
  const t = await getTranslations();
  const r = await getRestaurant();
  const masked = !!(await getSessionUser())?.isDemo;
  const today = startOfTodayAlmaty();
  const fmt = (n: number) => formatKzt(n, locale);

  const [paidToday, ordersToday, active, recent] = await Promise.all([
    db.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: today }, order: { restaurantId: r.id } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.order.count({ where: { restaurantId: r.id, createdAt: { gte: today } } }),
    db.order.count({ where: { restaurantId: r.id, status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] } } }),
    db.order.findMany({
      where: { restaurantId: r.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, number: true, customerName: true, total: true, status: true, fulfillment: true, createdAt: true },
    }),
  ]);
  const revenue = paidToday._sum.amount ?? 0;
  const paidCount = paidToday._count._all;

  return (
    <div>
      <PageHeader title={t("admin.dashboard")} description={t("admin.revenueRule")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("admin.revenueToday")} value={fmt(revenue)} icon={<Banknote />} />
        <StatCard label={t("admin.ordersToday")} value={String(ordersToday)} icon={<ShoppingBag />} />
        <StatCard label={t("admin.activeOrders")} value={String(active)} icon={<Activity />} />
        <StatCard label={t("admin.aovToday")} value={paidCount ? fmt(Math.round(revenue / paidCount)) : "—"} icon={<Receipt />} />
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">{t("admin.recentOrders")}</h2>
          <Link href="/admin/orders" className="text-sm font-semibold text-accent hover:underline">
            {t("account.viewAll")}
          </Link>
        </div>
        {recent.length ? (
          <TableWrap>
            <thead>
              <tr>
                <th>{t("admin.number")}</th>
                <th>{t("admin.date")}</th>
                <th>{t("admin.customer")}</th>
                <th>{t("admin.type")}</th>
                <th>{t("admin.status")}</th>
                <th className="text-right">{t("admin.total")}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold text-accent hover:underline">
                      {o.number}
                    </Link>
                  </td>
                  <td className="text-muted">{formatDateTime(o.createdAt, locale)}</td>
                  <td>{masked ? maskName(o.customerName) : o.customerName}</td>
                  <td>{t(`fulfillment.${o.fulfillment}`)}</td>
                  <td>
                    <Badge variant={STATUS_VARIANT[o.status]}>{t(`status.${o.status}`)}</Badge>
                  </td>
                  <td className="text-right font-semibold tabular-nums">{fmt(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : (
          <EmptyState icon={<Receipt />} title={t("admin.noOrders")} text={t("admin.noOrdersText")} />
        )}
      </section>
    </div>
  );
}
