import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/session";
import { ProfileForm, SecurityForm } from "@/components/store/account-settings";
import { isPreview } from "@/lib/preview";

export default async function AccountSettings({ params }: PageProps<"/[locale]/account/settings">) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Preview mode: the layout shows a setup-required screen; never touch the database here.
  if (isPreview) return null;
  const sessionUser = await requirePageRole("ANY", "/account/settings");
  const t = await getTranslations("account");
  const user = await db.user.findUniqueOrThrow({ where: { id: sessionUser.id }, select: { name: true, email: true, phone: true, locale: true } });
  return (
    <div className="space-y-8">
      <section className="rounded-[22px] border border-border bg-surface p-6 sm:p-8">
        <h2 className="font-display text-2xl font-semibold">{t("profile")}</h2>
        <p className="mt-1 text-sm text-muted">{user.email}</p>
        <div className="mt-6">
          <ProfileForm initial={{ name: user.name, phone: user.phone ?? "", locale: (user.locale as "kk" | "ru" | "en") ?? "kk" }} />
        </div>
      </section>
      <section className="rounded-[22px] border border-border bg-surface p-6 sm:p-8">
        <h2 className="font-display text-2xl font-semibold">{t("security")}</h2>
        <div className="mt-6">
          <SecurityForm />
        </div>
      </section>
    </div>
  );
}
