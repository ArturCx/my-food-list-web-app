"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { RestaurantMap } from "@/components/map";
import { RestaurantList } from "@/components/restaurant/list";
import { RestaurantDetails } from "@/components/restaurant/details";
import { cn } from "@/lib/utils";
import type { Category, Restaurant, RestaurantPin } from "@/lib/schema";
import { useUserPlaces } from "@/components/user/user-places-provider";
import { useIsMobile } from "@/lib/use-media-query";
import { BottomSheet, snapHeight, type Snap } from "@/components/mobile/bottom-sheet";
import { TopBar } from "@/components/mobile/top-bar";

/** Sem seleção mostra tudo; com seleção, mostra só quem tem TODAS as categorias marcadas. */
export function matchesCategories(r: Restaurant, selected: Set<Category>) {
  for (const c of selected) if (!r.categories.includes(c)) return false;
  return true;
}

const LIST_W = 400;
const PANEL_W = 500;
const GUTTER = 28;
/** Painel de detalhe fica mais à esquerda para não cobrir os controles do mapa (zoom, localizar). */
const PANEL_RIGHT = 65;

export function Explorer({
  restaurants,
  editable = false,
  authEnabled = false,
}: {
  restaurants: Restaurant[];
  editable?: boolean;
  authEnabled?: boolean;
}) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [categories, setCategories] = useState<Set<Category>>(() => new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { signedIn, places } = useUserPlaces();
  // Favoritos = 5 estrelas do usuário. Deslogado, o filtro some e é desligado.
  const favoriteSlugs = useMemo(() => new Set(Object.entries(places).filter(([, v]) => v.rating === 5).map(([k]) => k)), [places]);
  const favoritesActive = favoritesOnly && signedIn;
  const base = useMemo(() => (favoritesActive ? restaurants.filter((r) => favoriteSlugs.has(r.slug)) : restaurants), [restaurants, favoritesActive, favoriteSlugs]);
  const isMobile = useIsMobile();
  const [snap, setSnap] = useState<Snap>("half"); // posição do bottom sheet (só mobile)
  const [sheetPx, setSheetPx] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const pins = useMemo<RestaurantPin[]>(
    () =>
      base
        .filter((r) => r.coordinates && matchesCategories(r, categories))
        .map((r) => ({ slug: r.slug, name: r.name, categories: r.categories, badge: r.badge, coordinates: r.coordinates! })),
    [base, categories],
  );

  const selected = restaurants.find((r) => r.slug === selectedSlug) ?? null;

  // Selecionar (lista ou pin): no celular o sheet vai para a metade mostrando o detalhe, mapa visível em cima.
  const onSelect = useCallback((slug: string) => {
    setSelectedSlug(slug);
    setSnap("half");
  }, []);
  // Fechar detalhe: volta para a lista, na mesma altura.
  const close = useCallback(() => setSelectedSlug(null), []);
  // Toque no mapa fora de pins: desmarca e recolhe o sheet para o mapa respirar.
  const onMapDeselect = useCallback(() => {
    setSelectedSlug(null);
    setSnap("peek");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // Área livre do mapa: desktop = entre lista e painel; mobile = entre a barra do topo e o sheet.
  // No celular usa a altura de DESTINO do sheet (snap), não a atual: ao selecionar com o sheet
  // cheio, o voo acontece antes de ele descer para a metade, e o pin ia parar atrás da barra do topo.
  const padding = useMemo(() => {
    if (!isMobile) return { left: LIST_W + GUTTER, right: selected ? PANEL_W + PANEL_RIGHT : 0 };
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    return { top: 96, bottom: snapHeight(snap, vh) + 12 };
  }, [isMobile, snap, selected]);

  const list = (
    <RestaurantList
      restaurants={base}
      total={restaurants.length}
      favorites={signedIn ? { active: favoritesOnly, count: favoriteSlugs.size, onChange: setFavoritesOnly } : undefined}
      selectedSlug={selectedSlug}
      onSelect={onSelect}
      categories={categories}
      onCategoriesChange={setCategories}
      authEnabled={authEnabled}
      hideHeader={isMobile}
    />
  );

  const noticeEl = notice && (
    <div role="status" className="glass animate-in fade-in slide-in-from-top-2 absolute top-[max(72px,calc(env(safe-area-inset-top)+64px))] left-1/2 z-40 max-w-[min(92vw,480px)] -translate-x-1/2 rounded-full px-4 py-2.5 text-center text-xs font-semibold md:top-5">
      {notice}
    </div>
  );

  /* ---------------- Mobile: mapa + barra do topo + um único bottom sheet ---------------- */
  if (isMobile) {
    const sheetHeader = selected ? (
      <div className="flex items-center gap-2 px-3 pb-2">
        <button type="button" onClick={close} aria-label="Voltar à lista" className="glass-soft flex size-9 shrink-0 items-center justify-center rounded-full">
          <ArrowLeft className="size-4" />
        </button>
        <p className="min-w-0 flex-1 truncate text-[15px] font-extrabold">{selected.name}</p>
      </div>
    ) : (
      <div className="flex items-center justify-between px-5 pb-2">
        <p className="text-[15px] font-extrabold">Lugares</p>
        <p className="text-xs text-muted-foreground">{pins.length} no mapa{categories.size > 0 || favoritesActive ? " · filtrado" : ""}</p>
      </div>
    );
    return (
      <div className="relative h-dvh w-full overflow-hidden bg-background" style={{ "--sheet-h": `${sheetPx}px` } as React.CSSProperties}>
        <div className="absolute inset-0">
          <RestaurantMap pins={pins} selectedSlug={selectedSlug} onSelect={onSelect} onDeselect={onMapDeselect} onNotice={setNotice} padding={padding} />
        </div>
        <TopBar title="My Food List" subtitle={`${restaurants.length} locais em Belo Horizonte`} authEnabled={authEnabled} />
        {noticeEl}
        <BottomSheet snap={snap} onSnapChange={setSnap} onHeightChange={setSheetPx} header={sheetHeader}>
          {selected ? <RestaurantDetails key={selected.slug} r={selected} editable={editable} /> : list}
        </BottomSheet>
      </div>
    );
  }

  /* ---------------- Desktop: lista à esquerda, painel de detalhe à direita ---------------- */
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <div className="absolute inset-0">
        <RestaurantMap pins={pins} selectedSlug={selectedSlug} onSelect={onSelect} onDeselect={close} onNotice={setNotice} padding={padding} />
      </div>

      <aside className="glass absolute top-7 bottom-7 left-7 z-10 flex w-[400px] flex-col overflow-hidden rounded-[28px]">
        {list}
      </aside>

      {noticeEl}

      <section
        aria-hidden={!selected}
        className={cn(
          "glass mfl-scroll absolute top-7 bottom-7 z-30 w-[500px] overflow-y-auto rounded-[28px] transition-all duration-300",
          selected ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-6 opacity-0",
        )}
        style={{ right: PANEL_RIGHT }}
      >
        {selected && <RestaurantDetails key={selected.slug} r={selected} onClose={close} editable={editable} />}
      </section>
    </div>
  );
}
