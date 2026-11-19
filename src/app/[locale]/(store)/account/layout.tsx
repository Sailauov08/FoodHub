import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/session";
import { AccountNav } from "@/components/store/account-nav";
import { isPreview } from "@/lib/preview";
import { SetupRequired } from "@/components/setup-required";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LayoutProps<"/[locale]/account">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function AccountLayout({ children, params }: LayoutProps<"/[locale]/account">) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (isPreview) {
    return (
      <div className="container-page pt-32 lg:pt-40">
        <SetupRequired area="account" />
      </div>
    );
  }
  const user = await requirePageRole("ANY", "/account");
  const t = await getTranslations("account");
  return (
    <div className="container-page pt-32 lg:pt-40">
      <p className="text-sm text-muted">{t("hello", { name: user.name })}</p>
      <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">{t("title")}</h1>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[240px_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
