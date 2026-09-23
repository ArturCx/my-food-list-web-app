"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Footprints, LocateFixed, Route, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, type Restaurant } from "@/lib/schema";
import { CATEGORY_COLOR } from "@/lib/categories";
import { CATEGORY_ICON } from "@/lib/category-icons";
import type { RouteResult } from "@/app/api/route/route";
import { ROUTE_MAX_STOPS, readRouteSelection, writeRouteSelection } from "@/lib/route-selection";

const RouteMap = dynamic(() => import("@/components/map/route-map"), { ssr: false });
const MAX_STOPS = ROUTE_MAX_STOPS;

export function RoutePlanner({ restaurants }: { restaurants: Restaurant[] }) {
  const places = useMemo(() => restaurants.filter((r) => r.coordinates), [restaurants]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false); // só grava depois de ler o que estava salvo
  const [useLocation, setUseLocation] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seleção persiste no navegador. Lida após a hidratação (por isso não no inicializador do state),
  // e adiada um tick para não setar state de forma síncrona dentro do efeito.
  useEffect(() => {
    const t = setTimeout(() => {
      setSelected(new Set(readRouteSelection()));
      setHydrated(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (hydrated) writeRouteSelection([...selected]);
  }, [selected, hydrated]);

  const toggle = useCallback((slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else if (next.size < MAX_STOPS) next.add(slug);
      return next;
    });
    setResult(null);
  }, []);

  const plan = async () => {
    setBusy(true); setError(null);
    try {
      let start: { lat: number; lng: number } | undefined;
      if (useLocation) {
        start = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }), rej, { enableHighAccuracy: true, timeout: 10000 }),
        );
      }
      const r = await fetch("/api/route", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slugs: [...selected], start }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "falha ao traçar rota");
      setResult(data);
    } catch (e) {
      setError((e as Error).message === "User denied Geolocation" ? "Permita a localização ou desligue o ponto de partida." : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const mapStops = useMemo(() => places.map((r) => ({ slug: r.slug, name: r.name, lat: r.coordinates!.lat, lng: r.coordinates!.lng, selected: selected.has(r.slug) })), [places, selected]);
  const chosen = places.filter((r) => selected.has(r.slug));

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <div className="absolute inset-0"><RouteMap stops={mapStops} result={result} onToggle={toggle} /></div>

      <aside className="glass mfl-scroll absolute inset-x-3 top-[45dvh] bottom-3 z-10 flex flex-col overflow-hidden rounded-[28px] md:inset-auto md:top-7 md:bottom-7 md:left-7 md:w-[400px]">
        <header className="flex items-center gap-3 px-5 pt-5 pb-3">
          <Link href="/" aria-label="Voltar ao mapa" className="glass-soft flex size-10 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight">Rolê de bares</h1>
            <p className="text-xs text-muted-foreground">Escolha os lugares e trace a menor rota a pé</p>
          </div>
        </header>

        <div className="flex items-center gap-2 border-y border-white/60 px-5 py-3">
          <button
            type="button"
            onClick={() => setUseLocation((v) => !v)}
            aria-pressed={useLocation}
            className={cn("flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors", useLocation ? "border-primary bg-primary text-primary-foreground" : "border-white/70 bg-white/45 hover:bg-white/75")}
          >
            <LocateFixed className="size-3.5" /> Partir de onde estou
          </button>
          {selected.size > 0 && (
            <button type="button" onClick={() => { setSelected(new Set()); setResult(null); }} className="ml-auto flex min-h-9 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-muted-foreground hover:bg-white/60">
              <Trash2 className="size-3.5" /> Limpar
            </button>
          )}
        </div>

        {result ? (
          <RouteSummary result={result} onEdit={() => setResult(null)} />
        ) : (
          <ul className="mfl-scroll flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
            {places.map((r) => {
              const on = selected.has(r.slug);
              const Icon = CATEGORY_ICON[r.categories[0]];
              return (
                <li key={r.slug}>
                  <button type="button" onClick={() => toggle(r.slug)} aria-pressed={on} className={cn("flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-white/55", on && "bg-white/85 shadow-[0_6px_18px_rgba(15,23,42,0.08)]")}>
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "border-white/80 text-white")} style={on ? undefined : { background: CATEGORY_COLOR[r.categories[0]] }}>
                      <Icon className="size-4" strokeWidth={2.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold">{r.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{r.categories.map((c) => CATEGORIES[c]).join(", ")}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <footer className="flex flex-col gap-2 border-t border-white/60 p-4">
          {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}
          <button
            type="button"
            onClick={plan}
            disabled={busy || selected.size < 2}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(15,23,42,0.25)] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Route className="size-4" />}
            {busy ? "Calculando…" : selected.size < 2 ? `Escolha ao menos 2 lugares (${selected.size})` : `Traçar rota com ${selected.size} lugares`}
          </button>
          <p className="text-center text-[10px] text-muted-foreground">Rotas a pé via OpenStreetMap · até {MAX_STOPS} paradas</p>
          {chosen.length > 0 && !result && (
            <p className="truncate text-center text-[11px] text-muted-foreground">{chosen.map((r) => r.name).join(" · ")}</p>
          )}
        </footer>
      </aside>
    </div>
  );
}

function RouteSummary({ result, onEdit }: { result: RouteResult; onEdit: () => void }) {
  const hasStart = !result.stops[0].slug;
  return (
    <div className="mfl-scroll flex flex-1 flex-col overflow-y-auto px-5 py-3">
      <div className="animate-in fade-in slide-in-from-bottom-2 mb-3 flex items-end justify-between duration-300">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Rota</p>
          <p className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight"><Footprints className="size-5" /> {fmtKm(result.totalKm)} · {fmtMin(result.totalMin)}</p>
        </div>
        <button type="button" onClick={onEdit} className="min-h-9 rounded-full bg-white/60 px-3 text-xs font-semibold hover:bg-white/85">Editar</button>
      </div>
      <ol className="relative flex flex-col">
        {result.stops.map((s, i) => {
          const leg = result.legs[i];
          const n = hasStart ? i : i + 1;
          return (
            <li key={`${s.slug ?? "start"}-${i}`} className="mfl-rise relative flex gap-3 pb-4" style={{ "--i": i } as React.CSSProperties}>
              {i < result.stops.length - 1 && <span aria-hidden className="absolute top-8 bottom-0 left-[15px] w-0.5 bg-slate-300" />}
              <span className={cn("z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow", !s.slug ? "bg-rose-500" : "bg-primary")}>{!s.slug ? "★" : n}</span>
              <div className="min-w-0 flex-1 pt-1">
                <p className="truncate text-[15px] font-bold">{s.name}</p>
                {leg && <p className="text-xs text-muted-foreground">{fmtKm(leg.km)} · {fmtMin(leg.min)} a pé até a próxima</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const fmtKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
const fmtMin = (min: number) => (min < 60 ? `${Math.round(min)} min` : `${Math.floor(min / 60)}h${String(Math.round(min % 60)).padStart(2, "0")}`);
