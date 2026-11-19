import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MANAGEMENT_ROLES, requirePageRole } from "@/lib/session";
import { AdminNav } from "@/components/admin/admin-nav";
import { isPreview } from "@/lib/preview";
import { SetupRequired } from "@/components/setup-required";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LayoutProps<"/[locale]/admin">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: { default: t("title"), template: `%s · ${t("title")}` }, robots: { index: false, follow: false } };
}

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (isPreview) {
    // Interface structure only; every admin screen needs the database, so none of them is rendered.
    return (
      <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
        <AdminNav user={null} />
        <main id="main" className="min-w-0 px-4 pt-20 pb-16 sm:px-6 lg:px-10 lg:pt-10">
          <SetupRequired area="admin" />
        </main>
      </div>
    );
  }
  const user = await requirePageRole(MANAGEMENT_ROLES, "/admin");
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <AdminNav user={{ name: user.name, role: user.role }} />
      <main id="main" className="min-w-0 px-4 pt-20 pb-16 sm:px-6 lg:px-10 lg:pt-10">
        {children}
      </main>
    </div>
  );
}
