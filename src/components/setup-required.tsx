import { getTranslations } from "next-intl/server";
import { Database, FileText, KeyRound, Terminal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shown instead of database-backed screens when no DATABASE_URL is configured.
 * It never renders fixture data as if it were real business data.
 */
export async function SetupRequired({ area, className }: { area: "account" | "admin" | "kitchen"; className?: string }) {
  const t = await getTranslations("setup");
  const steps = [
    { icon: KeyRound, title: t("step1Title"), text: t("step1Text") },
    { icon: Terminal, title: t("step2Title"), text: t("step2Text") },
    { icon: FileText, title: t("step3Title"), text: t("step3Text") },
  ];
  return (
    <section
      aria-labelledby="setup-title"
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-border bg-surface p-6 sm:p-10",
        "bg-[radial-gradient(700px_260px_at_100%_0%,rgb(255_107_53/0.14),transparent_70%)]",
        className,
      )}
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Database className="size-7" />
      </span>
      <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-accent uppercase">{t("eyebrow")}</p>
      <h1 id="setup-title" className="mt-2 font-display text-3xl font-semibold text-balance sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted">{t(`${area}Text`)}</p>
      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="rounded-[18px] border border-border bg-background/50 p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">{i + 1}</span>
              <Icon className="size-5 text-accent" aria-hidden />
            </div>
            <p className="mt-4 font-semibold">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/menu">{t("browseMenu")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">{t("home")}</Link>
        </Button>
      </div>
    </section>
  );
}
