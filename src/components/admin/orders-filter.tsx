"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ORDER_STATUSES } from "@/lib/domain/order-status";
import { Input, NativeSelect } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";

export function OrdersFilter({ status, q }: { status: string; q: string }) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(q);
  const [pending, start] = useTransition();

  function apply(next: { status?: string; q?: string }) {
    const s = new URLSearchParams();
    const st = next.status ?? status;
    const qq = next.q ?? query;
    if (st) s.set("status", st);
    if (qq.trim()) s.set("q", qq.trim());
    start(() => router.replace(s.size ? `${pathname}?${s}` : pathname));
  }

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        apply({});
      }}
    >
      <label htmlFor="o-status" className="sr-only">
        {t("admin.filterStatus")}
      </label>
      <NativeSelect id="o-status" value={status} onChange={(e) => apply({ status: e.target.value })} className="sm:w-56">
        <option value="">{t("admin.allStatuses")}</option>
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`status.${s}`)}
          </option>
        ))}
      </NativeSelect>
      <div className="relative flex-1">
        <label htmlFor="o-q" className="sr-only">
          {t("admin.searchOrders")}
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-2" />
        <Input id="o-q" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("admin.searchOrders")} className="pl-10" />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {t("common.search")}
      </Button>
    </form>
  );
}
