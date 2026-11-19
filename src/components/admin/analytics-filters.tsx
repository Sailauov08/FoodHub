"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";

export function AnalyticsFilters({ from, to, granularity }: { from: string; to: string; granularity: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const pathname = usePathname();
  const [f, setF] = useState(from);
  const [tt, setT] = useState(to);
  const [g, setG] = useState(granularity);
  const [pending, start] = useTransition();
  const qs = new URLSearchParams({ from: f, to: tt }).toString();

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-[18px] border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(() => router.replace(`${pathname}?${new URLSearchParams({ from: f, to: tt, g })}`));
      }}
    >
      <Field label={t("fromDate")} htmlFor="a-from">
        <Input id="a-from" type="date" value={f} max={tt} onChange={(e) => setF(e.target.value)} className="w-44" />
      </Field>
      <Field label={t("toDate")} htmlFor="a-to">
        <Input id="a-to" type="date" value={tt} min={f} onChange={(e) => setT(e.target.value)} className="w-44" />
      </Field>
      <Field label={t("granularity")} htmlFor="a-g">
        <NativeSelect id="a-g" value={g} onChange={(e) => setG(e.target.value)} className="w-36">
          <option value="day">{t("day")}</option>
          <option value="week">{t("week")}</option>
          <option value="month">{t("month")}</option>
        </NativeSelect>
      </Field>
      <Button type="submit" disabled={pending}>
        {t("apply")}
      </Button>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={`/api/admin/reports?type=orders&${qs}`} download>
            <Download /> {t("exportOrders")}
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/admin/reports?type=products&${qs}`} download>
            <Download /> {t("exportProducts")}
          </a>
        </Button>
      </div>
    </form>
  );
}
