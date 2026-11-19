"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type HeroSlide = { image: string; slug: string; name: string; price: string };

export function Hero({ slides }: { slides: HeroSlide[] }) {
  const t = useTranslations("home");
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (reduce || paused || count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 6500);
    return () => clearInterval(id);
  }, [reduce, paused, count]);

  const active = slides[index];
  if (!active) return null;

  return (
    // Reduced motion: Motion drops transform animations (opacity only); CSS disables the float loop.
    <MotionConfig reducedMotion="user">
    <section
      className="hero-gradient grain relative isolate overflow-hidden pt-28 pb-14 lg:min-h-[min(100dvh,980px)] lg:pt-40 lg:pb-16"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="container-page grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-4">
        {/* Copy */}
        <div className="relative z-10 order-1">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-[44px] leading-[1.02] font-semibold tracking-[-0.01em] text-balance text-white sm:text-6xl lg:text-[76px] xl:text-[92px]"
          >
            {t("heroTitle")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-[560px] text-[15px] leading-relaxed font-medium text-cream/90 sm:text-[17px]"
          >
            {t("heroText")}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-wrap items-center gap-6 sm:gap-10"
          >
            <Button asChild size="lg" className="min-w-[200px] rounded-[10px] text-[17px]">
              <Link href={`/menu/${active.slug}`}>{t("orderNow")}</Link>
            </Button>
            <Link href="/menu" className="text-[17px] font-semibold text-accent underline-offset-8 transition-colors hover:text-accent-hover hover:underline">
              {t("viewMenu")}
            </Link>
          </motion.div>

          {/* Thumbnails carousel (desktop position: bottom-left like the reference) */}
          <div className="mt-12 hidden lg:block xl:mt-20">
            <Thumbs slides={slides} index={index} go={go} />
          </div>
        </div>

        {/* Floating burger */}
        <div className="relative order-2 mx-auto aspect-[1.2] w-full max-w-[560px] lg:-mr-10 lg:max-w-none xl:-mr-24" aria-live="polite">
          <div aria-hidden className="absolute inset-[12%] rounded-full bg-accent/10 blur-[90px]" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active.image}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.9, rotate: -6, x: 40 }}
              animate={{ opacity: 1, scale: 1, rotate: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.92, rotate: 4, x: -30 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="relative size-full animate-float">
                <Image
                  src={active.image}
                  alt={active.name}
                  fill
                  priority
                  sizes="(min-width: 1024px) 55vw, 92vw"
                  className="object-contain drop-shadow-[0_40px_60px_rgb(0_0_0/0.65)] [mask-image:radial-gradient(ellipse_62%_58%_at_50%_50%,#000_62%,transparent_100%)]"
                />
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="absolute right-2 bottom-2 rounded-2xl border border-border bg-background/70 px-4 py-3 backdrop-blur-md sm:right-6 sm:bottom-6">
            <p className="text-[13px] text-muted">{active.name}</p>
            <p className="font-display text-xl font-semibold text-accent">{active.price}</p>
          </div>
        </div>

        <div className="order-3 lg:hidden">
          <Thumbs slides={slides} index={index} go={go} />
        </div>
      </div>
    </section>
    </MotionConfig>
  );
}

function Thumbs({ slides, index, go }: { slides: HeroSlide[]; index: number; go: (i: number) => void }) {
  const t = useTranslations("home");
  return (
    <div>
      <div className="flex items-center gap-3 sm:gap-6">
        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label={t("prevSlide")}
          className="grid size-11 shrink-0 place-items-center rounded-full border-[2.5px] border-accent text-accent transition-colors hover:bg-accent hover:text-accent-foreground sm:size-12"
        >
          <ArrowLeft className="size-5" strokeWidth={2.75} />
        </button>
        <div className="flex flex-1 items-end gap-3 sm:gap-6">
          {slides.map((s, i) => (
            <button
              key={s.image}
              type="button"
              onClick={() => go(i)}
              aria-label={t("goToSlide", { name: s.name })}
              aria-current={i === index}
              className="group relative flex-1"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute -top-6 left-1/2 size-0 -translate-x-1/2 border-x-[9px] border-t-[12px] border-x-transparent border-t-accent transition-opacity",
                  i === index ? "opacity-100" : "opacity-0",
                )}
              />
              <span
                className={cn(
                  "relative block aspect-[1.25] overflow-hidden rounded-[10px] border bg-[#25272d] transition-all duration-300",
                  i === index ? "-translate-y-2 border-accent/70 shadow-[0_18px_40px_-18px_rgb(255_107_53/0.6)]" : "border-white/5 opacity-80 group-hover:opacity-100",
                )}
              >
                <Image src={s.image} alt="" fill sizes="200px" className="object-contain p-2 [mask-image:radial-gradient(ellipse_62%_58%_at_50%_50%,#000_62%,transparent_100%)] transition-transform duration-300 group-hover:scale-105" />
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label={t("nextSlide")}
          className="grid size-11 shrink-0 place-items-center rounded-full border-[2.5px] border-accent text-accent transition-colors hover:bg-accent hover:text-accent-foreground sm:size-12"
        >
          <ArrowRight className="size-5" strokeWidth={2.75} />
        </button>
      </div>
      <div className="mt-6 flex justify-center gap-2.5" aria-hidden>
        {slides.map((s, i) => (
          <span key={s.image} className={cn("h-2.5 rounded-full transition-all duration-300", i === index ? "w-9 bg-accent" : "w-2.5 bg-cream")} />
        ))}
      </div>
    </div>
  );
}
