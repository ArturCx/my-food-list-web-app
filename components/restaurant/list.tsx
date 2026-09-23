"use client";

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_GRADIENT } from "@/lib/categories";
import { CATEGORIES, type Category, type Restaurant } from "@/lib/schema";

type Props = {
  restaurants: Restaurant[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  category: Category | null;
  onCategoryChange: (c: Category | null) => void;
  pinCount: number;
};

export function RestaurantList({ restaurants, selectedSlug, onSelect, category, onCategoryChange, pinCount }: Props) {
  const cats = (Object.keys(CATEGORIES) as Category[]).filter((c) =>
    restaurants.some((r) => r.category === c),
  );
  const visible = category ? restaurants.filter((r) => r.category === category) : restaurants;

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <header className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <MapPin className="size-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight">My Food List</h1>
          <p className="text-xs text-muted-foreground">
            {restaurants.length} lugares em Belo Horizonte · {pinCount} no mapa
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        <Chip active={category === null} onClick={() => onCategoryChange(null)}>
          Todos
        </Chip>
        {cats.map((c) => (
          <Chip key={c} active={category === c} onClick={() => onCategoryChange(c)}>
            {CATEGORIES[c]}
          </Chip>
        ))}
      </div>

      <ul className="mfl-scroll -mx-2 flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2">
        {visible.map((r) => {
          const active = r.slug === selectedSlug;
          return (
            <li key={r.slug}>
              <button
                type="button"
                onClick={() => onSelect(r.slug)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all",
                  "hover:bg-white/50",
                  active && "bg-white/85 shadow-[0_8px_24px_rgba(15,23,42,0.12)]",
                )}
              >
                <div
                  className="size-12 shrink-0 rounded-[14px] bg-cover bg-center"
                  style={{
                    backgroundImage: r.photos[0] ? `url(${r.photos[0]})` : CATEGORY_GRADIENT[r.category],
                  }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold">{r.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {r.badge ? (
                      <span className="font-semibold text-rose-500">{r.badge}</span>
                    ) : (
                      CATEGORIES[r.category]
                    )}
                    {" · "}
                    {neighborhood(r.address)}
                  </div>
                </div>
                {!r.coordinates && (
                  <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] text-muted-foreground">sem pin</span>
                )}
              </button>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">Nenhum lugar nessa categoria.</li>
        )}
      </ul>
    </div>
  );
}

/** "R. X, 12 - Bairro, Cidade - MG" → "Bairro" */
function neighborhood(address: string) {
  const m = address.match(/-\s*([^,]+),/);
  return m ? m[1].trim() : address.split(",")[0];
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-9 rounded-full border px-3.5 text-xs font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-white/70 bg-white/45 hover:bg-white/70",
      )}
    >
      {children}
    </button>
  );
}
