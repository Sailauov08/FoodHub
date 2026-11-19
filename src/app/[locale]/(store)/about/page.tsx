import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check } from "lucide-react";
import { alternatesFor } from "@/lib/site";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("title"), description: t("lead"), alternates: alternatesFor("/about", locale) };
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <div className="container-page pt-32 lg:pt-40">
      <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">{t("home.storyEyebrow")}</p>
          <h1 className="mt-3 font-display text-5xl leading-[1.05] font-semibold sm:text-6xl">{t("about.title")}</h1>
          <p className="mt-6 font-display text-2xl leading-snug text-cream/90">{t("about.lead")}</p>
          <p className="mt-6 leading-relaxed text-muted">{t("about.p1")}</p>
          <p className="mt-4 leading-relaxed text-muted">{t("about.p2")}</p>
          <Button asChild className="mt-8">
            <Link href="/menu">{t("home.viewMenu")}</Link>
          </Button>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] border border-border">
          <Image src="/images/story.jpg" alt="" fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
        </div>
      </div>

      <section className="mt-24 rounded-[28px] border border-border bg-surface p-8 sm:p-12">
        <h2 className="font-display text-3xl font-semibold">{t("about.valuesTitle")}</h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {(["v1", "v2", "v3"] as const).map((k) => (
            <li key={k} className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                <Check className="size-4" strokeWidth={3} />
              </span>
              <span className="text-lg">{t(`about.${k}`)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-10 border-t border-border pt-6 text-sm text-muted-2">{t("about.demo")}</p>
      </section>
    </div>
  );
}
