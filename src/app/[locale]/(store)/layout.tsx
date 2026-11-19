import { getTranslations, setRequestLocale } from "next-intl/server";
import { isPreview } from "@/lib/preview";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { CartDrawer } from "@/components/store/cart-drawer";
import { SessionCartSync } from "@/components/store/session-cart-sync";

export default async function StoreLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");
  return (
    <>
      {isPreview ? (
        <div role="status" className="fixed inset-x-0 bottom-0 z-50 bg-warning px-4 py-2 text-center text-[13px] font-semibold text-background">
          {t("previewBanner")}
        </div>
      ) : null}
      <Header />
      <main id="main" className="min-h-[70dvh]">
        {children}
      </main>
      <Footer />
      {isPreview ? <div aria-hidden className="h-14 sm:h-10" /> : null}
      <CartDrawer />
      <SessionCartSync />
    </>
  );
}
