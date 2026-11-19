"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { hydrateCart } from "@/stores/cart";
import { CartSync } from "@/components/store/cart-sync";

/** Loads the persisted cart and reads the session on the client, so storefront pages can stay statically rendered. */
export function SessionCartSync() {
  const { data, isPending } = authClient.useSession();
  useEffect(() => {
    void hydrateCart();
  }, []);
  return <CartSync userId={data?.user.id ?? null} pending={isPending} />;
}
