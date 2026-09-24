"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Route, SlidersHorizontal, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR, CATEGORY_GRADIENT } from "@/lib/categories";
import { photoUrl } from "@/lib/photos";
import { CATEGORY_ICON } from "@/lib/category-icons";
import { CATEGORIES, type Category, type Restaurant } from "@/lib/schema";
import { matchesCategories } from "@/components/explorer";
import { AuthMenu } from "@/components/user/auth-menu";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

type Props = {
  restaurants: Restaurant[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  categories: Set<Category>;
  onCategoriesChange: (c: Set<Category>) => void;
  authEnabled?: boolean;
  /** Total geral (o `restaurants` pode vir já filtrado por favoritos). */
  total?: number;
  /** Filtro "Favoritos" (5 estrelas); ausente quando deslogado. */
  favorites?: { active: boolean; count: number; onChange: (v: boolean) => void };
  /** No celular o cabeçalho (logo, ações) vive na barra do topo. */
  hideHeader?: boolean;
};

export function RestaurantList({ restaurants, selectedSlug, onSelect, categories, onCategoriesChange, authEnabled = false, total, favorites, hideHeader = false }: Props) {
  const cats = (Object.keys(CATEGORIES) as Category[])
    .filter((c) => restaurants.some((r) => r.categories.includes(c)))
    .sort((a, b) => CATEGORIES[a].localeCompare(CATEGORIES[b], "pt-BR"));
  const visible = restaurants.filter((r) => matchesCategories(r, categories));
  const filterKey = [...categories].sort().join("|"); // muda → lista reanima
  const toggle = (c: Category) => {
    const next = new Set(categories);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    onCategoriesChange(next);
  };

  // Item selecionado pelo mapa rola até ficar visível.
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  useEffect(() => {
    if (!selectedSlug) return;
    itemRefs.current.get(selectedSlug)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedSlug]);

  return (
    <div className="flex h-full flex-col">
      {!hideHeader && (
      <header className="flex items-center gap-3 px-5 pt-5 pb-3">
        <BrandMark size={56} />
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight">My Food List</h1>
          <p className="text-xs text-muted-foreground">
            {total ?? restaurants.length} locais no mapa
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Link href="/rota" aria-label="Traçar rota entre bares" title="Rolê de bares" className="glass-soft flex size-10 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95">
            <Route className="size-4" />
          </Link>
          <AuthMenu enabled={authEnabled} />
        </div>
      </header>
      )}

      {/* Filtro por categoria: linha rolável com ícone e cor de cada categoria */}
      <section aria-label="Filtrar por categoria" className="border-b border-white/60 dark:border-white/10 pb-3">
        <div className="flex items-center justify-between px-5 pb-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <SlidersHorizontal className="size-3.5" /> Categorias
          </span>
          {(categories.size > 0 || favorites?.active) && (
            <button
              type="button"
              onClick={() => { onCategoriesChange(new Set()); favorites?.onChange(false); }}
              className="animate-in fade-in flex min-h-7 items-center gap-1 rounded-full bg-primary/10 dark:bg-white/12 px-2.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary/15 dark:hover:bg-white/22"
            >
              <X className="size-3" /> Limpar ({categories.size + (favorites?.active ? 1 : 0)})
            </button>
          )}
        </div>
        <div className="mfl-noscrollbar flex gap-2 overflow-x-auto px-5">
          {favorites && (
            <button
              type="button"
              onClick={() => favorites.onChange(!favorites.active)}
              aria-pressed={favorites.active}
              className={cn(
                "flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border pr-3 pl-2 text-xs font-semibold",
                "transition-[background-color,color,border-color,transform] duration-200 ease-out active:scale-95",
                favorites.active ? "border-transparent bg-amber-400 text-slate-900 shadow-[0_6px_16px_rgba(245,158,11,0.35)]" : "border-white/70 bg-white/45 hover:bg-white/75 dark:border-white/15 dark:bg-white/12 dark:hover:bg-white/22",
              )}
            >
              <span className={cn("flex size-5 items-center justify-center rounded-full", favorites.active ? "bg-slate-900/15" : "bg-amber-400 text-slate-900")}>
                <Star className="size-3" strokeWidth={2.5} fill="currentColor" />
              </span>
              Favoritos{favorites.count > 0 && <span className="opacity-70">{favorites.count}</span>}
            </button>
          )}
          {cats.map((c) => {
            const active = categories.has(c);
            // Combinar com a seleção atual daria algum resultado? Se não, desabilita.
            const possible = active || restaurants.some((r) => matchesCategories(r, new Set([...categories, c])));
            return <CategoryChip key={c} category={c} active={active} disabled={!possible} onClick={() => toggle(c)} />;
          })}
        </div>
      </section>

      <p className="px-5 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground" aria-live="polite">
        {favorites?.active && visible.length === restaurants.length
          ? `${visible.length} ${visible.length === 1 ? "favorito" : "favoritos"}`
          : visible.length === restaurants.length
          ? "Todos os lugares"
          : `${visible.length} ${visible.length === 1 ? "lugar" : "lugares"} com ${[...categories].map((c) => CATEGORIES[c]).join(" + ")}`}
      </p>

      <ul key={filterKey} className="mfl-scroll flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3">
        {visible.map((r, i) => {
          const active = r.slug === selectedSlug;
          const color = CATEGORY_COLOR[r.categories[0]];
          return (
            <li
              key={r.slug}
              ref={(el) => { if (el) itemRefs.current.set(r.slug, el); else itemRefs.current.delete(r.slug); }}
              className="mfl-rise"
              style={{ "--i": i } as React.CSSProperties}
            >
              <button
                type="button"
                onClick={() => onSelect(r.slug)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-2xl p-3 text-left",
                  "transition-[background-color,box-shadow,transform] duration-200 ease-out",
                  "hover:bg-white/55 dark:bg-white/12 hover:shadow-[0_6px_18px_rgba(15,23,42,0.08)] active:scale-[0.99]",
                  active && "bg-white/90 dark:bg-white/20 shadow-[0_10px_28px_rgba(15,23,42,0.14)] ring-1 ring-white dark:ring-white/20",
                )}
              >
                {/* Barra lateral na cor da categoria, aparece no item ativo */}
                <span
                  aria-hidden
                  className={cn("absolute top-3 bottom-3 left-0 w-1 rounded-full transition-all duration-300", active ? "opacity-100" : "opacity-0")}
                  style={{ background: color }}
                />
                <Thumb photo={r.photos[0]} category={r.categories[0]} active={active} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold">{r.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {r.badge ? (
                      <span className="font-semibold text-rose-500">{r.badge}</span>
                    ) : (
                      r.categories.map((c) => CATEGORIES[c]).join(", ")
                    )}
                    {" · "}
                    {neighborhood(r.address)}
                  </div>
                </div>
                {!r.coordinates && (
                  <span className="rounded-full bg-white/60 dark:bg-white/12 px-2 py-0.5 text-[10px] text-muted-foreground">sem pin</span>
                )}
              </button>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="animate-in fade-in zoom-in-95 m-2 rounded-2xl bg-white/50 dark:bg-white/12 p-6 text-center text-sm text-muted-foreground">
            {favorites?.active && favorites.count === 0 ? "Dê 5 estrelas a um lugar e ele aparece aqui." : "Nenhum lugar com essa combinação."}
          </li>
        )}
      </ul>
    </div>
  );
}

