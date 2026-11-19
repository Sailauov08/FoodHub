"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { formatTime } from "@/lib/domain/money";
import type { Locale } from "@/i18n/config";

/** Re-renders server data periodically while the tab is visible. `renderedAt` comes from the server render. */
export function AutoRefresh({ seconds = 20, renderedAt }: { seconds?: number; renderedAt: string }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const locale = useLocale() as Locale;
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return (
    <button type="button" onClick={() => router.refresh()} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-[12px] text-muted hover:text-cream">
      <RefreshCw className="size-3.5" />
      {t("lastUpdated", { time: formatTime(renderedAt, locale) })}
    </button>
  );
}
