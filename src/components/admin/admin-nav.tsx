"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BadgePercent, BarChart3, ChefHat, FolderTree, LayoutDashboard, LogOut, Menu, Receipt, Settings, Store, UtensilsCrossed, Users } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Logo } from "@/components/store/logo";
import { LanguageSwitcher } from "@/components/store/language-switcher";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", key: "orders", icon: Receipt },
  { href: "/admin/products", key: "products", icon: UtensilsCrossed },
  { href: "/admin/categories", key: "categories", icon: FolderTree },
  { href: "/admin/coupons", key: "coupons", icon: BadgePercent },
  { href: "/admin/customers", key: "customers", icon: Users },
  { href: "/admin/analytics", key: "analytics", icon: BarChart3 },
  { href: "/admin/settings", key: "settings", icon: Settings },
] as const;

export function AdminNav({ user }: { user: { name: string; role: string } | null }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/admin">
          <Logo />
        </Link>
        <button type="button" onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-full hover:bg-surface-2" aria-label={t("nav.openMenu")} aria-expanded={open}>
          <Menu className="size-6" />
        </button>
      </div>
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-background-deep p-5 lg:flex">
        <NavBody user={user} onNavigate={() => undefined} />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="max-w-[300px] p-5" closeLabel={t("nav.closeMenu")}>
          <SheetTitle className="sr-only">{t("admin.title")}</SheetTitle>
          <SheetDescription className="sr-only">{t("nav.mainNav")}</SheetDescription>
          <NavBody user={user} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

function NavBody({ user, onNavigate }: { user: { name: string; role: string } | null; onNavigate: () => void }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div className="flex h-full flex-col">
      <Link href="/admin" onClick={onNavigate} className="px-2">
        <Logo />
      </Link>
      <nav aria-label={t("admin.title")} className="mt-8 flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {ITEMS.map(({ href, key, icon: Icon }) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-semibold transition-colors",
                    active ? "bg-accent text-accent-foreground" : "text-cream/85 hover:bg-surface hover:text-cream",
                  )}
                >
                  <Icon className="size-[18px]" />
                  {t(`admin.${key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 space-y-1 border-t border-border pt-6">
          <Link href="/kitchen" onClick={onNavigate} className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-semibold text-cream/85 hover:bg-surface">
            <ChefHat className="size-[18px] text-accent" /> {t("admin.kitchenLink")}
          </Link>
          <Link href="/" onClick={onNavigate} className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-semibold text-cream/85 hover:bg-surface">
            <Store className="size-[18px] text-accent" /> {t("admin.backToStore")}
          </Link>
        </div>
      </nav>
      <div className="space-y-4 border-t border-border pt-4">
        <LanguageSwitcher className="w-fit" />
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user ? user.name : t("setup.previewLabel")}</p>
            <p className="text-[12px] text-muted">{user ? t(`roles.${user.role}`) : t("setup.previewRole")}</p>
          </div>
          {user ? (
          <button
            type="button"
            onClick={async () => {
              await authClient.signOut();
              router.replace("/login");
              router.refresh();
            }}
            className="rounded-full p-2 text-muted hover:bg-surface hover:text-cream"
            aria-label={t("nav.logout")}
          >
            <LogOut className="size-4" />
          </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
