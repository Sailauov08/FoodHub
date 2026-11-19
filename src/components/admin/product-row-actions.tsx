"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Archive } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { archiveProduct, setProductAvailability } from "@/actions/admin";
import { Switch } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";

export function AvailabilityToggle({ id, isAvailable, label }: { id: string; isAvailable: boolean; label: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(isAvailable);
  return (
    <Switch
      checked={optimistic}
      disabled={pending}
      aria-label={`${t("admin.available")}: ${label}`}
      onCheckedChange={(v) =>
        start(async () => {
          setOptimistic(v);
          const res = await setProductAvailability(id, v);
          if (!res.ok) toast.error(t.has(`errors.${res.error}`) ? t(`errors.${res.error}`) : t("common.genericError"));
          router.refresh();
        })
      }
    />
  );
}

export function ArchiveProductButton({ id }: { id: string }) {
  const t = useTranslations();
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={t("admin.archive")} className="text-muted hover:text-danger">
          <Archive />
        </Button>
      }
      title={t("admin.archive")}
      description={t("admin.archiveConfirm")}
      confirmLabel={t("admin.archive")}
      cancelLabel={t("common.cancel")}
      onConfirm={async () => {
        const res = await archiveProduct(id);
        if (res.ok) toast.success(t("admin.archived"));
        else toast.error(t.has(`errors.${res.error}`) ? t(`errors.${res.error}`) : t("common.genericError"));
        router.refresh();
      }}
    />
  );
}
