import { getTranslations, setRequestLocale } from "next-intl/server";
import { Ban, Banknote, BarChart3, Percent, Receipt, ShoppingBag } from "lucide-react";
import { getAnalytics, parseRange, toDateInput } from "@/server/analytics";
import { formatKzt } from "@/lib/domain/money";
import type { Locale } from "@/i18n/config";
import { PageHeader, StatCard } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/misc";
import { AnalyticsFilters } from "@/components/admin/analytics-filters";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { isPreview } from "@/lib/preview";

export default async function AdminAnalytics({ params, searchParams }: PageProps<"/[locale]/admin/analytics">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  // Preview mode: the layout shows a setup-required screen; never touch the database here.
  if (isPreview) return null;
  const t = await getTranslations();
  const sp = await searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const range = parseRange({ from: str(sp.from), to: str(sp.to), g: str(sp.g) });
  const data = await getAnalytics(range);
  const fmt = (n: number) => formatKzt(n, locale);
  const from = toDateInput(range.from);
  const to = toDateInput(new Date(range.to.getTime() - 86400000));
  const hasData = data.kpis.ordersPlaced > 0 || data.kpis.paidOrders > 0;

  return (
    <div>
      <PageHeader title={t("admin.analytics")} description={t("admin.revenueRule")} />
      <AnalyticsFilters from={from} to={to} granularity={range.granularity} />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label={t("admin.paidRevenue")} value={fmt(data.kpis.revenue)} icon={<Banknote />} />
        <StatCard label={t("admin.paidOrders")} value={String(data.kpis.paidOrders)} icon={<Receipt />} />
        <StatCard label={t("admin.aov")} value={data.kpis.paidOrders ? fmt(data.kpis.averageOrderValue) : "—"} icon={<BarChart3 />} />
        <StatCard label={t("admin.ordersPlaced")} value={String(data.kpis.ordersPlaced)} icon={<ShoppingBag />} />
        <StatCard label={t("admin.cancelledOrders")} value={String(data.kpis.cancelled)} icon={<Ban />} />
        <StatCard label={t("admin.discountsGiven")} value={fmt(data.kpis.discounts)} icon={<Percent />} />
      </div>
      {hasData ? (
        <AnalyticsCharts data={data} granularity={range.granularity} />
      ) : (
        <EmptyState className="mt-8" icon={<BarChart3 />} title={t("admin.noData")} text={t("admin.noDataText")} />
      )}
    </div>
  );
}
