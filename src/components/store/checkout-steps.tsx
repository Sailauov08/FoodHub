import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Cart → Details → Confirmation progress indicator for the purchase flow. */
export async function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  const t = await getTranslations("checkout");
  const steps = [t("stepCart"), t("stepDetails"), t("stepDone")];
  return (
    <nav aria-label={t("progress")} className="mt-6">
      <ol className="flex items-center gap-2 sm:gap-3">
        {steps.map((label, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <li key={label} className="flex min-w-0 items-center gap-2 sm:gap-3" aria-current={active ? "step" : undefined}>
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full border-2 text-[13px] font-bold transition-colors",
                  done && "border-accent bg-accent text-accent-foreground",
                  active && "border-accent text-accent",
                  !done && !active && "border-surface-3 text-muted-2",
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : n}
              </span>
              <span className={cn("text-sm font-semibold whitespace-nowrap", active ? "text-cream" : "sr-only text-muted-2 sm:not-sr-only")}>{label}</span>
              {n < steps.length ? <span aria-hidden className={cn("h-0.5 w-6 rounded-full sm:w-12", done ? "bg-accent" : "bg-surface-3")} /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
