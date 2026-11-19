"use client";

import { useTranslations } from "next-intl";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/stores/cart";

/** Copies the promo code and also pre-fills it in the cart. */
export function CopyCode({ code }: { code: string }) {
  const t = useTranslations("offers");
  const setCoupon = useCart((s) => s.setCoupon);
  return (
    <button
      type="button"
      onClick={async () => {
        setCoupon(code);
        try {
          await navigator.clipboard.writeText(code);
        } catch {
          // Clipboard may be unavailable (insecure context); the code is still applied to the cart.
        }
        toast.success(t("copied"), { description: code });
      }}
      className="inline-flex items-center gap-2 rounded-full border border-dashed border-accent/70 bg-background/40 px-4 py-2 font-mono text-[15px] font-bold tracking-widest text-cream transition-colors hover:bg-accent-soft"
      aria-label={`${t("copy")}: ${code}`}
    >
      {code}
      <Copy className="size-4 text-accent" />
    </button>
  );
}
