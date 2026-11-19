"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

const LABELS: Record<Locale, string> = { kk: "ҚАЗ", ru: "РУС", en: "ENG" };
const FULL: Record<Locale, string> = { kk: "Қазақша", ru: "Русский", en: "English" };

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    startTransition(() => {
      const search = typeof window !== "undefined" ? window.location.search : "";
      router.replace(`${pathname}${search}`, { locale: next, scroll: false });
    });
  }

  return (
    <div role="group" aria-label={t("language")} className={cn("flex items-center gap-0.5 rounded-full border border-border bg-surface/60 p-1", pending && "opacity-60", className)}>
      <Globe className="mx-1 size-3.5 text-muted" aria-hidden />
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          onClick={() => switchTo(l)}
          aria-pressed={l === locale}
          aria-label={FULL[l]}
          className={cn(
            "min-h-7 min-w-9 rounded-full px-2.5 text-[11px] font-bold tracking-wide transition-colors",
            l === locale ? "bg-accent text-accent-foreground" : "text-muted hover:text-cream",
          )}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
