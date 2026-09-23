"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";

export type UserPlaceData = { rating: number | null; note: string | null };
type Ctx = {
  enabled: boolean;
  signedIn: boolean;
  loaded: boolean;
  places: Record<string, UserPlaceData>;
  /** Resolve true se salvou, false se a API falhou (a mudança é desfeita). */
  update: (slug: string, patch: Partial<UserPlaceData>) => Promise<boolean>;
};

const UserPlacesContext = createContext<Ctx>({ enabled: false, signedIn: false, loaded: true, places: {}, update: async () => false });
export const useUserPlaces = () => useContext(UserPlacesContext);

/** Carrega uma vez as estrelas/notas do usuário e aplica atualizações otimistas. */
export function UserPlacesProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  if (!enabled) return <>{children}</>;
  return <Inner>{children}</Inner>;
}

function Inner({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  // `fetched` guarda o resultado da API por usuário; deslogado é derivado (vazio), sem setState no efeito.
  const [fetched, setFetched] = useState<{ signedIn: boolean; data: Record<string, UserPlaceData> } | null>(null);
  const signedIn = isLoaded && !!isSignedIn;
  const places = useMemo(() => (signedIn && fetched?.signedIn ? fetched.data : {}), [signedIn, fetched]);
  const loaded = !signedIn || fetched?.signedIn === true;

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    fetch("/api/me/places")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => { if (alive) setFetched({ signedIn: true, data }); });
    return () => { alive = false; };
  }, [signedIn]);

  const setPlaces = useCallback((fn: (p: Record<string, UserPlaceData>) => Record<string, UserPlaceData>) => {
    setFetched((f) => ({ signedIn: true, data: fn(f?.data ?? {}) }));
  }, []);

  const update = useCallback(async (slug: string, patch: Partial<UserPlaceData>) => {
    const prev = places[slug] ?? { rating: null, note: null };
    setPlaces((p) => ({ ...p, [slug]: { ...prev, ...patch } }));
    const res = await fetch(`/api/me/places/${slug}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    if (res.ok) {
      const saved = (await res.json()) as UserPlaceData;
      setPlaces((p) => ({ ...p, [slug]: saved }));
      return true;
    }
    setPlaces((p) => ({ ...p, [slug]: prev })); // desfaz
    return false;
  }, [places, setPlaces]);

  return (
    <UserPlacesContext.Provider value={{ enabled: true, signedIn, loaded, places, update }}>
      {children}
    </UserPlacesContext.Provider>
  );
}
