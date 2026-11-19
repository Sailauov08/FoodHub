import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/store/logo";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <main id="main" className="hero-gradient grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <Logo />
        <p className="mt-10 font-display text-[120px] leading-none font-semibold text-accent">404</p>
        <h1 className="mt-4 font-display text-3xl font-semibold">{t("notFoundTitle")}</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">{t("notFoundText")}</p>
        <Button asChild className="mt-8">
          <Link href="/">{t("goHome")}</Link>
        </Button>
      </div>
    </main>
  );
}
