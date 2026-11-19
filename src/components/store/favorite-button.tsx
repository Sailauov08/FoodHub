"use client";

import { useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { create } from "zustand";
import { authClient } from "@/lib/auth-client";
import { toggleFavorite } from "@/actions/account";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type FavState = { ids: Set<string>; loadedFor: string | null; loading: boolean; set: (ids: Set<string>, user: string | null) => void };
const useFavorites = create<FavState>((set) => ({
  ids: new Set(),
  loadedFor: null,
  loading: false,
  set: (ids, user) => set({ ids, loadedFor: user, loading: false }),
}));

function useFavoriteIds(userId: string | null) {
  const state = useFavorites();
  useEffect(() => {
    if (!userId) {
      if (state.loadedFor) state.set(new Set(), null);
      return;
    }
    if (state.loadedFor === userId || state.loading) return;
    useFavorites.setState({ loading: true });
    fetch("/api/favorites")
      .then((r) => (r.ok ? r.json() : { ids: [] }))
      .then((j: { ids: string[] }) => state.set(new Set(j.ids), userId))
      .catch(() => state.set(new Set(), userId));
  }, [userId, state]);
  return state.ids;
}

export function FavoriteButton({ productId, className }: { productId: string; className?: string }) {
  const t = useTranslations("product");
  const { data: session } = authClient.useSession();
  const userId = session?.user.id ?? null;
  const ids = useFavoriteIds(userId);
  const active = ids.has(productId);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={active}
      aria-label={!userId ? t("favoriteLogin") : active ? t("favoriteRemove") : t("favoriteAdd")}
      onClick={() => {
        if (!userId) {
          toast(t("favoriteLogin"));
          router.push("/login");
          return;
        }
        start(async () => {
          const res = await toggleFavorite(productId);
          if (res.ok && res.data) {
            const next = new Set(useFavorites.getState().ids);
            if (res.data.favorite) next.add(productId);
            else next.delete(productId);
            useFavorites.getState().set(next, userId);
          } else {
            toast.error(t("favoriteLogin"));
          }
        });
      }}
      className={cn(
        "z-10 grid size-10 place-items-center rounded-full border border-white/10 bg-background/70 backdrop-blur transition-colors hover:border-accent/60",
        active ? "text-accent" : "text-cream",
        className,
      )}
    >
      <Heart className={cn("size-[18px] transition-transform", active && "scale-110 fill-accent")} />
    </button>
  );
}
