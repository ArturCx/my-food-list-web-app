"use client";

import { useSyncExternalStore } from "react";

/** true quando a media query casa. No servidor devolve `serverDefault`. */
export function useMediaQuery(query: string, serverDefault = false) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}

/** Abaixo do breakpoint `md` do Tailwind. */
export const useIsMobile = () => useMediaQuery("(max-width: 767px)");
