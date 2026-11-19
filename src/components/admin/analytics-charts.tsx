"use client";

import { useLocale, useTranslations } from "next-intl";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalyticsData, Granularity } from "@/server/analytics";
import { formatKzt, formatNumber, formatShortDate } from "@/lib/domain/money";
import type { Locale } from "@/i18n/config";
import { Card } from "@/components/ui/misc";
import { TableWrap } from "@/components/admin/ui";

const ACCENT = "#ff6b35";
const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f5b544",
  CONFIRMED: "#5aa9ff",
  PREPARING: "#ff6b35",
  READY: "#3ecf8e",
  OUT_FOR_DELIVERY: "#8b7cff",
  DELIVERED: "#a8a29a",
  PICKED_UP: "#d6d0c8",
  CANCELLED: "#ff5d5d",
};
const axis = { stroke: "#7c7770", fontSize: 12, tickLine: false, axisLine: false } as const;
const tooltipStyle = { background: "#20242d", border: "1px solid rgba(255,248,240,.12)", borderRadius: 12, color: "#fff8f0" };

export function AnalyticsCharts({ data, granularity }: { data: AnalyticsData; granularity: Granularity }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const label = (iso: string) => formatShortDate(`${iso}T12:00:00+05:00`, locale, granularity === "month");
  // Axis ticks: 12 500 → 12.5K style without locale-dependent Intl output.
  const compact = (n: number) => (n >= 1_000_000 ? `${formatNumber(n / 1_000_000, locale)}M` : n >= 1000 ? `${formatNumber(n / 1000, locale)}K` : String(n));

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <Card className="p-6 xl:col-span-2">
        <h2 className="font-display text-xl font-semibold">{t("admin.revenueOverTime")}</h2>
        <div className="mt-4 h-72">
          {data.revenueSeries.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueSeries} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,248,240,.06)" vertical={false} />
                <XAxis dataKey="bucket" tickFormatter={label} {...axis} />
                <YAxis tickFormatter={compact} width={48} {...axis} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => label(String(v))} formatter={(v, n) => (n === "revenue" ? [formatKzt(Number(v), locale), t("admin.revenue")] : [String(v), t("admin.orders_")])} />
                <Area type="monotone" dataKey="revenue" stroke={ACCENT} strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="grid h-full place-items-center text-sm text-muted">{t("admin.noData")}</p>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-xl font-semibold">{t("admin.ordersByStatus")}</h2>
        <div className="mt-4 grid items-center gap-4 sm:grid-cols-[200px_1fr]">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.statusDistribution} dataKey="count" nameKey="status" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none">
                  {data.statusDistribution.map((s) => (
                    <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? ACCENT} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [String(v), t(`status.${String(n)}`)]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-2 text-sm">
            {data.statusDistribution.map((s) => (
              <li key={s.status} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: STATUS_COLORS[s.status] }} />
                  {t(`status.${s.status}`)}
                </span>
                <span className="font-semibold tabular-nums">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-xl font-semibold">{t("admin.peakHours")}</h2>
        <div className="mt-4 h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.peakHours} margin={{ left: 0, right: 0, top: 8 }}>
              <CartesianGrid stroke="rgba(255,248,240,.06)" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={(h) => `${h}`} interval={2} {...axis} />
              <YAxis allowDecimals={false} width={32} {...axis} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,.04)" }} labelFormatter={(h) => `${String(h).padStart(2, "0")}:00`} formatter={(v) => [String(v), t("admin.orders_")]} />
              <Bar dataKey="orders" fill={ACCENT} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="xl:col-span-1">
        <h2 className="mb-3 font-display text-xl font-semibold">{t("admin.topItems")}</h2>
        <TableWrap>
          <thead>
            <tr>
              <th>{t("admin.name")}</th>
              <th className="text-right">{t("admin.qty")}</th>
              <th className="text-right">{t("admin.revenue")}</th>
            </tr>
          </thead>
          <tbody>
            {data.topItems.length ? (
              data.topItems.map((i) => (
                <tr key={i.productId ?? i.nameEn}>
                  <td>{locale === "kk" ? i.nameKk : locale === "ru" ? i.nameRu : i.nameEn}</td>
                  <td className="text-right tabular-nums">{formatNumber(i.quantity, locale)}</td>
                  <td className="text-right tabular-nums">{formatKzt(i.revenue, locale)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center text-muted">{t("admin.noData")}</td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      </div>

      <div className="xl:col-span-1">
        <h2 className="mb-3 font-display text-xl font-semibold">{t("admin.couponUsage")}</h2>
        <TableWrap>
          <thead>
            <tr>
              <th>{t("admin.code")}</th>
              <th className="text-right">{t("admin.uses")}</th>
              <th className="text-right">{t("admin.discountsGiven")}</th>
            </tr>
          </thead>
          <tbody>
            {data.coupons.length ? (
              data.coupons.map((c) => (
                <tr key={c.code}>
                  <td className="font-mono font-bold">{c.code}</td>
                  <td className="text-right tabular-nums">{c.uses}</td>
                  <td className="text-right tabular-nums">{formatKzt(c.discount, locale)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center text-muted">{t("admin.noData")}</td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      </div>
    </div>
  );
}
