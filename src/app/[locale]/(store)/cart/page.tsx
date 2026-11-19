import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CartView } from "@/components/store/cart-view";
import { CheckoutSteps } from "@/components/store/checkout-steps";

export async function generateMetadata({ params }: PageProps<"/[locale]/cart">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cart" });
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cart");
  return (
    <div className="container-page pt-32 lg:pt-40">
      <h1 className="font-display text-4xl font-semibold sm:text-5xl">{t("title")}</h1>
      <CheckoutSteps current={1} />
      <CartView />
    </div>
  );
}
