import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { orderDetailInclude } from "@/server/orders";
import { getRestaurant } from "@/server/restaurant";
import { nextStatuses } from "@/lib/domain/order-status";
import { formatDateTime, formatKzt } from "@/lib/domain/money";
import { formatKzPhone } from "@/lib/domain/phone";
import { maskAddress, maskEmail, maskName, maskPhone } from "@/lib/demo";
import { itemName, splitLocalized, STATUS_VARIANT } from "@/lib/order-view";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { Badge, Card } from "@/components/ui/misc";
import { StatusActions } from "@/components/admin/status-actions";
import { isPreview } from "@/lib/preview";

export default async function AdminOrderDetail({ params }: PageProps<"/[locale]/admin/orders/[id]">) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  // Preview mode: the layout shows a setup-required screen; never touch the database here.
  if (isPreview) return null;
  const t = await getTranslations();
  const viewer = await getSessionUser();
  const r = await getRestaurant();
  const order = await db.order.findFirst({ where: { id, restaurantId: r.id }, include: { ...orderDetailInclude, statusHistory: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } } } });
  if (!order || !viewer) notFound();
  const fmt = (n: number) => formatKzt(n, locale);
  const next = nextStatuses(order.status, order.fulfillment, viewer.role);

  return (
    <div>
      <Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm text-muted hover:text-cream">
        <ArrowLeft className="size-4" /> {t("admin.orders")}
      </Link>
      <div className="mt-4 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{order.number}</h1>
          <p className="mt-1 text-sm text-muted">{formatDateTime(order.createdAt, locale)}</p>
        </div>
        <Badge variant={STATUS_VARIANT[order.status]} className="px-4 py-1.5 text-sm">
          {t(`status.${order.status}`)}
        </Badge>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card className="p-6">
            <StatusActions orderId={order.id} next={next} />
          </Card>
          <Card className="p-6">
            <h2 className="font-display text-xl font-semibold">{t("order.items")}</h2>
            <ul className="mt-4 divide-y divide-border">
              {order.items.map((it) => (
                <li key={it.id} className="flex justify-between gap-4 py-3">
                  <div>
                    <p className="font-semibold">
                      {it.quantity} × {itemName(it, locale)}
                    </p>
                    <p className="text-[13px] text-muted">
                      {[splitLocalized(it.variantName, locale), ...it.modifiers.map((m) => splitLocalized(m.name, locale))].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">{fmt(it.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">{t("cart.subtotal")}</dt><dd>{fmt(order.subtotal)}</dd></div>
              {order.discount ? <div className="flex justify-between"><dt className="text-muted">{t("cart.discount")} {order.couponCode}</dt><dd className="text-success">−{fmt(order.discount)}</dd></div> : null}
              <div className="flex justify-between"><dt className="text-muted">{t("cart.delivery")}</dt><dd>{fmt(order.deliveryFee)}</dd></div>
              <div className="flex justify-between text-base font-semibold"><dt>{t("cart.total")}</dt><dd>{fmt(order.total)}</dd></div>
            </dl>
          </Card>
          {order.comment ? (
            <Card className="border-warning/30 p-6">
              <h2 className="font-semibold text-warning">{t("order.comment")}</h2>
              <p className="mt-2">{order.comment}</p>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="space-y-3 p-6 text-sm">
            <h2 className="font-display text-xl font-semibold">{t("admin.customerContact")}</h2>
            <p className="font-semibold">{viewer.isDemo ? maskName(order.customerName) : order.customerName}</p>
            {viewer.isDemo ? (
              <p className="text-accent">{maskPhone(order.customerPhone)}</p>
            ) : (
              <a href={`tel:${order.customerPhone}`} className="block text-accent hover:underline">{formatKzPhone(order.customerPhone)}</a>
            )}
            {order.customerEmail ? <p className="text-muted">{viewer.isDemo ? maskEmail(order.customerEmail) : order.customerEmail}</p> : null}
            <p className="border-t border-border pt-3">
              <span className="text-muted">{t("order.fulfillment")}: </span>
              {t(`fulfillment.${order.fulfillment}`)}
            </p>
            {order.addressStreet ? (
              <p>
                <span className="text-muted">{t("admin.deliveryAddress")}: </span>
                {viewer.isDemo
                  ? maskAddress(order.addressStreet)
                  : [order.addressStreet, order.addressApartment && `${t("checkout.apartment")} ${order.addressApartment}`, order.addressEntrance && `${t("checkout.entrance")} ${order.addressEntrance}`, order.addressFloor && `${t("checkout.floor")} ${order.addressFloor}`].filter(Boolean).join(", ")}
                {order.addressNotes && !viewer.isDemo ? <span className="mt-1 block text-muted">{order.addressNotes}</span> : null}
              </p>
            ) : null}
            <p>
              <span className="text-muted">{t("order.paymentMethod")}: </span>
              {order.payment ? t(`payment.${order.payment.method}`) : "—"} · {order.payment ? t(`payment.${order.payment.status}`) : ""}
            </p>
          </Card>
          <Card className="p-6">
            <h2 className="font-display text-xl font-semibold">{t("admin.history")}</h2>
            <ol className="mt-4 space-y-3 text-sm">
              {order.statusHistory.map((h) => (
                <li key={h.id} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                  <div>
                    <p className="font-semibold">{t(`status.${h.to}`)}</p>
                    <p className="text-[12px] text-muted">
                      {formatDateTime(h.createdAt, locale)} · {h.actor?.name ?? t(`roles.${h.actorRole}`)} ({t(`roles.${h.actorRole}`)})
                    </p>
                    {h.note ? <p className="text-[12px] text-muted-2">{h.note}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
