"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Inbox, Bell, BellOff, Bike, ChefHat, Clock, LayoutDashboard, LogOut, Maximize, MessageSquare, Store, WifiOff } from "lucide-react";
import { toast } from "sonner";
import type { KitchenOrder } from "@/server/kitchen";
import { updateOrderStatus } from "@/actions/orders";
import { formatTime } from "@/lib/domain/money";
import { itemName, splitLocalized } from "@/lib/order-view";
import type { Locale } from "@/i18n/config";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Logo } from "@/components/store/logo";
import { LanguageSwitcher } from "@/components/store/language-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const POLL_MS = 5000;
const COLUMNS = [
  { status: "PENDING", key: "pending", accent: "border-t-warning" },
  { status: "CONFIRMED", key: "confirmed", accent: "border-t-info" },
  { status: "PREPARING", key: "preparing", accent: "border-t-accent" },
  { status: "READY", key: "ready", accent: "border-t-success" },
] as const;

/** Short two-tone chime generated with Web Audio (no audio asset needed). */
function chime(ctx: AudioContext) {
  const now = ctx.currentTime;
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.35, now + i * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.18);
    osc.stop(now + i * 0.18 + 0.4);
  });
}

export function KitchenBoard({
  initialOrders,
  role,
  userName,
  serverTime,
  preview = false,
  children,
}: {
  initialOrders: KitchenOrder[];
  role: string;
  userName: string;
  serverTime: string;
  /** No database: no polling, no actions, no sign-out. */
  preview?: boolean;
  children?: React.ReactNode;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [now, setNow] = useState(() => new Date(serverTime).getTime());
  const [lastSync, setLastSync] = useState<Date>(() => new Date(serverTime));
  const [offline, setOffline] = useState(false);
  const [sound, setSound] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const seen = useRef(new Set(initialOrders.map((o) => o.id)));
  const audio = useRef<AudioContext | null>(null);
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/kitchen/orders", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        router.replace("/login?next=/kitchen");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as { orders: KitchenOrder[] };
      const fresh = json.orders.filter((o) => !seen.current.has(o.id));
      for (const o of json.orders) seen.current.add(o.id);
      if (fresh.length) {
        if (soundRef.current && audio.current) chime(audio.current);
        for (const o of fresh) toast(t("kitchen.newOrder", { number: o.number }), { icon: <Bell className="size-4 text-accent" /> });
      }
      setOrders(json.orders);
      setOffline(false);
      setLastSync(new Date());
    } catch {
      setOffline(true);
    }
  }, [router, t]);

  useEffect(() => {
    if (preview) return;
    const p = setInterval(poll, POLL_MS);
    const c = setInterval(() => setNow(Date.now()), 15000);
    return () => {
      clearInterval(p);
      clearInterval(c);
    };
  }, [poll, preview]);

  function toggleSound() {
    if (!audio.current) audio.current = new AudioContext();
    void audio.current.resume();
    if (!sound) chime(audio.current);
    setSound((s) => !s);
  }

  function move(orderId: string, to: string) {
    setBusy(orderId);
    start(async () => {
      const res = await updateOrderStatus({ orderId, to });
      if (!res.ok) toast.error(t.has(`errors.${res.error}`) ? t(`errors.${res.error}`) : t("common.genericError"));
      await poll();
      setBusy(null);
    });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-4">
          <Logo />
          <span className="hidden items-center gap-2 font-display text-xl font-semibold sm:flex">
            <ChefHat className="size-5 text-accent" /> {t("kitchen.title")}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("flex items-center gap-1.5 text-[12px]", offline ? "text-danger" : "text-muted")} aria-live="polite">
            {preview ? (
              t("setup.previewRole")
            ) : offline ? (
              <>
                <WifiOff className="size-3.5" /> {t("kitchen.offline")}
              </>
            ) : (
              t("kitchen.lastSync", { time: formatTime(lastSync, locale) })
            )}
          </span>
          <Button variant={sound ? "default" : "outline"} size="sm" onClick={toggleSound} aria-pressed={sound} title={t("kitchen.enableSound")}>
            {sound ? <Bell /> : <BellOff />} {sound ? t("kitchen.soundOn") : t("kitchen.soundOff")}
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={t("kitchen.fullscreen")} onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)}>
            <Maximize />
          </Button>
          <LanguageSwitcher />
          {role !== "KITCHEN" ? (
            <Button asChild variant="ghost" size="icon-sm" aria-label={t("nav.admin")}>
              <Link href="/admin">
                <LayoutDashboard />
              </Link>
            </Button>
          ) : null}
          {preview ? null : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${t("nav.logout")} (${userName})`}
            onClick={async () => {
              await authClient.signOut();
              router.replace("/login");
            }}
          >
            <LogOut />
          </Button>
          )}
        </div>
      </header>
      {children}

      <div className="grid flex-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4 sm:p-6">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} aria-labelledby={`col-${col.key}`} className={cn("flex min-h-[200px] flex-col rounded-[20px] border border-t-4 border-border bg-surface/60", col.accent)}>
              <h2 id={`col-${col.key}`} className="flex items-center justify-between px-4 py-3 font-display text-lg font-semibold">
                {t(`kitchen.${col.key}`)}
                <span className="grid min-w-7 place-items-center rounded-full bg-surface-2 px-2 text-sm font-bold">{list.length}</span>
              </h2>
              <ul className="flex-1 space-y-3 overflow-y-auto px-3 pb-3">
                {list.length === 0 ? (
                  <li className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-2">
                    <Inbox className="size-7 opacity-60" aria-hidden />
                    {t("kitchen.empty")}
                  </li>
                ) : null}
                {list.map((o) => (
                  <OrderCard key={o.id} order={o} now={now} locale={locale} busy={busy === o.id} onMove={move} canDispatch={role === "ADMIN" || role === "MANAGER"} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  now,
  locale,
  busy,
  onMove,
  canDispatch,
}: {
  order: KitchenOrder;
  now: number;
  locale: Locale;
  busy: boolean;
  onMove: (id: string, to: string) => void;
  canDispatch: boolean;
}) {
  const t = useTranslations();
  const elapsed = Math.max(0, Math.floor((now - new Date(order.createdAt).getTime()) / 60000));
  const late = order.estimatedReadyAt ? now > new Date(order.estimatedReadyAt).getTime() && order.status !== "READY" : false;
  const urgency = late ? "danger" : elapsed >= 20 ? "warning" : "normal";

  const actions: { to: string; label: string }[] =
    order.status === "PENDING"
      ? [{ to: "CONFIRMED", label: t("kitchen.accept") }]
      : order.status === "CONFIRMED"
        ? [{ to: "PREPARING", label: t("kitchen.start") }]
        : order.status === "PREPARING"
          ? [{ to: "READY", label: t("kitchen.markReady") }]
          : canDispatch
            ? [order.fulfillment === "DELIVERY" ? { to: "OUT_FOR_DELIVERY", label: t("kitchen.sendOut") } : { to: "PICKED_UP", label: t("kitchen.handOver") }]
            : [];

  return (
    <li
      className={cn(
        "rounded-[16px] border bg-surface p-4 shadow-lg transition-colors",
        urgency === "danger" ? "border-danger/70" : urgency === "warning" ? "border-warning/60" : "border-border",
        order.status === "PENDING" && "animate-ring",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-semibold">{order.number.slice(-5)}</p>
          <p className="text-[12px] text-muted">{order.customerName}</p>
        </div>
        <div className="text-right">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold",
              urgency === "danger" ? "bg-danger/15 text-danger" : urgency === "warning" ? "bg-warning/15 text-warning" : "bg-surface-2 text-cream",
            )}
          >
            <Clock className="size-3" /> {t("kitchen.elapsed", { min: elapsed })}
          </span>
          <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted">
            {order.fulfillment === "DELIVERY" ? <Bike className="size-3" /> : <Store className="size-3" />}
            {order.fulfillment === "DELIVERY" ? t("kitchen.delivery") : t("kitchen.pickup")} · {formatTime(order.createdAt, locale)}
          </p>
          {late ? <p className="text-[11px] font-bold text-danger">{t("kitchen.late")}</p> : null}
        </div>
      </div>
      <ul className="mt-3 space-y-2 border-t border-border pt-3">
        {order.items.map((it) => (
          <li key={it.id} className="text-[15px]">
            <span className="font-bold text-accent">{it.quantity}×</span> <span className="font-semibold">{itemName(it, locale)}</span>
            {it.variantName ? <span className="text-muted"> · {splitLocalized(it.variantName, locale)}</span> : null}
            {it.modifiers.length ? (
              <ul className="mt-0.5 ml-6 list-disc text-[13px] text-muted">
                {it.modifiers.map((m) => (
                  <li key={m.id}>{splitLocalized(m.name, locale)}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      {order.comment ? (
        <p className="mt-3 flex gap-2 rounded-[10px] bg-warning/10 p-2.5 text-[13px] text-warning">
          <MessageSquare className="mt-0.5 size-3.5 shrink-0" />
          <span>
            <span className="font-bold">{t("kitchen.comment")}:</span> {order.comment}
          </span>
        </p>
      ) : null}
      {actions.length ? (
        <div className="mt-3 flex gap-2">
          {actions.map((a) => (
            <Button key={a.to} className="h-12 flex-1 text-[15px]" disabled={busy} onClick={() => onMove(order.id, a.to)}>
              {a.label}
            </Button>
          ))}
        </div>
      ) : null}
    </li>
  );
}
