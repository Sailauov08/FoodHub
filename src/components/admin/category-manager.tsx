"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteCategory, saveCategory } from "@/actions/admin";
import type { CategoryInput } from "@/lib/validation";
import type { Locale } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { Field, Input } from "@/components/ui/form-controls";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TableWrap } from "@/components/admin/ui";

type Cat = { id: string; slug: string; nameKk: string; nameRu: string; nameEn: string; image: string; sortOrder: number; isActive: boolean; products: number };

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [editing, setEditing] = useState<Cat | "new" | null>(null);
  const name = (c: Cat) => (locale === "kk" ? c.nameKk : locale === "ru" ? c.nameRu : c.nameEn);

  return (
    <>
      <Button className="mb-6" onClick={() => setEditing("new")}>
        <Plus /> {t("admin.newCategory")}
      </Button>
      <TableWrap>
        <thead>
          <tr>
            <th>{t("admin.name")}</th>
            <th>{t("admin.slug")}</th>
            <th>{t("admin.productsCount")}</th>
            <th>{t("admin.sortOrder")}</th>
            <th>{t("admin.active")}</th>
            <th className="text-right">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id}>
              <td className="font-semibold">{name(c)}</td>
              <td className="text-muted">{c.slug}</td>
              <td>{c.products}</td>
              <td>{c.sortOrder}</td>
              <td>{c.isActive ? <Badge variant="success">{t("common.yes")}</Badge> : <Badge variant="neutral">{t("common.no")}</Badge>}</td>
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
                    title={t("admin.categoryDeleteConfirm")}
                    description={c.products ? t("errors.CATEGORY_NOT_EMPTY") : t("common.irreversible")}
                    confirmLabel={t("common.delete")}
                    cancelLabel={t("common.cancel")}
                    onConfirm={async () => {
                      const res = await deleteCategory(c.id);
                      if (res.ok) toast.success(t("common.deleted"));
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
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogTitle>{editing === "new" ? t("admin.newCategory") : t("admin.editCategory")}</DialogTitle>
          <DialogDescription className="sr-only">{t("admin.categories")}</DialogDescription>
          {editing !== null ? (
            <CategoryForm
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

function CategoryForm({ initial, onDone }: { initial: Cat | null; onDone: () => void }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const { register, handleSubmit, setError, formState } = useForm<CategoryInput>({
    defaultValues: {
      slug: initial?.slug ?? "",
      nameKk: initial?.nameKk ?? "",
      nameRu: initial?.nameRu ?? "",
      nameEn: initial?.nameEn ?? "",
      image: initial?.image ?? "",
      sortOrder: initial?.sortOrder ?? 100,
      isActive: initial?.isActive ?? true,
    },
  });
  const e = (k: keyof CategoryInput) => {
    const m = formState.errors[k]?.message;
    return m ? (t.has(`validation.${m}`) ? t(`validation.${m}`) : m) : undefined;
  };
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((v) =>
        start(async () => {
          const res = await saveCategory(initial?.id ?? null, v);
          if (res.ok) {
            toast.success(t("admin.categorySaved"));
            onDone();
          } else if (res.fieldErrors) {
            for (const [k, m] of Object.entries(res.fieldErrors)) setError(k as keyof CategoryInput, { message: m });
          } else toast.error(t.has(`errors.${res.error}`) ? t(`errors.${res.error}`) : t("common.genericError"));
        }),
      )}
    >
      <Field label={t("admin.slug")} htmlFor="c-slug" error={e("slug")}>
        <Input id="c-slug" {...register("slug")} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        {(["nameKk", "nameRu", "nameEn"] as const).map((k) => (
          <Field key={k} label={k.slice(4).toUpperCase()} htmlFor={`c-${k}`} error={e(k)}>
            <Input id={`c-${k}`} {...register(k)} />
          </Field>
        ))}
      </div>
      <Field label={t("admin.imageUrl")} htmlFor="c-image" error={e("image")} hint={t("admin.imageHint")}>
        <Input id="c-image" {...register("image")} />
      </Field>
      <div className="grid grid-cols-2 items-end gap-3">
        <Field label={t("admin.sortOrder")} htmlFor="c-sort" error={e("sortOrder")}>
          <Input id="c-sort" type="number" {...register("sortOrder")} />
        </Field>
        <label className="flex h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[#ff6b35]" {...register("isActive")} /> {t("admin.active")}
        </label>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  );
}
