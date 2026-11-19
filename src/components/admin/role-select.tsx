"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { setUserRole } from "@/actions/admin";
import { NativeSelect } from "@/components/ui/form-controls";

export function RoleSelect({ userId, role, label }: { userId: string; role: string; label: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <NativeSelect
      aria-label={`${t("admin.changeRole")}: ${label}`}
      defaultValue={role}
      disabled={pending}
      className="h-9 w-40 text-sm"
      onChange={(e) => {
        const next = e.target.value;
        if (!window.confirm(`${t("admin.changeRole")} → ${t(`roles.${next}`)}?`)) {
          e.target.value = role;
          return;
        }
        start(async () => {
          const res = await setUserRole(userId, next);
          if (res.ok) toast.success(t("admin.roleUpdated"));
          else toast.error(t.has(`errors.${res.error}`) ? t(`errors.${res.error}`) : t("common.genericError"));
          router.refresh();
        });
      }}
    >
      {(["CUSTOMER", "KITCHEN", "MANAGER", "ADMIN"] as const).map((r) => (
        <option key={r} value={r}>
          {t(`roles.${r}`)}
        </option>
      ))}
    </NativeSelect>
  );
}
