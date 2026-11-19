"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";
import { DEMO_ICONS } from "@/components/store/demo-accounts";
import { useDemoSwitch, type DemoRole } from "@/components/demo/use-demo-switch";
import { cn } from "@/lib/utils";

const ROLES: DemoRole[] = ["ADMIN", "MANAGER", "KITCHEN", "CUSTOMER"];

/**
 * Floating bar shown only to demo sessions: switch role in one click (a real server-side session switch,
 * not a cosmetic label) or leave the demo. Collapsible so it never hides content.
 */
export function DemoRoleSwitcher() {
  const t = useTranslations();
  const router = useRouter();
  const { data } = authClient.useSession();
  const { switchTo, busy } = useDemoSwitch();
  const [collapsed, setCollapsed] = useState(false);
  const user = data?.user as { isDemo?: boolean; role?: string } | undefined;
  if (!user?.isDemo) return null;
  const current = (user.role ?? "CUSTOMER") as DemoRole;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[60] flex justify-center px-3 print:hidden">
      <nav
        aria-label={t("demo.switchLabel")}
        className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-accent/40 bg-background/95 p-1.5 shadow-[0_20px_50px_-15px_rgb(0_0_0/0.9)] backdrop-blur-xl"
      >
        <span className="hidden shrink-0 px-2.5 text-[11px] font-bold tracking-[0.14em] text-accent uppercase sm:inline">{t("demo.badge")}</span>
        {!collapsed
          ? ROLES.map((role) => {
              const Icon = DEMO_ICONS[role];
              const active = role === current;
              return (
                <button
                  key={role}
                  type="button"
                  disabled={busy !== null || active}
                  aria-current={active ? "true" : undefined}
                  aria-label={t(`roles.${role}`)}
                  title={t(`roles.${role}`)}
                  onClick={() => switchTo(role)}
                  className={cn(
                    "flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors",
                    active ? "bg-accent text-accent-foreground" : "text-cream hover:bg-surface-2 disabled:opacity-50",
                  )}
                >
                  {busy === role ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
                  <span className="hidden min-[420px]:inline">{t(`roles.${role}`)}</span>
                </button>
              );
            })
          : (
            <span className="shrink-0 px-2 text-[13px] font-semibold">{t(`roles.${current}`)}</span>
          )}
        <button
          type="button"
          onClick={async () => {
            await authClient.signOut();
            toast.success(t("auth.loggedOut"));
            router.replace("/login");
            router.refresh();
          }}
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-cream"
          aria-label={t("demo.exit")}
          title={t("demo.exit")}
        >
          <LogOut className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-cream"
          aria-label={collapsed ? t("demo.expand") : t("demo.collapse")}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </nav>
    </div>
  );
}
