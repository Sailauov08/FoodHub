"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { loginSchema, registerSchema } from "@/lib/validation";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";

type Mode = "login" | "register";
type Values = { name?: string; email: string; password: string };

/** Only allow same-site relative redirects (prevents open redirects). */
function safeNext(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next.slice(0, 200);
}

export function AuthForm({ mode, next, preview = false }: { mode: Mode; next: string | null; preview?: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(mode === "login" ? loginSchema : registerSchema) as never,
    defaultValues: { name: "", email: "", password: "" },
  });
  const { register, handleSubmit, formState } = form;
  const err = (k: keyof Values) => {
    const m = formState.errors[k]?.message;
    return m ? (t.has(`validation.${m}`) ? t(`validation.${m}`) : m) : undefined;
  };

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      const res =
        mode === "login"
          ? await authClient.signIn.email({ email: values.email.trim().toLowerCase(), password: values.password })
          : await authClient.signUp.email({ name: values.name!.trim(), email: values.email.trim().toLowerCase(), password: values.password });
      if (res.error) {
        const msg =
          res.error.status === 503
            ? t("auth.previewDisabled")
            : res.error.status === 429
              ? t("auth.rateLimited")
              : mode === "login"
                ? t("auth.invalidCredentials")
                : t("auth.registerFailed");
        setFormError(msg);
        return;
      }
      toast.success(mode === "login" ? t("auth.welcome") : t("auth.registered"));
      const role = (res.data?.user as { role?: string } | undefined)?.role;
      const target = safeNext(next) ?? (role === "KITCHEN" ? "/kitchen" : role === "ADMIN" || role === "MANAGER" ? "/admin" : "/account");
      router.replace(target);
      router.refresh();
    } catch {
      setFormError(t("common.networkError"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {preview ? <p className="rounded-[12px] bg-warning/10 px-4 py-3 text-sm text-warning">{t("auth.previewDisabled")}</p> : null}
      {mode === "register" ? (
        <Field label={t("auth.name")} htmlFor="name" error={err("name")}>
          <Input id="name" autoComplete="name" aria-invalid={!!formState.errors.name} {...register("name")} />
        </Field>
      ) : null}
      <Field label={t("auth.email")} htmlFor="email" error={err("email")}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!formState.errors.email} {...register("email")} />
      </Field>
      <Field label={t("auth.password")} htmlFor="password" error={err("password")} hint={mode === "register" ? t("auth.passwordHint") : undefined}>
        <div className="relative">
          <Input
            id="password"
            type={show ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            aria-invalid={!!formState.errors.password}
            className="pr-11"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:text-cream"
            aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      {formError ? (
        <p role="alert" className="rounded-[12px] bg-danger/10 px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
        {mode === "login" ? t("auth.submitLogin") : t("auth.submitRegister")}
      </Button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
        <Link
          href={mode === "login" ? `/register${next ? `?next=${encodeURIComponent(next)}` : ""}` : `/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-accent hover:underline"
        >
          {mode === "login" ? t("auth.toRegister") : t("auth.toLogin")}
        </Link>
      </p>
    </form>
  );
}
