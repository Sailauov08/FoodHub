"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { demoSignIn } from "@/actions/demo";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

export type DemoRole = "ADMIN" | "MANAGER" | "KITCHEN" | "CUSTOMER";

/** Switches the real server session to a demo account and opens that role's panel. */
export function useDemoSwitch() {
  const t = useTranslations();
  const router = useRouter();
  const [busy, setBusy] = useState<DemoRole | null>(null);
  // The sign-in happens in a server action, so the client session store must be refreshed explicitly.
  const { refetch } = authClient.useSession();

  async function switchTo(role: DemoRole) {
    setBusy(role);
    try {
      const res = await demoSignIn(role);
      if (!res.ok || !res.data) {
        toast.error(t.has(`errors.${res.ok ? "INTERNAL" : res.error}`) ? t(`errors.${res.ok ? "INTERNAL" : res.error}`) : t("common.genericError"));
        return;
      }
      await refetch();
      toast.success(t("demo.switched", { role: t(`roles.${role}`) }));
      router.replace(res.data.target);
      router.refresh();
    } catch {
      toast.error(t("common.networkError"));
    } finally {
      setBusy(null);
    }
  }

  return { switchTo, busy };
}
