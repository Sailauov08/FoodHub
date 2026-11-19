"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { saveSettings } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { Field, Input } from "@/components/ui/form-controls";

type Values = {
  phone: string;
  email: string;
  addressKk: string;
  addressRu: string;
  addressEn: string;
  instagram: string;
  deliveryFee: number | string;
  freeDeliveryThreshold: number | string;
  minOrderValue: number | string;
  estimatedDeliveryMin: number | string;
  estimatedPickupMin: number | string;
  acceptingOrders: boolean;
  openingHours: { day: number; open: string; close: string; closed: boolean }[];
};

export function SettingsForm({ initial, readOnly }: { initial: Values; readOnly: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, handleSubmit, setError, formState } = useForm<Values>({ defaultValues: initial });
  const e = (path: string) => {
    let cur: unknown = formState.errors;
    for (const p of path.split(".")) cur = (cur as Record<string, unknown> | undefined)?.[p];
    const m = (cur as { message?: string } | undefined)?.message;
    return m ? (t.has(`validation.${m}`) ? t(`validation.${m}`) : m) : undefined;
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) =>
        start(async () => {
          const payload = { ...v, openingHours: v.openingHours.map((h) => ({ ...h, day: Number(h.day) })) };
          const res = await saveSettings(payload as never);
          if (res.ok) {
            toast.success(t("admin.settingsSaved"));
            router.refresh();
          } else if (res.fieldErrors) {
            for (const [k, m] of Object.entries(res.fieldErrors)) setError(k as never, { message: m });
            toast.error(t("errors.VALIDATION"));
          } else toast.error(t.has(`errors.${res.error}`) ? t(`errors.${res.error}`) : t("common.genericError"));
        }),
      )}
    >
      <fieldset disabled={readOnly || pending} className="grid items-start gap-6 xl:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h2 className="font-display text-xl font-semibold">{t("admin.contactInfo")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("admin.phone")} htmlFor="s-phone" error={e("phone")}>
              <Input id="s-phone" type="tel" {...register("phone")} />
            </Field>
            <Field label={t("admin.email")} htmlFor="s-email" error={e("email")}>
              <Input id="s-email" type="email" {...register("email")} />
            </Field>
          </div>
          {(["addressKk", "addressRu", "addressEn"] as const).map((k) => (
            <Field key={k} label={t(`admin.${k}`)} htmlFor={`s-${k}`} error={e(k)}>
              <Input id={`s-${k}`} {...register(k)} />
            </Field>
          ))}
          <Field label={t("admin.instagram")} htmlFor="s-ig" error={e("instagram")} optionalLabel={t("common.optional")}>
            <Input id="s-ig" {...register("instagram")} />
          </Field>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="font-display text-xl font-semibold">{t("admin.deliverySettings")}</h2>
          <label className="flex items-center gap-3 rounded-[12px] border border-border p-3 text-sm font-semibold">
            <input type="checkbox" className="size-5 accent-[#ff6b35]" {...register("acceptingOrders")} /> {t("admin.acceptingOrders")}
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`${t("admin.deliveryFee")}, ₸`} htmlFor="s-fee" error={e("deliveryFee")}>
              <Input id="s-fee" type="number" min={0} {...register("deliveryFee")} />
            </Field>
            <Field label={`${t("admin.freeDeliveryThreshold")}, ₸`} htmlFor="s-free" error={e("freeDeliveryThreshold")} optionalLabel={t("common.optional")}>
              <Input id="s-free" type="number" min={0} {...register("freeDeliveryThreshold")} />
            </Field>
            <Field label={`${t("admin.minOrderValue")}, ₸`} htmlFor="s-min" error={e("minOrderValue")}>
              <Input id="s-min" type="number" min={0} {...register("minOrderValue")} />
            </Field>
            <Field label={t("admin.estimatedDeliveryMin")} htmlFor="s-eta-d" error={e("estimatedDeliveryMin")}>
              <Input id="s-eta-d" type="number" min={5} {...register("estimatedDeliveryMin")} />
            </Field>
            <Field label={t("admin.estimatedPickupMin")} htmlFor="s-eta-p" error={e("estimatedPickupMin")}>
              <Input id="s-eta-p" type="number" min={5} {...register("estimatedPickupMin")} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-3 p-6 xl:col-span-2">
          <h2 className="font-display text-xl font-semibold">{t("admin.openingHours")}</h2>
          <div className="divide-y divide-border">
            {initial.openingHours.map((h, i) => (
              <div key={h.day} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 sm:grid-cols-[160px_140px_140px_auto]">
                <span className="font-semibold">{t(`days.${h.day}`)}</span>
                <label className="flex items-center gap-2 text-sm sm:order-last">
                  <input type="checkbox" className="size-4 accent-[#ff6b35]" {...register(`openingHours.${i}.closed`)} /> {t("admin.closed")}
                </label>
                <Input aria-label={`${t(`days.${h.day}`)} ${t("admin.open")}`} type="time" {...register(`openingHours.${i}.open`)} />
                <Input aria-label={`${t(`days.${h.day}`)} ${t("admin.close")}`} type="time" {...register(`openingHours.${i}.close`)} />
              </div>
            ))}
          </div>
        </Card>
        {!readOnly ? (
          <div className="xl:col-span-2">
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        ) : null}
      </fieldset>
    </form>
  );
}
