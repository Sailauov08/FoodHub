"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChefHat, LayoutDashboard, LogOut, Menu as MenuIcon, ShoppingCart, User } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { cartCount, useCart } from "@/stores/cart";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/dialog";
import { LanguageSwitcher } from "@/components/store/language-switcher";
import { Logo } from "@/components/store/logo";
import { toast } from "sonner";

const NAV = [
  { href: "/", key: "home" },
  { href: "/menu", key: "menu" },
  { href: "/about", key: "about" },
  { href: "/offers", key: "offers" },
  { href: "/contact", key: "contact" },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const items = useCart((s) => s.items);
  const hydrated = useCart((s) => s.hydrated);
  const setDrawerOpen = useCart((s) => s.setDrawerOpen);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const count = hydrated ? cartCount(items) : 0;
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isStaff = role === "ADMIN" || role === "MANAGER" || role === "KITCHEN";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  async function logout() {
    await authClient.signOut();
    toast.success(tAuth("loggedOut"));
    router.refresh();
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,backdrop-filter,border-color,padding] duration-300",
        scrolled ? "border-b border-border bg-background/80 py-3 backdrop-blur-xl" : "border-b border-transparent py-5 lg:py-8",
      )}
    >
      <div className="container-page flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0" aria-label="FoodHub">
          <Logo />
        </Link>

        <nav aria-label={t("mainNav")} className="hidden lg:block">
          <ul className="flex items-center xl:gap-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3 py-2 text-[15px] font-medium whitespace-nowrap transition-colors hover:text-accent xl:px-4 xl:text-[17px]",
                    isActive(item.href) ? "text-accent" : "text-cream",
                  )}
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher className="hidden sm:flex lg:hidden xl:flex" />
          {session ? (
            <div className="hidden items-center gap-1 md:flex">
              {isStaff ? (
                <Link
                  href={role === "KITCHEN" ? "/kitchen" : "/admin"}
                  className="flex items-center gap-2 rounded-full px-3 py-2 text-[15px] font-medium text-cream transition-colors hover:text-accent"
                >
                  {role === "KITCHEN" ? <ChefHat className="size-5" /> : <LayoutDashboard className="size-5" />}
                  {role === "KITCHEN" ? t("kitchen") : t("admin")}
                </Link>
              ) : null}
              <Link
                href="/account"
                className="flex items-center gap-2 rounded-full px-3 py-2 text-[16px] font-medium text-cream transition-colors hover:text-accent"
              >
                <User className="size-5" strokeWidth={1.75} />
                <span className="max-w-32 truncate">{session.user.name}</span>
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden items-center gap-2.5 rounded-full px-3 py-2 text-[15px] font-medium whitespace-nowrap text-cream transition-colors hover:text-accent md:flex xl:text-[17px]"
            >
              <User className="size-6" strokeWidth={1.5} />
              {t("signIn")}
            </Link>
          )}
          <span aria-hidden className="mx-1 hidden h-8 w-px bg-cream/70 md:block" />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative flex items-center gap-3.5 rounded-full px-3 py-2 text-[15px] font-medium whitespace-nowrap text-cream xl:text-[17px] transition-colors hover:text-accent"
            aria-label={`${t("cart")} (${count})`}
          >
            <span className="relative">
              <ShoppingCart className="size-6" strokeWidth={1.5} />
              {count > 0 ? (
                <span key={count} className="absolute -top-2 -right-2 grid min-w-5 animate-in zoom-in-50 duration-300 place-items-center rounded-full bg-accent px-1 text-[11px] leading-5 font-bold text-accent-foreground">
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </span>
            <span className="hidden sm:inline">{t("cart")}</span>
          </button>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full text-cream transition-colors hover:bg-surface-2 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={t("openMenu")}
            aria-expanded={mobileOpen}
          >
            <MenuIcon className="size-6" />
          </button>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" closeLabel={t("closeMenu")} className="max-w-[340px] p-6">
          <SheetTitle className="sr-only">{t("mainNav")}</SheetTitle>
          <SheetDescription className="sr-only">{t("mainNav")}</SheetDescription>
          <Logo />
          <nav aria-label={t("mainNav")} className="mt-10">
            <ul className="flex flex-col gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "block rounded-xl px-4 py-3 font-display text-2xl font-semibold transition-colors hover:bg-surface",
                      isActive(item.href) ? "text-accent" : "text-cream",
                    )}
                  >
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto flex flex-col gap-3 border-t border-border pt-6">
            {session ? (
              <>
                {isStaff ? (
                  <Link href={role === "KITCHEN" ? "/kitchen" : "/admin"} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-surface">
                    {role === "KITCHEN" ? <ChefHat className="size-5 text-accent" /> : <LayoutDashboard className="size-5 text-accent" />}
                    {role === "KITCHEN" ? t("kitchen") : t("admin")}
                  </Link>
                ) : null}
                <Link href="/account" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-surface">
                  <User className="size-5 text-accent" />
                  {t("account")}
                </Link>
                <button type="button" onClick={() => { setMobileOpen(false); void logout(); }} className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-muted hover:bg-surface">
                  <LogOut className="size-5" />
                  {t("logout")}
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-surface">
                <User className="size-5 text-accent" />
                {t("signIn")}
              </Link>
            )}
            <LanguageSwitcher className="px-2" />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