function CategoryChip({ category, active, disabled, onClick }: { category: Category; active: boolean; disabled: boolean; onClick: () => void }) {
  const Icon = CATEGORY_ICON[category];
  const color = CATEGORY_COLOR[category];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      className={cn(
        "flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border pr-3 pl-2 text-xs font-semibold",
        "transition-[background-color,color,border-color,transform,opacity] duration-200 ease-out active:scale-95",
        active ? "border-transparent text-white shadow-[0_6px_16px_rgba(15,23,42,0.18)]" : "border-white/70 dark:border-white/15 bg-white/45 dark:bg-white/12 hover:bg-white/75 dark:bg-white/20",
        disabled && "cursor-not-allowed opacity-35 hover:bg-white/45 dark:bg-white/12",
      )}
      style={active ? { background: color } : undefined}
    >
      <span
        className={cn("flex size-5 items-center justify-center rounded-full transition-colors", active ? "bg-white/20" : "text-white")}
        style={active ? undefined : { background: color }}
      >
        <Icon className="size-3" strokeWidth={2.5} />
      </span>
      {CATEGORIES[category]}
    </button>
  );
}

/** Miniatura: foto desfocada ao fundo e o ícone da primeira categoria por cima. */
function Thumb({ photo, category, active }: { photo?: string; category: Category; active: boolean }) {
  const Icon = CATEGORY_ICON[category];
  return (
    <div
      className={cn(
        "relative size-12 shrink-0 overflow-hidden rounded-[14px] transition-transform duration-200 ease-out",
        "group-hover:scale-105",
        active && "scale-105 ring-2 ring-white dark:ring-white/30",
      )}
      aria-hidden
    >
      <div
        className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.4]"
        style={{
          backgroundImage: photo ? `url(${photoUrl(photo, "thumb")})` : CATEGORY_GRADIENT[category],
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(4px)",
          transform: "scale(1.3)", // esconde a borda clara que o blur cria
        }}
      />
      <div className="absolute inset-0" style={{ background: "rgba(15, 23, 42, 0.38)" }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon className="size-5 text-white" strokeWidth={2.25} style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }} />
      </div>
    </div>
  );
}

/** "R. X, 12 - Bairro, Cidade - MG" → "Bairro" */
function neighborhood(address: string) {
  const m = address.match(/-\s*([^,]+),/);
  return m ? m[1].trim() : address.split(",")[0];
}
