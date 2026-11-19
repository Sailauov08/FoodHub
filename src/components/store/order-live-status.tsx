"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";

const TERMINAL = ["DELIVERED", "PICKED_UP", "CANCELLED"];

/** Polls the order status endpoint and refreshes the server-rendered page when it changes. */
export function OrderLiveStatus({ orderId, token, status, canCancel }: { orderId: string; token: string | null; status: string; canCancel: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const last = useRef(status);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    last.current = status;
  }, [status]);

  useEffect(() => {
    if (TERMINAL.includes(status)) return;
    const q = token ? `?t=${encodeURIComponent(token)}` : "";
    let stopped = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/orders/${orderId}${q}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { status: string };
        setOffline(false);
        if (!stopped && json.status !== last.current) {
          last.current = json.status;
          toast(t(`status.${json.status}`), { description: t(`statusHint.${json.status}`) });
          router.refresh();
        }
      } catch {
        setOffline(true);
      }
    };
    const id = setInterval(tick, 8000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [orderId, token, status, router, t]);

  async function cancel() {
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("order.cancelled"));
      router.refresh();
    } catch {
      toast.error(t("order.cancelFailed"));
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-3">
      {!TERMINAL.includes(status) ? (
        <span className={offline ? "text-[12px] text-warning" : "flex items-center gap-1.5 text-[12px] text-muted"}>
          {offline ? t("common.networkError") : (
            <>
              <RefreshCw className="size-3.5 animate-spin [animation-duration:3s]" /> {t("order.liveUpdates")}
            </>
          )}
        </span>
      ) : null}
      {canCancel ? (
        <ConfirmDialog
          trigger={
            <Button variant="destructive" size="sm">
              {t("order.cancel")}
            </Button>
          }
          title={t("order.cancelConfirm")}
          description={t("order.cancelText")}
          confirmLabel={t("order.cancel")}
          cancelLabel={t("common.back")}
          onConfirm={cancel}
        />
      ) : null}
    </div>
  );
}
