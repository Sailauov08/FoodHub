import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionUser } from "@/lib/session";
import { getRestaurant } from "@/server/restaurant";
import { formatKzPhone } from "@/lib/domain/phone";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { isPreview } from "@/lib/preview";

export default async function AdminSettings({ params }: PageProps<"/[locale]/admin/settings">) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Preview mode: the layout shows a setup-required screen; never touch the database here.
  if (isPreview) return null;
  const t = await getTranslations("admin");
  const viewer = await getSessionUser();
  const r = await getRestaurant();
  const s = r.settings;
  return (
    <div>
      <PageHeader title={t("settings")} description={viewer?.isDemo ? t("demoReadOnly") : viewer?.role !== "ADMIN" ? t("adminOnly") : undefined} />
      <SettingsForm
        readOnly={viewer?.role !== "ADMIN" || !!viewer?.isDemo}
        initial={{
          phone: formatKzPhone(s.phone),
          email: s.email,
          addressKk: s.addressKk,
          addressRu: s.addressRu,
          addressEn: s.addressEn,
          instagram: s.instagram ?? "",
          deliveryFee: s.deliveryFee,
          freeDeliveryThreshold: s.freeDeliveryThreshold ?? "",
          minOrderValue: s.minOrderValue,
          estimatedDeliveryMin: s.estimatedDeliveryMin,
          estimatedPickupMin: s.estimatedPickupMin,
          acceptingOrders: s.acceptingOrders,
          openingHours: r.hours,
        }}
      />
    </div>
  );
}
