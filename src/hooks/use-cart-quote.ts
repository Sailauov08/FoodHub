"use client";

import { useEffect, useMemo, useState } from "react";
import { cartLines, useCart } from "@/stores/cart";
import type { Quote } from "@/server/orders";

export type QuoteState = { quote: Quote | null; loading: boolean; error: string | null };

/** Asks the server for authoritative prices whenever the cart, coupon or fulfillment changes. */
export function useCartQuote(fulfillment: "DELIVERY" | "PICKUP" = "DELIVERY", enabled = true): QuoteState & { refresh: () => void } {
  const items = useCart((s) => s.items);
  const couponCode = useCart((s) => s.couponCode);
  const hydrated = useCart((s) => s.hydrated);
  const [state, setState] = useState<QuoteState>({ quote: null, loading: true, error: null });
  const [nonce, setNonce] = useState(0);

  const body = useMemo(
    () => JSON.stringify({ lines: cartLines(items), couponCode, fulfillment }),
    [items, couponCode, fulfillment],
  );

  useEffect(() => {
    if (!enabled || !hydrated) return;
    if (items.length === 0) {
      setState({ quote: null, loading: false, error: null });
      return;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: ctrl.signal,
        });
        const json = (await res.json()) as { ok: boolean; quote?: Quote; error?: string };
        if (!res.ok || !json.ok || !json.quote) throw new Error(json.error ?? "QUOTE_FAILED");
        setState({ quote: json.quote, loading: false, error: null });
      } catch (err) {
        if (ctrl.signal.aborted) return;
        setState((s) => ({ quote: s.quote, loading: false, error: err instanceof Error ? err.message : "QUOTE_FAILED" }));
      }
    }, 250);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [body, enabled, hydrated, items.length, nonce]);

  return { ...state, refresh: () => setNonce((n) => n + 1) };
}
