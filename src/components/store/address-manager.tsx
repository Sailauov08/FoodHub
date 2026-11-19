"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addressSchema, type AddressInput } from "@/lib/validation";
import { deleteAddress, saveAddress } from "@/actions/account";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Checkbox, Field, Input, Label } from "@/components/ui/form-controls";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type Addr = { id: string } & Required<Omit<AddressInput, "isDefault">> & { isDefault: boolean };

export function AddressManager({ addresses }: { addresses: Addr[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [editing, setEditing] = useState<Addr | "new" | null>(null);

  async function remove(id: string) {
    const res = await deleteAddress(id);
    if (res.ok) {
      toast.success(t("common.deleted"));
      router.refresh();
    } else toast.error(t(`errors.${res.error}`));
  }

  return (
    <div>
      {addresses.length ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="flex flex-col rounded-[20px] border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="flex items-center gap-2 font-semibold">
                  <MapPin className="size-4 text-accent" />
                  {a.label}
                </p>
                {a.isDefault ? <Badge variant="soft">{t("account.default")}</Badge> : null}
              </div>
              <p className="mt-2 text-sm text-muted">
                {[a.street, a.apartment && `${t("checkout.apartment")} ${a.apartment}`, a.entrance && `${t("checkout.entrance")} ${a.entrance}`, a.floor && `${t("checkout.floor")} ${a.floor}`].filter(Boolean).join(", ")}
              </p>
              {a.notes ? <p className="mt-1 text-[13px] text-muted-2">{a.notes}</p> : null}
              <div className="mt-4 flex gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setEditing(a)}>
                  <Pencil /> {t("common.edit")}
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="text-muted hover:text-danger">
                      <Trash2 /> {t("common.delete")}
                    </Button>
                  }
                  title={t("account.deleteAddress")}
                  description={t("common.irreversible")}
                  confirmLabel={t("common.delete")}
                  cancelLabel={t("common.cancel")}
                  onConfirm={() => remove(a.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<MapPin />} title={t("account.noAddresses")} text={t("account.noAddressesText")} />
      )}
      {addresses.length < 10 ? (
        <Button className="mt-6" onClick={() => setEditing("new")}>
          <Plus /> {t("account.addAddress")}
        </Button>
      ) : (
        <p className="mt-6 text-sm text-muted">{t("account.limit")}</p>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogTitle>{editing === "new" ? t("account.addAddress") : t("account.editAddress")}</DialogTitle>
          <DialogDescription className="sr-only">{t("account.addresses")}</DialogDescription>
          {editing !== null ? (
            <AddressForm
              initial={editing === "new" ? null : editing}
              onDone={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddressForm({ initial, onDone }: { initial: Addr | null; onDone: () => void }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const form = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: initial?.label ?? "",
      street: initial?.street ?? "",
      apartment: initial?.apartment ?? "",
      entrance: initial?.entrance ?? "",
      floor: initial?.floor ?? "",
      notes: initial?.notes ?? "",
      isDefault: initial?.isDefault ?? false,
    },
  });
  const { register, handleSubmit, formState, setValue, watch } = form;
  const e = (k: keyof AddressInput) => {
    const m = formState.errors[k]?.message;
    return m ? t(`validation.${m}`) : undefined;
  };

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) =>
        start(async () => {
          const res = await saveAddress(initial?.id ?? null, values);
          if (res.ok) {
            toast.success(t("common.saved"));
            onDone();
          } else toast.error(t.has(`errors.${res.error}`) ? t(`errors.${res.error}`) : t("common.genericError"));
        }),
      )}
    >
      <Field label={t("account.label")} htmlFor="a-label" error={e("label")}>
        <Input id="a-label" placeholder={t("account.labelPlaceholder")} {...register("label")} />
      </Field>
      <Field label={t("checkout.street")} htmlFor="a-street" error={e("street")}>
        <Input id="a-street" autoComplete="street-address" {...register("street")} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label={t("checkout.apartment")} htmlFor="a-apt" error={e("apartment")}>
          <Input id="a-apt" {...register("apartment")} />
        </Field>
        <Field label={t("checkout.entrance")} htmlFor="a-ent" error={e("entrance")}>
          <Input id="a-ent" {...register("entrance")} />
        </Field>
        <Field label={t("checkout.floor")} htmlFor="a-floor" error={e("floor")}>
          <Input id="a-floor" {...register("floor")} />
        </Field>
      </div>
      <Field label={t("checkout.addressNotes")} htmlFor="a-notes" error={e("notes")} optionalLabel={t("common.optional")}>
        <Input id="a-notes" {...register("notes")} />
      </Field>
      <div className="flex items-center gap-3">
        <Checkbox id="a-default" checked={watch("isDefault")} onCheckedChange={(v) => setValue("isDefault", v === true)} />
        <Label htmlFor="a-default" className="flex items-center gap-1.5 text-sm text-cream">
          <Star className="size-3.5 text-accent" /> {t("account.makeDefault")}
        </Label>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  );
}
