"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Search, X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Input, NativeSelect, Switch, Label } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";

type Props = {
  categories: { slug: string; name: string; count: number }[];
  active: { category: string | null; q: string; sort: string; availableOnly: boolean };
};

export function MenuFilters({ categories, active }: Props) {
  const t = useTranslations("menu");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(active.q);

  function push(patch: Partial<{ category: string | null; q: string; sort: string; available: boolean }>) {
    const next = {
      category: patch.category !== undefined ? patch.category : active.category,
      q: patch.q !== undefined ? patch.q : q,
      sort: patch.sort ?? active.sort,
      available: patch.available ?? active.availableOnly,
    };
    const params = new URLSearchParams();
    if (next.category) params.set("category", next.category);
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.sort !== "popular") params.set("sort", next.sort);
    if (next.available) params.set("available", "1");
    const qs = params.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  // Debounced search.
  useEffect(() => {
    // Only react to user edits (also safe under React Strict Mode's double effect run).
    if (q.trim() === active.q.trim()) return;
    const id = setTimeout(() => push({ q }), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="sticky top-[68px] z-30 -mx-4 mt-10 border-y border-border bg-background/85 px-4 py-4 backdrop-blur-xl sm:mx-0 sm:rounded-[20px] sm:border sm:px-5">
      <nav aria-label={t("categoriesLabel")} className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip active={!active.category} onClick={() => push({ category: null })}>
          {t("allCategories")}
        </Chip>
        {categories.map((c) => (
          <Chip key={c.slug} active={active.category === c.slug} onClick={() => push({ category: c.slug })}>
            {c.name}
            <span className={cn("ml-1.5 text-[11px]", active.category === c.slug ? "text-accent-foreground/70" : "text-muted-2")}>{c.count}</span>
          </Chip>
        ))}
      </nav>
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <label htmlFor="menu-search" className="sr-only">
            {t("searchLabel")}
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-2" aria-hidden />
          <Input
            id="menu-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pr-10 pl-10"
            maxLength={60}
            enterKeyHint="search"
          />
          {pending ? (
            <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-accent" aria-hidden />
          ) : q ? (
            <button type="button" onClick={() => setQ("")} className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-muted hover:text-cream" aria-label={t("resetFilters")}>
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor="menu-sort" className="sr-only">
            {t("sortLabel")}
          </label>
          <NativeSelect id="menu-sort" value={active.sort} onChange={(e) => push({ sort: e.target.value })} className="md:w-56">
            <option value="popular">{t("sortPopular")}</option>
            <option value="price-asc">{t("sortPriceAsc")}</option>
            <option value="price-desc">{t("sortPriceDesc")}</option>
            <option value="name">{t("sortName")}</option>
          </NativeSelect>
          <div className="flex shrink-0 items-center gap-2.5">
            <Switch id="menu-available" checked={active.availableOnly} onCheckedChange={(v) => push({ available: v })} />
            <Label htmlFor="menu-available" className="text-sm whitespace-nowrap text-cream">
              {t("onlyAvailable")}
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex shrink-0 items-center rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
        active ? "border-accent bg-accent text-accent-foreground" : "border-border-strong text-cream hover:border-accent/60",
      )}
    >
      {children}
    </button>
  );
}
