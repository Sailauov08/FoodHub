import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      <svg viewBox="0 0 64 64" className="size-8" aria-hidden>
        <path d="M10 30c0-10 9.8-17 22-17s22 7 22 17H10z" fill="#FF6B35" />
        <rect x="8" y="34" width="48" height="6" rx="3" fill="#FFF8F0" />
        <path d="M10 44h44c0 5-4 8.5-8.5 8.5h-27C14 52.5 10 49 10 44z" fill="#FF6B35" />
      </svg>
      <span className="text-[26px] leading-none font-extrabold tracking-[0.04em] text-cream">FOODHUB</span>
    </span>
  );
}
