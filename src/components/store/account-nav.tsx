"use client";

import { useTranslations } from "next-intl";
import { Heart, LayoutGrid, LogOut, MapPin, Receipt, Settings } from "lucide-react";
import { toast } from "sonner";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/account", key: "overview", icon: LayoutGrid },
  { href: "/account/orders", key: "orders", icon: Receipt },
  { href: "/account/addresses", key: "addresses", icon: MapPin },
  { href: "/account/favorites", key: "favorites", icon: Heart },
  { href: "/account/settings", key: "settings", icon: Settings },
] as const;

export function AccountNav() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <nav aria-label={t("account.title")} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
      {ITEMS.map(({ href, key, icon: Icon }) => {
        const active = href === "/account" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors lg:rounded-[12px]",
              active ? "bg-accent text-accent-foreground" : "text-cream hover:bg-surface",
            )}
          >
            <Icon className="size-4" />
            {t(`account.${key}`)}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={async () => {
          await authClient.signOut();
          toast.success(t("auth.loggedOut"));
          router.replace("/");
          router.refresh();
        }}
        className="flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface hover:text-cream lg:mt-4 lg:rounded-[12px]"
      >
        <LogOut className="size-4" />
        {t("nav.logout")}
      </button>
    </nav>
  );
}
