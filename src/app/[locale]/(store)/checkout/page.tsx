import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";
import { getOrderingState, getRestaurant } from "@/server/restaurant";
import { CheckoutForm } from "@/components/store/checkout-form";
import { CheckoutSteps } from "@/components/store/checkout-steps";
import { isPreview } from "@/lib/preview";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("checkout");
  const [user, restaurant, ordering] = await Promise.all([getSessionUser(), getRestaurant(), getOrderingState()]);
  const addresses = user
    ? await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] })
    : [];

  return (
    <div className="container-page pt-32 lg:pt-40">
      <h1 className="font-display text-4xl font-semibold sm:text-5xl">{t("title")}</h1>
      <CheckoutSteps current={2} />
      <CheckoutForm
        user={user ? { name: user.name, email: user.email, phone: user.phone } : null}
        addresses={addresses.map((a) => ({
          id: a.id,
          label: a.label,
          street: a.street,
          apartment: a.apartment ?? "",
          entrance: a.entrance ?? "",
          floor: a.floor ?? "",
          notes: a.notes ?? "",
          isDefault: a.isDefault,
        }))}
        settings={{
          estimatedDeliveryMin: restaurant.settings.estimatedDeliveryMin,
          estimatedPickupMin: restaurant.settings.estimatedPickupMin,
        }}
        canOrder={ordering.canOrder}
        preview={isPreview}
      />
    </div>
  );
}
