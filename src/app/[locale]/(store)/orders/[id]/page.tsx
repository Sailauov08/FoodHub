import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2, FileQuestion, MapPin, MessageSquare, Phone, Store } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { getOrderForViewer } from "@/server/orders";
import { formatDateTime, formatKzt, formatTime } from "@/lib/domain/money";
import { formatKzPhone } from "@/lib/domain/phone";
import { timelineFor } from "@/lib/domain/order-status";
import { itemName, splitLocalized, STATUS_VARIANT } from "@/lib/order-view";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { OrderLiveStatus } from "@/components/store/order-live-status";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/orders/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "order" });
  return { title: t("timeline"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function OrderPage({ params, searchParams }: PageProps<"/[locale]/orders/[id]">) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : null;
  const isNew = sp.new === "1";
  const t = await getTranslations();
  const viewer = await getSessionUser();
  const found = await getOrderForViewer(id, viewer, token);

  if (!found) {
    return (
      <div className="container-page pt-32 lg:pt-40">
        <EmptyState
          headingLevel="h1"
          icon={<FileQuestion />}
          title={t("order.notFound")}
          text={t("order.notFoundText")}
          action={
            <Button asChild>
              <Link href="/menu">{t("order.backToMenu")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { order } = found;
  const fmt = (n: number) => formatKzt(n, locale);
  const steps = timelineFor(order.fulfillment);
  const reached = new Map(order.statusHistory.map((h) => [h.to, h.createdAt]));
  const currentIdx = steps.indexOf(order.status as (typeof steps)[number]);
  const cancelled = order.status === "CANCELLED";

  return (
    <div className="container-page pt-32 lg:pt-40">
      {isNew ? (
        <div className="mb-8 flex items-start gap-4 rounded-[22px] border border-success/30 bg-success/10 p-5">
          <CheckCircle2 className="mt-0.5 size-7 shrink-0 text-success" />
          <div>
            <p className="font-display text-2xl font-semibold">{t("checkout.successTitle")}</p>
            <p className="mt-1 text-sm text-muted">{t("checkout.trackingSaved")}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{t("order.placedAt", { date: formatDateTime(order.createdAt, locale) })}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{t("order.title", { number: order.number })}</h1>
        </div>
        <Badge variant={STATUS_VARIANT[order.status]} className="px-4 py-1.5 text-sm">
          {t(`status.${order.status}`)}
        </Badge>
      </div>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          <section className="rounded-[24px] border border-border bg-surface p-6 sm:p-8" aria-labelledby="timeline-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="timeline-title" className="font-display text-2xl font-semibold">{t("order.timeline")}</h2>
              <OrderLiveStatus orderId={order.id} token={token} status={order.status} canCancel={order.status === "PENDING"} />
            </div>
            <p className="mt-2 text-muted">{t(`statusHint.${order.status}`)}</p>
            {order.estimatedReadyAt && !cancelled && currentIdx < steps.indexOf("READY") ? (
              <p className="mt-1 text-sm text-accent">{t("order.eta", { time: formatTime(order.estimatedReadyAt, locale) })}</p>
            ) : null}

            {cancelled ? null : (
              <ol className="mt-8 grid gap-0 sm:grid-cols-[repeat(var(--n),minmax(0,1fr))]" style={{ ["--n" as string]: steps.length }}>
                {steps.map((s, i) => {
                  const done = i <= currentIdx;
                  const current = i === currentIdx;
                  const at = reached.get(s);
                  return (
                    <li key={s} className="relative flex gap-4 pb-6 sm:flex-col sm:gap-3 sm:pb-0">
                      <span className={cn("absolute top-8 left-[15px] h-[calc(100%-1.5rem)] w-0.5 sm:top-[15px] sm:left-8 sm:h-0.5 sm:w-[calc(100%-2rem)]", i === steps.length - 1 && "hidden", i < currentIdx ? "bg-accent" : "bg-surface-3")} />
                      <span
                        className={cn(
                          "relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 text-[12px] font-bold",
                          done ? "border-accent bg-accent text-accent-foreground" : "border-surface-3 bg-surface text-muted-2",
                          current && "animate-ring",
                        )}
                        aria-current={current ? "step" : undefined}
                      >
                        {i + 1}
                      </span>
                      <span>
                        <span className={cn("block text-sm font-semibold", done ? "text-cream" : "text-muted-2")}>{t(`status.${s}`)}</span>
                        {at ? <span className="text-[12px] text-muted">{formatTime(at, locale)}</span> : null}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="rounded-[24px] border border-border bg-surface p-6 sm:p-8" aria-labelledby="items-title">
            <h2 id="items-title" className="font-display text-2xl font-semibold">{t("order.items")}</h2>
            <ul className="mt-6 divide-y divide-border">
              {order.items.map((it) => (
                <li key={it.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-[12px] bg-surface-2">
                    {it.imageUrl ? <Image src={it.imageUrl} alt="" fill sizes="64px" className="object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {it.quantity} × {itemName(it, locale)}
                    </p>
                    <p className="text-[13px] text-muted">
                      {[splitLocalized(it.variantName, locale), ...it.modifiers.map((m) => splitLocalized(m.name, locale))].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums">{fmt(it.lineTotal)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-5 rounded-[24px] border border-border bg-surface p-6 lg:sticky lg:top-28">
          <h2 className="font-display text-xl font-semibold">{t("order.details")}</h2>
          <dl className="space-y-4 text-sm">
            <div className="flex gap-3">
              {order.fulfillment === "DELIVERY" ? <MapPin className="size-4 shrink-0 text-accent" /> : <Store className="size-4 shrink-0 text-accent" />}
              <div>
                <dt className="text-muted">{t("order.fulfillment")}</dt>
                <dd className="font-medium">{t(`fulfillment.${order.fulfillment}`)}</dd>
                {order.addressStreet ? (
                  <dd className="mt-1 text-muted">
                    {[order.addressStreet, order.addressApartment && `${t("checkout.apartment")} ${order.addressApartment}`, order.addressEntrance && `${t("checkout.entrance")} ${order.addressEntrance}`, order.addressFloor && `${t("checkout.floor")} ${order.addressFloor}`]
                      .filter(Boolean)
                      .join(", ")}
                  </dd>
                ) : null}
              </div>
            </div>
            <div className="flex gap-3">
              <Phone className="size-4 shrink-0 text-accent" />
              <div>
                <dt className="text-muted">{t("order.customer")}</dt>
                <dd className="font-medium">
                  {order.customerName} · {formatKzPhone(order.customerPhone)}
                </dd>
              </div>
            </div>
            {order.comment ? (
              <div className="flex gap-3">
                <MessageSquare className="size-4 shrink-0 text-accent" />
                <div>
                  <dt className="text-muted">{t("order.comment")}</dt>
                  <dd>{order.comment}</dd>
                </div>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-4">
              <dt className="text-muted">{t("order.paymentMethod")}</dt>
              <dd className="text-right font-medium">{order.payment ? t(`payment.${order.payment.method}`) : "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{t("order.paymentStatus")}</dt>
              <dd className="font-medium">{order.payment ? t(`payment.${order.payment.status}`) : "—"}</dd>
            </div>
          </dl>
          <div className="space-y-2 border-t border-border pt-4 text-[15px]">
            <div className="flex justify-between">
              <span className="text-muted">{t("cart.subtotal")}</span>
              <span className="tabular-nums">{fmt(order.subtotal)}</span>
            </div>
            {order.discount > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted">
                  {t("cart.discount")}
                  {order.couponCode ? ` · ${order.couponCode}` : ""}
                </span>
                <span className="text-success tabular-nums">−{fmt(order.discount)}</span>
              </div>
            ) : null}
            {order.fulfillment === "DELIVERY" ? (
              <div className="flex justify-between">
                <span className="text-muted">{t("cart.delivery")}</span>
                <span className="tabular-nums">{order.deliveryFee ? fmt(order.deliveryFee) : t("cart.free")}</span>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <span className="font-semibold">{t("cart.total")}</span>
              <span className="font-display text-2xl font-semibold">{fmt(order.total)}</span>
            </div>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href="/menu">{t("order.orderAgain")}</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
