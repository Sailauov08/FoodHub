import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/store/auth-shell";
import { AuthForm } from "@/components/store/auth-form";
import { isPreview } from "@/lib/preview";

export async function generateMetadata({ params }: PageProps<"/[locale]/register">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("registerTitle"), robots: { index: false, follow: true } };
}

export default async function RegisterPage({ params, searchParams }: PageProps<"/[locale]/register">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("registerTitle")} text={t("registerText")}>
      <AuthForm mode="register" next={typeof sp.next === "string" ? sp.next : null} preview={isPreview} />
    </AuthShell>
  );
}
