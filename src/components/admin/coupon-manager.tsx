"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteCoupon, saveCoupon } from "@/actions/admin";
import { formatKzt } from "@/lib/domain/money";
import type { Locale } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TableWrap } from "@/components/admin/ui";

type CouponRow = {
  id: string;
  code: string;
  descriptionKk: string;
  descriptionRu: string;
  descriptionEn: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minSubtotal: number;
  maxDiscount: number | "";
  startsAt: string;
  endsAt: string;
  usageLimit: number | "";
  perUserLimit: number | "";
  usedCount: number;
  isActive: boolean;
  isPublic: boolean;
};
type FormValues = Omit<CouponRow, "id" | "usedCount">;

export function CouponManager({ coupons }: { coupons: CouponRow[] }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [editing, setEditing] = useState<CouponRow | "new" | null>(null);

  return (
    <>
      <Button className="mb-6" onClick={() => setEditing("new")}>
        <Plus /> {t("admin.newCoupon")}
      </Button>
      {coupons.length ? (
        <TableWrap>
          <thead>
            <tr>
              <th>{t("admin.code")}</th>
              <th>{t("admin.value")}</th>
              <th>{t("admin.minSubtotal")}</th>
              <th>{t("admin.used")}</th>
              <th>{t("admin.status")}</th>
              <th className="text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="font-mono font-bold">{c.code}</span>
                  <span className="block text-[12px] text-muted">{locale === "kk" ? c.descriptionKk : locale === "ru" ? c.descriptionRu : c.descriptionEn}</span>
                </td>
                <td className="whitespace-nowrap">{c.type === "PERCENT" ? `${c.value}%` : formatKzt(c.value, locale)}</td>
                <td className="whitespace-nowrap">{formatKzt(c.minSubtotal, locale)}</td>
                <td>
                  {c.usedCount}
                  {c.usageLimit !== "" ? ` / ${c.usageLimit}` : ""}
                </td>
                <td className="space-x-1">
                  <Badge variant={c.isActive ? "success" : "neutral"}>{c.isActive ? t("admin.active") : "—"}</Badge>
                  {c.isPublic ? <Badge variant="soft">{t("nav.offers")}</Badge> : null}
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={t("common.edit")} onClick={() => setEditing(c)}>
                      <Pencil />
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={t("common.delete")} className="text-muted hover:text-danger">
                          <Trash2 />
                        </Button>
                      }
                      title={t("common.areYouSure")}
                      description={t("admin.couponDeleteConfirm")}
                      confirmLabel={t("common.delete")}
                      cancelLabel={t("common.cancel")}
                      onConfirm={async () => {
                        const res = await deleteCoupon(c.id);
                        if (res.ok) toast.success(res.data?.deactivated ? t("admin.couponDeactivated") : t("common.deleted"));
                        else toast.error(t.has(`errors.${res.error}`) ? t(`errors.${res.error}`) : t("common.genericError"));
                        router.refresh();
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      ) : (
        <EmptyState title={t("offers.empty")} />
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl" closeLabel={t("common.close")}>
          <DialogTitle>{editing === "new" ? t("admin.newCoupon") : t("admin.editCoupon")}</DialogTitle>
          <DialogDescription className="sr-only">{t("admin.coupons")}</DialogDescription>
          {editing !== null ? (
            <CouponForm
              initial={editing === "new" ? null : editing}
              onDone={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CouponForm({ initial, onDone }: { initial: CouponRow | null; onDone: () => void }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const { register, handleSubmit, setError, formState } = useForm<FormValues>({
    defaultValues: initial ?? {
      code: "",
      descriptionKk: "",
      descriptionRu: "",
      descriptionEn: "",
      type: "PERCENT",
      value: 10,
      minSubtotal: 0,
      maxDiscount: "",
      startsAt: "",
      endsAt: "",
      usageLimit: "",
      perUserLimit: "",
      isActive: true,
      isPublic: false,
    },
  });
  const e = (k: keyof FormValues) => {
    const m = formState.errors[k]?.message;
    return m ? (t.has(`validation.${m}`) ? t(`validation.${m}`) : m) : undefined;
  };
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((v) =>
        start(async () => {
          // Dates are entered as Almaty calendar days.
          const payload = {
            ...v,
            startsAt: v.startsAt ? `${v.startsAt}T00:00:00+05:00` : null,
            endsAt: v.endsAt ? `${v.endsAt}T23:59:59+05:00` : null,
          };
          const res = await saveCoupon(initial?.id ?? null, payload as never);
          if (res.ok) {
            toast.success(t("admin.couponSaved"));
            onDone();
          } else if (res.fieldErrors) {
            for (const [k, m] of Object.entries(res.fieldErrors)) setError(k as keyof FormValues, { message: m });
          } else toast.error(t.has(`errors.${res.error}`) ? t(`errors.${res.error}`) : t("common.genericError"));
        }),
      )}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("admin.code")} htmlFor="cp-code" error={e("code")}>
          <Input id="cp-code" className="uppercase" {...register("code")} />
        </Field>
        <Field label={t("admin.couponType")} htmlFor="cp-type" error={e("type")}>
          <NativeSelect id="cp-type" {...register("type")}>
            <option value="PERCENT">{t("admin.percent")}</option>
            <option value="FIXED">{t("admin.fixed")}</option>
          </NativeSelect>
        </Field>
        <Field label={t("admin.value")} htmlFor="cp-value" error={e("value")}>
          <Input id="cp-value" type="number" min={1} {...register("value")} />
        </Field>
      </div>
      {(["descriptionKk", "descriptionRu", "descriptionEn"] as const).map((k) => (
        <Field key={k} label={`${t("admin.description")} (${k.slice(11).toUpperCase()})`} htmlFor={`cp-${k}`} error={e(k)}>
          <Input id={`cp-${k}`} {...register(k)} />
        </Field>
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("admin.minSubtotal")} htmlFor="cp-min" error={e("minSubtotal")}>
          <Input id="cp-min" type="number" min={0} {...register("minSubtotal")} />
        </Field>
        <Field label={t("admin.maxDiscount")} htmlFor="cp-max" error={e("maxDiscount")} optionalLabel={t("common.optional")}>
          <Input id="cp-max" type="number" min={0} {...register("maxDiscount")} />
        </Field>
        <Field label={t("admin.startsAt")} htmlFor="cp-start" error={e("startsAt")} optionalLabel={t("common.optional")}>
          <Input id="cp-start" type="date" {...register("startsAt")} />
        </Field>
        <Field label={t("admin.endsAt")} htmlFor="cp-end" error={e("endsAt")} optionalLabel={t("common.optional")}>
          <Input id="cp-end" type="date" {...register("endsAt")} />
        </Field>
        <Field label={t("admin.usageLimit")} htmlFor="cp-limit" error={e("usageLimit")} optionalLabel={t("common.optional")}>
          <Input id="cp-limit" type="number" min={1} {...register("usageLimit")} />
        </Field>
        <Field label={t("admin.perUserLimit")} htmlFor="cp-user" error={e("perUserLimit")} optionalLabel={t("common.optional")}>
          <Input id="cp-user" type="number" min={1} {...register("perUserLimit")} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[#ff6b35]" {...register("isActive")} /> {t("admin.active")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[#ff6b35]" {...register("isPublic")} /> {t("admin.public")}
        </label>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  );
}
