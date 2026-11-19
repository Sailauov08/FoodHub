"use client";

import { useTranslations } from "next-intl";
import { ChefHat, Crown, Loader2, ShieldCheck, User } from "lucide-react";
import { useDemoSwitch, type DemoRole } from "@/components/demo/use-demo-switch";
import { cn } from "@/lib/utils";

export const DEMO_ICONS: Record<DemoRole, typeof Crown> = { ADMIN: Crown, MANAGER: ShieldCheck, KITCHEN: ChefHat, CUSTOMER: User };

/** One-click sign-in for the public showcase accounts; the shared password stays on the server. */
export function DemoAccounts({ roles }: { roles: readonly DemoRole[] }) {
  const t = useTranslations();
  const { switchTo, busy } = useDemoSwitch();

  return (
    <section aria-labelledby="demo-title" className="rounded-[24px] border border-accent/30 bg-[radial-gradient(500px_200px_at_100%_0%,rgb(255_107_53/0.12),transparent_70%)] bg-surface p-6 sm:p-7">
      <h2 id="demo-title" className="font-display text-2xl font-semibold">
        {t("auth.demoTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("auth.demoText")}</p>
      <ul className="mt-5 grid gap-2.5">
        {roles.map((role) => {
          const Icon = DEMO_ICONS[role];
          return (
            <li key={role}>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => switchTo(role)}
                aria-label={t("auth.demoSignIn", { role: t(`roles.${role}`) })}
                className={cn(
                  "group flex w-full items-center gap-3.5 rounded-[14px] border border-border-strong bg-background/40 px-4 py-3 text-left transition-colors hover:border-accent/60 disabled:opacity-60",
                  busy === role && "border-accent",
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  {busy === role ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{t(`roles.${role}`)}</span>
                  <span className="block truncate text-[12.5px] text-muted">{t(`roles.desc${role}`)}</span>
                </span>
                <span className="text-sm font-semibold text-accent transition-transform group-hover:translate-x-0.5">→</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[12px] text-muted-2">{t("auth.demoNote")}</p>
    </section>
  );
}
