import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/store/auth-shell";
import { AuthForm } from "@/components/store/auth-form";
import { isPreview } from "@/lib/preview";
import { DemoAccounts } from "@/components/store/demo-accounts";
import { DEMO_ACCOUNTS } from "@/lib/demo";

export async function generateMetadata({ params }: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("loginTitle"), robots: { index: false, follow: true } };
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("auth");
  return (
    <AuthShell
      title={t("loginTitle")}
      text={t("loginText")}
      aside={!isPreview && process.env.DEMO_PASSWORD ? <DemoAccounts roles={DEMO_ACCOUNTS.map((a) => a.role)} /> : undefined}
    >
      <AuthForm mode="login" next={typeof sp.next === "string" ? sp.next : null} preview={isPreview} />
    </AuthShell>
  );
}
