"use client";

import dynamic from "next/dynamic";

/** MapLibre depende de `window`, então o mapa só renderiza no client. */
export const RestaurantMap = dynamic(() => import("./restaurant-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
      Carregando mapa…
    </div>
  ),
});
