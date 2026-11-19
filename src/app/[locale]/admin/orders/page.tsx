import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getRestaurant } from "@/server/restaurant";
import { ORDER_STATUSES, type OrderStatusValue } from "@/lib/domain/order-status";
import { formatDateTime, formatKzt } from "@/lib/domain/money";
import { formatKzPhone, normalizeKzPhone } from "@/lib/domain/phone";
import { maskName, maskPhone } from "@/lib/demo";
import { getSessionUser } from "@/lib/session";
import { STATUS_VARIANT } from "@/lib/order-view";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { PageHeader, TableWrap } from "@/components/admin/ui";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { OrdersFilter } from "@/components/admin/orders-filter";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { isPreview } from "@/lib/preview";

const PAGE_SIZE = 25;

export default async function AdminOrders({ params, searchParams }: PageProps<"/[locale]/admin/orders">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  // Preview mode: the layout shows a setup-required screen; never touch the database here.
  if (isPreview) return null;
  const t = await getTranslations();
  const sp = await searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const statusParam = str(sp.status);
  const status = ORDER_STATUSES.includes(statusParam as OrderStatusValue) ? (statusParam as OrderStatusValue) : undefined;
  const q = str(sp.q)?.trim().slice(0, 60);
  const page = Math.max(1, Number.parseInt(str(sp.page) ?? "1", 10) || 1);
  const r = await getRestaurant();
  const masked = !!(await getSessionUser())?.isDemo;

  const phone = q ? normalizeKzPhone(q) : null;
  const where: Prisma.OrderWhereInput = {
    restaurantId: r.id,
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { customerName: { contains: q, mode: "insensitive" } },
            ...(phone ? [{ customerPhone: phone }] : []),
          ],
        }
      : {}),
  };
  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, number: true, customerName: true, customerPhone: true, total: true, status: true, fulfillment: true, createdAt: true, _count: { select: { items: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const s = new URLSearchParams();
    if (status) s.set("status", status);
    if (q) s.set("q", q);
    s.set("page", String(p));
    return `/admin/orders?${s.toString()}`;
  };

  return (
    <div>
      <PageHeader title={t("admin.orders")} actions={<AutoRefresh seconds={20} renderedAt={new Date().toISOString()} />} />
      <OrdersFilter status={status ?? ""} q={q ?? ""} />
      {orders.length ? (
        <>
          <TableWrap className="mt-6">
            <thead>
              <tr>
                <th>{t("admin.number")}</th>
                <th>{t("admin.date")}</th>
                <th>{t("admin.customer")}</th>
                <th>{t("admin.type")}</th>
                <th>{t("admin.items")}</th>
                <th>{t("admin.status")}</th>
                <th className="text-right">{t("admin.total")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold text-accent hover:underline">
                      {o.number}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-muted">{formatDateTime(o.createdAt, locale)}</td>
                  <td>
                    <span className="block">{masked ? maskName(o.customerName) : o.customerName}</span>
                    <span className="text-[12px] text-muted">{masked ? maskPhone(o.customerPhone) : formatKzPhone(o.customerPhone)}</span>
                  </td>
                  <td>{t(`fulfillment.${o.fulfillment}`)}</td>
                  <td>{o._count.items}</td>
                  <td>
                    <Badge variant={STATUS_VARIANT[o.status]}>{t(`status.${o.status}`)}</Badge>
                  </td>
                  <td className="text-right font-semibold tabular-nums">{formatKzt(o.total, locale)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          {pages > 1 ? (
            <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
              <Button asChild variant="outline" size="sm" className={page <= 1 ? "pointer-events-none opacity-40" : ""}>
                <Link href={qs(page - 1)}>
                  <ChevronLeft /> {t("common.previous")}
                </Link>
              </Button>
              <span className="text-sm text-muted">{t("common.page", { page, pages })}</span>
              <Button asChild variant="outline" size="sm" className={page >= pages ? "pointer-events-none opacity-40" : ""}>
                <Link href={qs(page + 1)}>
                  {t("common.next")} <ChevronRight />
                </Link>
              </Button>
            </nav>
          ) : null}
        </>
      ) : (
        <EmptyState className="mt-6" icon={<Receipt />} title={t("admin.noOrders")} text={t("admin.noOrdersText")} />
      )}
    </div>
  );
}
