"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { List, X } from "lucide-react";
import { RestaurantMap } from "@/components/map";
import { RestaurantList } from "@/components/restaurant/list";
import { RestaurantDetails } from "@/components/restaurant/details";
import { cn } from "@/lib/utils";
import type { Category, Restaurant, RestaurantPin } from "@/lib/schema";

/** Sem seleção mostra tudo; com seleção, mostra só quem tem TODAS as categorias marcadas. */
export function matchesCategories(r: Restaurant, selected: Set<Category>) {
  for (const c of selected) if (!r.categories.includes(c)) return false;
  return true;
}

const LIST_W = 400;
const PANEL_W = 500;
const GUTTER = 28;

export function Explorer({ restaurants, editable = false }: { restaurants: Restaurant[]; editable?: boolean }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [categories, setCategories] = useState<Set<Category>>(() => new Set());
  const [listOpen, setListOpen] = useState(false); // só mobile

  const pins = useMemo<RestaurantPin[]>(
    () =>
      restaurants
        .filter((r) => r.coordinates && matchesCategories(r, categories))
        .map((r) => ({ slug: r.slug, name: r.name, categories: r.categories, badge: r.badge, coordinates: r.coordinates! })),
    [restaurants, categories],
  );

  const selected = restaurants.find((r) => r.slug === selectedSlug) ?? null;

  const onSelect = useCallback((slug: string) => {
    setSelectedSlug(slug);
    setListOpen(false);
  }, []);
  const close = useCallback(() => setSelectedSlug(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const padding = useMemo(
    () => ({ left: LIST_W + GUTTER, right: selected ? PANEL_W + GUTTER : 0 }),
    [selected],
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      {/* Mapa em tela cheia */}
      <div className="absolute inset-0">
        <RestaurantMap pins={pins} selectedSlug={selectedSlug} onSelect={onSelect} onDeselect={close} padding={padding} />
      </div>

      {/* Lista flutuante (desktop) / sheet (mobile) */}
      <aside
        className={cn(
          "glass absolute z-10 flex flex-col overflow-hidden rounded-[28px] transition-transform duration-300",
          "md:top-7 md:bottom-7 md:left-7 md:w-[400px] md:translate-y-0",
          "inset-x-3 bottom-3 top-[18dvh]",
          listOpen ? "translate-y-0" : "translate-y-[calc(100%+12px)] md:translate-y-0",
        )}
      >
        <RestaurantList
          restaurants={restaurants}
          selectedSlug={selectedSlug}
          onSelect={onSelect}
          categories={categories}
          onCategoriesChange={setCategories}
          pinCount={pins.length}
        />
      </aside>

      {/* Botão da lista (mobile) */}
      <button
        type="button"
        onClick={() => setListOpen((v) => !v)}
        aria-expanded={listOpen}
        className="glass absolute bottom-5 left-1/2 z-20 flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-full px-5 text-sm font-bold transition-transform active:scale-95 md:hidden"
      >
        {listOpen ? <X className="size-4" /> : <List className="size-4" />}
        {listOpen ? "Fechar" : `${restaurants.length} lugares`}
      </button>

      {/* Painel de detalhe */}
      <section
        aria-hidden={!selected}
        className={cn(
          "glass mfl-scroll absolute z-30 overflow-y-auto rounded-[28px] transition-all duration-300",
          "md:top-7 md:bottom-7 md:right-7 md:left-auto md:w-[500px]",
          "inset-x-3 bottom-3 top-[12dvh]",
          selected
            ? "translate-y-0 opacity-100 md:translate-x-0"
            : "pointer-events-none translate-y-[calc(100%+12px)] opacity-0 md:translate-x-6 md:translate-y-0",
        )}
      >
        {selected && <RestaurantDetails key={selected.slug} r={selected} onClose={close} editable={editable} />}
      </section>
    </div>
  );
}
