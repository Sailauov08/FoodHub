"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations();
  return (
    <main id="main" className="grid min-h-[70dvh] place-items-center px-6 pt-28 text-center">
      <div>
        <h1 className="font-display text-4xl font-semibold">{t("errors.errorTitle")}</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">{t("errors.errorText")}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={reset}>{t("common.retry")}</Button>
          <Button asChild variant="outline">
            <Link href="/">{t("errors.goHome")}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
