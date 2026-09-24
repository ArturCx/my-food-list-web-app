"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Check, Footprints, LocateFixed, Route, Trash2, Loader2, Link2, ArrowDown, ChevronUp, ChevronDown, Sparkles, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, type Restaurant } from "@/lib/schema";
import { CATEGORY_COLOR } from "@/lib/categories";
import { CATEGORY_ICON } from "@/lib/category-icons";
import type { RouteResult } from "@/app/api/route/route";
import type { LegState } from "@/components/map/route-map";
import { ROUTE_MAX_STOPS, readRouteSelection, writeRouteSelection } from "@/lib/route-selection";
import { locateUser } from "@/lib/locate";
import { ThemeToggle } from "@/components/theme-toggle";

const RouteMap = dynamic(() => import("@/components/map/route-map"), { ssr: false });
const MAX_STOPS = ROUTE_MAX_STOPS;

type Initial = { slugs: string[]; start: { lat: number; lng: number } | null; mode?: RouteMode };
type RouteMode = "shortest" | "custom";

export function RoutePlanner({ restaurants, initial }: { restaurants: Restaurant[]; initial?: Initial }) {
  const places = useMemo(() => restaurants.filter((r) => r.coordinates), [restaurants]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false); // só grava depois de ler o que estava salvo
  const [sharedStart, setSharedStart] = useState<{ lat: number; lng: number } | null>(null); // partida vinda do link
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<RouteMode>("shortest");
  const [visited, setVisited] = useState<Set<string>>(() => new Set()); // paradas já feitas (checkbox)
  const [shareCode, setShareCode] = useState<string | null>(null); // código do link curto da rota atual
  const autoPlan = useRef(false); // link aberto: traça sozinho após hidratar
  const [useLocation, setUseLocation] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seleção persiste no navegador. Lida após a hidratação (por isso não no inicializador do state),
  // e adiada um tick para não setar state de forma síncrona dentro do efeito.
  useEffect(() => {
    const t = setTimeout(() => {
      // Link compartilhado (/rota/<code>): seleção e partida vêm do servidor e a rota traça sozinha.
      if (initial && initial.slugs.length >= 2) {
        setSelected(new Set(initial.slugs));
        setSharedStart(initial.start);
        setMode(initial.mode ?? "shortest");
        autoPlan.current = true;
      } else {
        setSelected(new Set(readRouteSelection()));
      }
      setHydrated(true);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (hydrated && !initial) writeRouteSelection([...selected]);
  }, [selected, hydrated, initial]);

  const toggle = useCallback((slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else if (next.size < MAX_STOPS) next.add(slug);
      return next;
    });
    setResult(null);
  }, []);

  const plan = useCallback(async (fixedStart?: { lat: number; lng: number } | null) => {
    setBusy(true); setError(null);
    try {
      let start: { lat: number; lng: number } | undefined = fixedStart ?? undefined;
      if (!start && useLocation) {
        const loc = await locateUser({ timeoutMs: 8000 });
        start = { lat: loc.lat, lng: loc.lng };
        if (loc.approximate) setError("Partida aproximada pelo IP: o navegador não deu uma posição precisa.");
      }
      const r = await fetch("/api/route", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slugs: [...selected], start, mode }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "falha ao traçar rota");
      setResult(data);
      setShareCode(null);
      setVisited(new Set());
    } catch (e) {
      setError(/denied/i.test((e as Error).message ?? "") ? "Permita a localização ou desligue o ponto de partida." : (e as Error).message || "Não foi possível obter sua localização.");
    } finally {
      setBusy(false);
    }
  }, [selected, useLocation, mode]);

  useEffect(() => {
    if (!hydrated || !autoPlan.current) return;
    autoPlan.current = false;
    void plan(sharedStart);
  }, [hydrated, plan, sharedStart]);

  /** Salva a rota (uma vez por resultado) e copia o link curto /rota/<code>. */
  const copyLink = async () => {
    if (!result) return;
    try {
      let code = shareCode;
      if (!code) {
        const st = result.stops[0];
        const r = await fetch("/api/routes/share", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slugs: result.stops.filter((x) => x.slug).map((x) => x.slug), start: st.slug ? null : { lat: st.lat, lng: st.lng }, mode }),
        });
        if (!r.ok) throw new Error((await r.json()).error ?? "não foi possível criar o link");
        code = (await r.json()).code as string;
        setShareCode(code);
      }
      const url = `${window.location.origin}/rota/${code}`;
      try { await navigator.clipboard.writeText(url); } catch { window.prompt("Copie o link:", url); }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const changeMode = (m: RouteMode) => { setMode(m); setResult(null); };
  /** Move um lugar da seleção uma posição para cima/baixo (ordem personalizada). */
  const move = (slug: string, dir: -1 | 1) => {
    setSelected((prev) => {
      const arr = [...prev]; const i = arr.indexOf(slug); const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return prev;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return new Set(arr);
    });
    setResult(null);
  };

  const toggleVisited = (slug: string) => setVisited((prev) => { const n = new Set(prev); if (n.has(slug)) n.delete(slug); else n.add(slug); return n; });
  /** Trechos: "done" até a última parada marcada em sequência, "current" o seguinte, "todo" o resto. */
  const legStates = useMemo<LegState[]>(() => {
    if (!result) return [];
    let reached = 0; // índice da última parada alcançada em sequência (partida conta como alcançada)
    for (let i = 0; i < result.stops.length; i++) {
      const st = result.stops[i];
      if (!st.slug || visited.has(st.slug)) reached = i; else break;
    }
    return result.legs.map((_, i) => (i < reached ? "done" : i === reached ? "current" : "todo"));
  }, [result, visited]);

  const mapStops = useMemo(() => places.map((r) => ({ slug: r.slug, name: r.name, lat: r.coordinates!.lat, lng: r.coordinates!.lng, selected: selected.has(r.slug) })), [places, selected]);
  const chosen = places.filter((r) => selected.has(r.slug));

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <div className="absolute inset-0"><RouteMap stops={mapStops} result={result} legStates={legStates} visited={visited} onToggle={toggle} /></div>

      <aside className="glass mfl-scroll absolute inset-x-3 top-[45dvh] bottom-3 z-10 flex flex-col overflow-hidden rounded-[28px] md:inset-auto md:top-7 md:bottom-7 md:left-7 md:w-[400px]">
        <header className="flex items-center gap-3 px-5 pt-5 pb-3">
          <Link href="/" aria-label="Voltar ao mapa" className="glass-soft flex size-10 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight">Rolê de bares</h1>
            <p className="text-xs text-muted-foreground">Escolha os lugares e trace a menor rota a pé</p>
          </div>
          <div className="ml-auto"><ThemeToggle /></div>
        </header>

        <div className="flex items-center gap-2 border-y border-white/60 dark:border-white/10 px-5 py-3">
          <button
            type="button"
            onClick={() => setUseLocation((v) => !v)}
            aria-pressed={useLocation}
            className={cn("flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors", useLocation ? "border-primary bg-primary text-primary-foreground" : "border-white/70 dark:border-white/15 bg-white/45 dark:bg-white/10 hover:bg-white/75 dark:bg-white/15")}
          >
            <LocateFixed className="size-3.5" /> Partir de onde estou
          </button>
          {selected.size > 0 && (
            <button type="button" onClick={() => { setSelected(new Set()); setResult(null); }} className="ml-auto flex min-h-9 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-muted-foreground hover:bg-white/60 dark:bg-white/10">
              <Trash2 className="size-3.5" /> Limpar
            </button>
          )}
        </div>

        {/* Modo: menor rota (calculada) ou ordem personalizada (definida pelo usuário) */}
        <div className="flex gap-1 border-b border-white/60 px-5 py-2.5 dark:border-white/10">
          <ModeButton active={mode === "shortest"} onClick={() => changeMode("shortest")} icon={<Sparkles className="size-3.5" />}>Mais curta</ModeButton>
          <ModeButton active={mode === "custom"} onClick={() => changeMode("custom")} icon={<ListOrdered className="size-3.5" />}>Personalizada</ModeButton>
        </div>

        {!result && mode === "custom" && chosen.length > 0 && (
          <section className="border-b border-white/60 px-3 py-2 dark:border-white/10" aria-label="Ordem das paradas">
            <p className="px-2 pb-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Sua ordem</p>
            <ol className="flex flex-col gap-0.5">
              {[...selected].map((slug, i, arr) => {
                const r = places.find((x) => x.slug === slug);
                if (!r) return null;
                return (
                  <li key={slug} className="flex items-center gap-2 rounded-xl bg-blue-600/10 py-1.5 pr-1.5 pl-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{r.name}</span>
                    <button type="button" onClick={() => move(slug, -1)} disabled={i === 0} aria-label="Subir" className="flex size-8 items-center justify-center rounded-full hover:bg-white/60 disabled:opacity-30 dark:hover:bg-white/10"><ChevronUp className="size-4" /></button>
                    <button type="button" onClick={() => move(slug, 1)} disabled={i === arr.length - 1} aria-label="Descer" className="flex size-8 items-center justify-center rounded-full hover:bg-white/60 disabled:opacity-30 dark:hover:bg-white/10"><ChevronDown className="size-4" /></button>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {result ? (
          <RouteSummary result={result} onEdit={() => setResult(null)} onCopy={copyLink} copied={copied} modeLabel={mode === "custom" ? "Rota na sua ordem" : "Menor rota"} visited={visited} onToggleVisited={toggleVisited} legStates={legStates} />
        ) : (
          <ul className="mfl-scroll flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
            {places.map((r) => {
              const on = selected.has(r.slug);
              const Icon = CATEGORY_ICON[r.categories[0]];
              return (
                <li key={r.slug}>
                  <button
                    type="button"
                    onClick={() => toggle(r.slug)}
                    aria-pressed={on}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-[background-color,box-shadow] hover:bg-white/55 dark:bg-white/10",
                      on && "bg-blue-600/10 shadow-[inset_0_0_0_1.5px_rgba(37,99,235,0.45)]",
                    )}
                  >
                    {/* Ícone: desbotado quando fora do rolê; azul da rota (mesmo do mapa) quando dentro */}
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-[background-color,color,transform]",
                        on ? "scale-105 border-blue-600 bg-blue-600 text-white shadow-[0_6px_14px_rgba(37,99,235,0.4)]" : "border-white/80 dark:border-white/15",
                      )}
                      // Fora do rolê: versão pastel da cor da categoria (opaca, ainda parece clicável)
                      style={on ? undefined : {
                        background: `color-mix(in oklab, ${CATEGORY_COLOR[r.categories[0]]} 28%, white)`,
                        color: `color-mix(in oklab, ${CATEGORY_COLOR[r.categories[0]]} 75%, #1e293b)`,
                      }}
                    >
                      {on ? <Check className="size-4" strokeWidth={3} /> : <Icon className="size-4" strokeWidth={2.5} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-[15px] font-bold transition-colors", on ? "text-blue-700 dark:text-blue-300" : "text-foreground")}>{r.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{r.categories.map((c) => CATEGORIES[c]).join(", ")}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <footer className="flex flex-col gap-2 border-t border-white/60 dark:border-white/10 p-4">
          {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}
          <button
            type="button"
            onClick={() => plan()}
            disabled={busy || selected.size < 2}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(15,23,42,0.25)] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Route className="size-4" />}
            {busy ? "Calculando…" : selected.size < 2 ? `Escolha ao menos 2 lugares (${selected.size})` : mode === "custom" ? `Traçar nesta ordem (${selected.size})` : `Menor rota com ${selected.size} lugares`}
          </button>
          <p className="text-center text-[10px] text-muted-foreground">
            {mode === "custom" ? "Visita na ordem que você definiu" : "Ordem calculada para o menor tempo a pé"} · até {MAX_STOPS} paradas
          </p>
          {chosen.length > 0 && !result && (
            <p className="truncate text-center text-[11px] text-muted-foreground">{chosen.map((r) => r.name).join(" · ")}</p>
          )}
        </footer>
      </aside>
    </div>
  );
}

function RouteSummary({ result, onEdit, onCopy, copied, modeLabel, visited, onToggleVisited, legStates }: { result: RouteResult; onEdit: () => void; onCopy: () => void; copied: boolean; modeLabel: string; visited: Set<string>; onToggleVisited: (slug: string) => void; legStates: LegState[] }) {
  const hasStart = !result.stops[0].slug;
  const done = result.stops.filter((s) => s.slug && visited.has(s.slug)).length;
  const total = result.stops.filter((s) => s.slug).length;
  return (
    <div className="mfl-scroll flex flex-1 flex-col overflow-y-auto px-5 py-3">
      <div className="animate-in fade-in slide-in-from-bottom-2 mb-3 flex items-end justify-between duration-300">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{modeLabel}</p>
          <p className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight"><Footprints className="size-5" /> {fmtKm(result.totalKm)} · {fmtMin(result.totalMin)}</p>
          {done > 0 && <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{done} de {total} {done === 1 ? "visitado" : "visitados"}{done === total ? " · rolê completo!" : ""}</p>}
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={onCopy} className={cn("flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors", copied ? "bg-emerald-500 text-white" : "bg-white/60 hover:bg-white/85 dark:bg-white/10 dark:hover:bg-white/15")}>
            {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />} {copied ? "Copiado" : "Copiar link"}
          </button>
          <button type="button" onClick={onEdit} className="min-h-9 rounded-full bg-white/60 px-3 text-xs font-semibold hover:bg-white/85 dark:bg-white/10 dark:hover:bg-white/15">Editar</button>
        </div>
      </div>
      {/* Paradas na ordem de visita; cada trecho aparece ENTRE duas paradas */}
      <ol className="flex flex-col">
        {result.stops.map((s, i) => {
          const leg = result.legs[i];
          const n = hasStart ? i : i + 1;
          const isDone = !!s.slug && visited.has(s.slug);
          const legState = legStates[i];
          return (
            <li key={`${s.slug ?? "start"}-${i}`} className="mfl-rise" style={{ "--i": i } as React.CSSProperties}>
              <div className="flex items-center gap-3">
                {s.slug ? (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isDone}
                    aria-label={isDone ? `Desmarcar ${s.name}` : `Marcar ${s.name} como visitado`}
                    onClick={() => onToggleVisited(s.slug!)}
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow transition-[background-color,transform] hover:scale-110 active:scale-95",
                      isDone ? "bg-emerald-500" : legStates[i - 1] === "current" ? "bg-amber-500 ring-2 ring-amber-300/60" : "bg-blue-600",
                    )}
                  >
                    {isDone ? <Check className="size-4" strokeWidth={3} /> : n}
                  </button>
                ) : (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white shadow">★</span>
                )}
                <p className={cn("min-w-0 flex-1 truncate text-[15px] font-bold", isDone && "text-muted-foreground line-through decoration-emerald-500/60")}>{s.name}</p>
              </div>
              {leg && (
                <div className={cn(
                  "ml-[15px] flex items-center gap-3 border-l-2 py-2.5 pl-[19px]",
                  legState === "current" ? "border-amber-500" : legState === "done" ? "border-emerald-400/60" : "border-dashed border-slate-300 dark:border-slate-600",
                )}>
                  <ArrowDown className={cn("size-3.5", legState === "current" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")} />
                  <span className={cn("text-xs", legState === "current" ? "font-bold text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
                    {fmtKm(leg.km)} · {fmtMin(leg.min)} a pé{legState === "current" && " · próximo trecho"}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ModeButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-bold transition-colors",
        active ? "bg-primary text-primary-foreground shadow-[0_6px_16px_rgba(15,23,42,0.2)]" : "bg-white/45 hover:bg-white/75 dark:bg-white/10 dark:hover:bg-white/15",
      )}
    >
      {icon} {children}
    </button>
  );
}

const fmtKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
const fmtMin = (min: number) => (min < 60 ? `${Math.round(min)} min` : `${Math.floor(min / 60)}h${String(Math.round(min % 60)).padStart(2, "0")}`);
