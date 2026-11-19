"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateOrderStatus } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/form-controls";

export function StatusActions({ orderId, next }: { orderId: string; next: string[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const forward = next.filter((s) => s !== "CANCELLED");

  function move(to: string, note?: string) {
    start(async () => {
      const res = await updateOrderStatus({ orderId, to, note });
      if (res.ok) toast.success(t("admin.statusUpdated"));
      else toast.error(t.has(`errors.${res.error}`) ? t(`errors.${res.error}`) : t("common.genericError"));
      router.refresh();
    });
  }

  if (!next.length) return <p className="text-sm text-muted">—</p>;

  return (
    <div className="flex flex-wrap gap-3">
      {forward.map((s) => (
        <Button key={s} onClick={() => move(s)} disabled={pending}>
          {t("admin.moveTo", { status: t(`status.${s}`) })}
          <ArrowRight />
        </Button>
      ))}
      {next.includes("CANCELLED") ? (
        <ConfirmDialog
          trigger={
            <Button variant="destructive" disabled={pending}>
              <XCircle /> {t("admin.cancelOrder")}
            </Button>
          }
          title={t("admin.cancelOrder")}
          description={t("common.irreversible")}
          confirmLabel={t("admin.cancelOrder")}
          cancelLabel={t("common.back")}
          onConfirm={() => move("CANCELLED", reason || undefined)}
        >
          <label htmlFor="cancel-reason" className="text-sm text-muted">
            {t("admin.cancelReason")}
          </label>
          <Input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
