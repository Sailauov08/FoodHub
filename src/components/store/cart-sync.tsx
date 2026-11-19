"use client";

import { useEffect, useRef } from "react";
import { cartLines, useCart } from "@/stores/cart";

type Lines = Parameters<ReturnType<typeof useCart.getState>["replaceLines"]>[0];

/**
 * Keeps the local cart and the account cart in sync.
 *  - Signed in, local cart not yet linked to this account (guest cart or another user's): merge once, then link.
 *  - Signed in, local cart already linked: this device's copy is the latest (changes may not have reached the
 *    server before a navigation), so it replaces the server copy — never merged again, which would double
 *    quantities on every page load.
 *  - Signed out with a cart that belongs to an account: clear it (the account keeps its server copy).
 * After that, every local change is pushed to the server (debounced, and flushed when the page is hidden).
 */
export function CartSync({ userId, pending }: { userId: string | null; pending: boolean }) {
  const hydrated = useCart((s) => s.hydrated);
  const items = useCart((s) => s.items);
  const syncedFor = useRef<string | null>(null);
  const ready = useRef(false);

  useEffect(() => {
    if (!hydrated || pending) return;
    const { ownerId, clear, setOwner, replaceLines } = useCart.getState();

    if (!userId) {
      syncedFor.current = null;
      ready.current = false;
      if (ownerId) {
        clear();
        setOwner(null);
      }
      return;
    }
    if (syncedFor.current === userId) return;
    syncedFor.current = userId;
    ready.current = false;

    const linked = ownerId === userId;
    (async () => {
      try {
        const res = await fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: linked ? "replace" : "merge", lines: cartLines(useCart.getState().items) }),
        });
        if (res.ok) {
          const json = (await res.json()) as { lines: Lines };
          replaceLines(json.lines);
          setOwner(userId);
        }
      } catch {
        // Offline: keep the local cart; the next change retries the sync.
      } finally {
        ready.current = true;
      }
    })();
  }, [hydrated, pending, userId]);

  useEffect(() => {
    if (!userId || !ready.current) return;
    const push = () =>
      fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "replace", lines: cartLines(items) }),
        keepalive: true,
      }).catch(() => undefined);
    const t = setTimeout(push, 400);
    // Navigating away before the debounce fires must not lose the change.
    const onHide = () => {
      clearTimeout(t);
      void push();
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pagehide", onHide);
    };
  }, [items, userId]);

  return null;
}
