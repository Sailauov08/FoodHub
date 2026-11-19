"use client";

import Image from "next/image";
import { useTransition } from "react";
import { useFieldArray, useForm, type Control, type UseFormRegister, type FieldErrors } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveProduct } from "@/actions/admin";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";

type L = { nameKk: string; nameRu: string; nameEn: string };
export type ProductFormValues = {
  slug: string;
  categoryId: string;
  nameKk: string;
  nameRu: string;
  nameEn: string;
  descriptionKk: string;
  descriptionRu: string;
  descriptionEn: string;
  ingredientsKk: string;
  ingredientsRu: string;
  ingredientsEn: string;
  allergensCsv: string;
  price: number | string;
  compareAtPrice: number | string;
  weightGrams: number | string;
  calories: number | string;
  isAvailable: boolean;
  isFeatured: boolean;
  maxPerOrder: number | string;
  sortOrder: number | string;
  imageUrl: string;
  variants: (L & { id?: string; price: number | string; isDefault: boolean; isAvailable: boolean })[];
  modifierGroups: (L & {
    id?: string;
    minSelect: number | string;
    maxSelect: number | string;
    options: (L & { id?: string; price: number | string; isAvailable: boolean })[];
  })[];
};

export function ProductForm({ id, initial, categories }: { id: string | null; initial: ProductFormValues; categories: { id: string; name: string }[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm<ProductFormValues>({ defaultValues: initial });
  const { register, control, handleSubmit, setError, watch, formState } = form;
  const variants = useFieldArray({ control, name: "variants" });
  const groups = useFieldArray({ control, name: "modifierGroups" });
  const imageUrl = watch("imageUrl");
  const errors = formState.errors as FieldErrors<ProductFormValues> & Record<string, { message?: string }>;
  const msg = (path: string) => {
    const parts = path.split(".");
    let cur: unknown = formState.errors;
    for (const p of parts) cur = (cur as Record<string, unknown> | undefined)?.[p];
    const m = (cur as { message?: string } | undefined)?.message;
    return m ? (t.has(`validation.${m}`) ? t(`validation.${m}`) : m) : undefined;
  };
  void errors;

  function onSubmit(v: ProductFormValues) {
    start(async () => {
      const payload = {
        ...v,
        allergens: v.allergensCsv
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
      };
      const res = await saveProduct(id, payload as never);
      if (res.ok) {
        toast.success(t("admin.productSaved"));
        if (!id && res.data) router.replace(`/admin/products/${res.data.id}`);
        router.refresh();
        return;
      }
      if (res.fieldErrors) {
        for (const [path, message] of Object.entries(res.fieldErrors)) setError(path as never, { message });
        toast.error(t("errors.VALIDATION"));
      } else toast.error(t.has(`errors.${res.error}`) ? t(`errors.${res.error}`) : t("common.genericError"));
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card className="space-y-5 p-6">
          <h2 className="font-display text-xl font-semibold">{t("admin.translations")}</h2>
          {(["Kk", "Ru", "En"] as const).map((suffix) => (
            <fieldset key={suffix} className="space-y-3 rounded-[14px] border border-border p-4">
              <legend className="px-1 text-[12px] font-bold tracking-widest text-accent uppercase">{suffix}</legend>
              <Field label={t("admin.name")} htmlFor={`name${suffix}`} error={msg(`name${suffix}`)}>
                <Input id={`name${suffix}`} {...register(`name${suffix}`)} />
              </Field>
              <Field label={t("admin.description")} htmlFor={`description${suffix}`} error={msg(`description${suffix}`)}>
                <Textarea id={`description${suffix}`} rows={3} {...register(`description${suffix}`)} />
              </Field>
              <Field label={t("admin.ingredients")} htmlFor={`ingredients${suffix}`} error={msg(`ingredients${suffix}`)} optionalLabel={t("common.optional")}>
                <Input id={`ingredients${suffix}`} {...register(`ingredients${suffix}`)} />
              </Field>
            </fieldset>
          ))}
        </Card>

        <Card className="space-y-4 p-6">
          <div>
            <h2 className="font-display text-xl font-semibold">{t("admin.variants")}</h2>
            <p className="text-sm text-muted">{t("admin.variantsHint")}</p>
          </div>
          {variants.fields.map((f, i) => (
            <div key={f.id} className="grid gap-3 rounded-[14px] border border-border p-4 sm:grid-cols-[1fr_1fr_1fr_120px]">
              <LInputs prefix={`variants.${i}`} register={register} msg={msg} />
              <Field label={t("admin.price")} htmlFor={`variants.${i}.price`} error={msg(`variants.${i}.price`)}>
                <Input id={`variants.${i}.price`} type="number" inputMode="numeric" min={0} {...register(`variants.${i}.price`)} />
              </Field>
              <div className="flex flex-wrap items-center gap-4 sm:col-span-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-[#ff6b35]" {...register(`variants.${i}.isDefault`)} /> {t("admin.isDefault")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-[#ff6b35]" {...register(`variants.${i}.isAvailable`)} /> {t("admin.available")}
                </label>
                <Button type="button" variant="ghost" size="sm" className="ml-auto text-muted hover:text-danger" onClick={() => variants.remove(i)}>
                  <Trash2 /> {t("admin.remove")}
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => variants.append({ nameKk: "", nameRu: "", nameEn: "", price: 0, isDefault: variants.fields.length === 0, isAvailable: true })}>
            <Plus /> {t("admin.addVariant")}
          </Button>
        </Card>

        <Card className="space-y-4 p-6">
          <div>
            <h2 className="font-display text-xl font-semibold">{t("admin.modifiers")}</h2>
            <p className="text-sm text-muted">{t("admin.modifiersHint")}</p>
          </div>
          {groups.fields.map((g, gi) => (
            <div key={g.id} className="space-y-3 rounded-[16px] border border-border-strong p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_80px_80px]">
                <LInputs prefix={`modifierGroups.${gi}`} register={register} msg={msg} />
                <Field label={t("admin.minSelect")} htmlFor={`modifierGroups.${gi}.minSelect`} error={msg(`modifierGroups.${gi}.minSelect`)}>
                  <Input id={`modifierGroups.${gi}.minSelect`} type="number" min={0} max={10} {...register(`modifierGroups.${gi}.minSelect`)} />
                </Field>
                <Field label={t("admin.maxSelect")} htmlFor={`modifierGroups.${gi}.maxSelect`} error={msg(`modifierGroups.${gi}.maxSelect`)}>
                  <Input id={`modifierGroups.${gi}.maxSelect`} type="number" min={1} max={10} {...register(`modifierGroups.${gi}.maxSelect`)} />
                </Field>
              </div>
              <OptionsEditor control={control} register={register} groupIndex={gi} msg={msg} />
              <Button type="button" variant="ghost" size="sm" className="text-muted hover:text-danger" onClick={() => groups.remove(gi)}>
                <Trash2 /> {t("admin.remove")}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => groups.append({ nameKk: "", nameRu: "", nameEn: "", minSelect: 0, maxSelect: 1, options: [{ nameKk: "", nameRu: "", nameEn: "", price: 0, isAvailable: true }] })}
          >
            <Plus /> {t("admin.addGroup")}
          </Button>
        </Card>
      </div>

      <div className="space-y-6 xl:sticky xl:top-6">
        <Card className="space-y-4 p-6">
          <h2 className="font-display text-xl font-semibold">{t("admin.basics")}</h2>
          <Field label={t("admin.slug")} htmlFor="slug" error={msg("slug")}>
            <Input id="slug" {...register("slug")} placeholder="black-angus-burger" />
          </Field>
          <Field label={t("admin.category")} htmlFor="categoryId" error={msg("categoryId")}>
            <NativeSelect id="categoryId" {...register("categoryId")}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-[#ff6b35]" {...register("isAvailable")} /> {t("admin.available")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-[#ff6b35]" {...register("isFeatured")} /> {t("admin.featured")}
          </label>
        </Card>
        <Card className="space-y-4 p-6">
          <h2 className="font-display text-xl font-semibold">{t("admin.pricing")}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t("admin.price")}, ₸`} htmlFor="price" error={msg("price")}>
              <Input id="price" type="number" min={0} {...register("price")} />
            </Field>
            <Field label={t("admin.compareAtPrice")} htmlFor="compareAtPrice" error={msg("compareAtPrice")}>
              <Input id="compareAtPrice" type="number" min={0} {...register("compareAtPrice")} />
            </Field>
            <Field label={t("admin.weight")} htmlFor="weightGrams" error={msg("weightGrams")}>
              <Input id="weightGrams" type="number" min={0} {...register("weightGrams")} />
            </Field>
            <Field label={t("admin.calories")} htmlFor="calories" error={msg("calories")}>
              <Input id="calories" type="number" min={0} {...register("calories")} />
            </Field>
            <Field label={t("admin.maxPerOrder")} htmlFor="maxPerOrder" error={msg("maxPerOrder")}>
              <Input id="maxPerOrder" type="number" min={1} max={50} {...register("maxPerOrder")} />
            </Field>
            <Field label={t("admin.sortOrder")} htmlFor="sortOrder" error={msg("sortOrder")}>
              <Input id="sortOrder" type="number" min={0} {...register("sortOrder")} />
            </Field>
          </div>
          <Field label={t("admin.allergensCsv")} htmlFor="allergensCsv" error={msg("allergens")} hint="gluten, milk, egg, sesame, fish, soy…">
            <Input id="allergensCsv" {...register("allergensCsv")} />
          </Field>
        </Card>
        <Card className="space-y-4 p-6">
          <h2 className="font-display text-xl font-semibold">{t("admin.media")}</h2>
          <Field label={t("admin.imageUrl")} htmlFor="imageUrl" error={msg("imageUrl")} hint={t("admin.imageHint")}>
            <Input id="imageUrl" {...register("imageUrl")} />
          </Field>
          {/^\/images\/|^https:\/\/images\.unsplash\.com\//.test(imageUrl) ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-surface-2">
              <Image src={imageUrl} alt="" fill sizes="340px" className="object-cover" />
            </div>
          ) : null}
        </Card>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}

function LInputs({ prefix, register, msg }: { prefix: string; register: UseFormRegister<ProductFormValues>; msg: (p: string) => string | undefined }) {
  return (
    <>
      {(["Kk", "Ru", "En"] as const).map((s) => (
        <Field key={s} label={s.toUpperCase()} htmlFor={`${prefix}.name${s}`} error={msg(`${prefix}.name${s}`)}>
          <Input id={`${prefix}.name${s}`} {...register(`${prefix}.name${s}` as never)} />
        </Field>
      ))}
    </>
  );
}

function OptionsEditor({
  control,
  register,
  groupIndex,
  msg,
}: {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
  groupIndex: number;
  msg: (p: string) => string | undefined;
}) {
  const t = useTranslations();
  const options = useFieldArray({ control, name: `modifierGroups.${groupIndex}.options` });
  return (
    <div className="space-y-2 rounded-[12px] bg-surface-2/50 p-3">
      {options.fields.map((o, oi) => {
        const p = `modifierGroups.${groupIndex}.options.${oi}`;
        return (
          <div key={o.id} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_100px_auto_auto]">
            <LInputs prefix={p} register={register} msg={msg} />
            <Field label="₸" htmlFor={`${p}.price`} error={msg(`${p}.price`)}>
              <Input id={`${p}.price`} type="number" min={0} {...register(`${p}.price` as never)} />
            </Field>
            <label className="flex h-11 items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-[#ff6b35]" {...register(`${p}.isAvailable` as never)} /> {t("admin.available")}
            </label>
            <Button type="button" variant="ghost" size="icon-sm" className="mb-1 text-muted hover:text-danger" aria-label={t("admin.remove")} onClick={() => options.remove(oi)} disabled={options.fields.length <= 1}>
              <Trash2 />
            </Button>
          </div>
        );
      })}
      <Button type="button" variant="ghost" size="sm" onClick={() => options.append({ nameKk: "", nameRu: "", nameEn: "", price: 0, isAvailable: true })}>
        <Plus /> {t("admin.addOption")}
      </Button>
    </div>
  );
}
