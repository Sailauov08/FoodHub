"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { z } from "zod";
import { passwordChangeSchema, profileSchema } from "@/lib/validation";
import { updateProfile } from "@/actions/account";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";

type ProfileValues = z.input<typeof profileSchema>;

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, handleSubmit, formState } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: initial });
  const e = (k: keyof ProfileValues) => {
    const m = formState.errors[k]?.message;
    return m ? t(`validation.${m}`) : undefined;
  };
  return (
    <form
      noValidate
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={handleSubmit((v) =>
        start(async () => {
          const res = await updateProfile(v);
          if (res.ok) {
            toast.success(t("common.saved"));
            router.refresh();
          } else toast.error(t.has(`errors.${res.error}`) ? t(`errors.${res.error}`) : t("common.genericError"));
        }),
      )}
    >
      <Field label={t("auth.name")} htmlFor="p-name" error={e("name")}>
        <Input id="p-name" autoComplete="name" {...register("name")} />
      </Field>
      <Field label={t("account.phone")} htmlFor="p-phone" error={e("phone")} hint={t("checkout.phoneHint")}>
        <Input id="p-phone" type="tel" autoComplete="tel" {...register("phone")} />
      </Field>
      <Field label={t("account.language")} htmlFor="p-locale" error={e("locale")}>
        <NativeSelect id="p-locale" {...register("locale")}>
          <option value="kk">Қазақша</option>
          <option value="ru">Русский</option>
          <option value="en">English</option>
        </NativeSelect>
      </Field>
      <div className="flex items-end">
        <Button type="submit" disabled={pending}>
          {pending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}

type PasswordValues = z.input<typeof passwordChangeSchema>;

export function SecurityForm() {
  const t = useTranslations();
  const { register, handleSubmit, formState, reset } = useForm<PasswordValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });
  const e = (k: keyof PasswordValues) => {
    const m = formState.errors[k]?.message;
    return m ? t(`validation.${m}`) : undefined;
  };
  return (
    <div className="space-y-6">
      <form
        noValidate
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={handleSubmit(async (v) => {
          const res = await authClient.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword, revokeOtherSessions: true });
          if (res.error) toast.error(res.error.code === "DEMO_RESTRICTED" ? t("errors.DEMO_RESTRICTED") : t("account.passwordFailed"));
          else {
            toast.success(t("account.passwordChanged"));
            reset();
          }
        })}
      >
        <Field label={t("account.currentPassword")} htmlFor="s-current" error={e("currentPassword")}>
          <Input id="s-current" type="password" autoComplete="current-password" {...register("currentPassword")} />
        </Field>
        <Field label={t("account.newPassword")} htmlFor="s-new" error={e("newPassword")} hint={t("auth.passwordHint")}>
          <Input id="s-new" type="password" autoComplete="new-password" {...register("newPassword")} />
        </Field>
        <div>
          <Button type="submit" variant="secondary" disabled={formState.isSubmitting}>
            {t("account.changePassword")}
          </Button>
        </div>
      </form>
      <div className="border-t border-border pt-6">
        <Button
          variant="outline"
          onClick={async () => {
            const res = await authClient.revokeOtherSessions();
            if (res.error) toast.error(res.error.code === "DEMO_RESTRICTED" ? t("errors.DEMO_RESTRICTED") : t("common.genericError"));
            else toast.success(t("account.signedOutOthers"));
          }}
        >
          {t("account.signOutOthers")}
        </Button>
      </div>
    </div>
  );
}
