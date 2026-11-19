import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold tracking-wide whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground",
        soft: "bg-accent-soft text-accent",
        neutral: "bg-surface-2 text-muted",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-warning",
        danger: "bg-danger/15 text-danger",
        info: "bg-info/15 text-info",
        outline: "border border-border-strong text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-[10px] bg-surface-2 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.05] before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-[18px] border border-border bg-surface", className)} {...props} />;
}

export function EmptyState({
  icon,
  title,
  text,
  action,
  className,
  headingLevel = "h3",
}: {
  icon?: React.ReactNode;
  headingLevel?: "h1" | "h2" | "h3";
  title: string;
  text?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-border-strong px-6 py-14 text-center", className)}>
      {icon ? <div className="grid size-14 place-items-center rounded-full bg-accent-soft text-accent [&_svg]:size-6">{icon}</div> : null}
      {React.createElement(headingLevel, { className: "font-display text-xl font-semibold" }, title)}
      {text ? <p className="max-w-sm text-sm text-muted">{text}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
  className,
  as: As = "h2",
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        {eyebrow ? <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-accent uppercase">{eyebrow}</p> : null}
        <As className="font-display text-3xl leading-tight font-semibold text-balance sm:text-4xl">{title}</As>
      </div>
      {action}
    </div>
  );
}
