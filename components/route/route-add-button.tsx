"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, Plus, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTE_MAX_STOPS, readRouteSelection, subscribeRouteSelection, writeRouteSelection } from "@/lib/route-selection";

const EMPTY: string[] = [];
let cache = "";
let parsed: string[] = EMPTY;
function snapshot(): string[] {
  const raw = (() => { try { return localStorage.getItem("mfl.route.selection") ?? ""; } catch { return ""; } })();
  if (raw !== cache) { cache = raw; parsed = readRouteSelection(); }
  return parsed;
}

/** "Adicionar ao rolê": inclui/remove o lugar da seleção da página /rota e mostra o atalho para ela. */
export function RouteAddButton({ slug }: { slug: string }) {
  const selection = useSyncExternalStore(subscribeRouteSelection, snapshot, () => EMPTY);
  const on = selection.includes(slug);
  const full = !on && selection.length >= ROUTE_MAX_STOPS;

  const toggle = () => writeRouteSelection(on ? selection.filter((s) => s !== slug) : [...selection, slug]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={full}
        aria-pressed={on}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-[14px] px-4 text-[13px] font-bold [&_svg]:size-4",
          "transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-40",
          on ? "bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)]" : "glass-soft hover:bg-white/85 dark:bg-white/15",
        )}
      >
        {on ? <Check /> : <Plus />}
        {on ? "No rolê" : "Adicionar ao rolê"}
      </button>
      {selection.length > 0 && (
        <Link href="/rota" className="animate-in fade-in inline-flex min-h-11 items-center gap-1.5 rounded-[14px] px-3 text-[13px] font-bold text-blue-700 dark:text-blue-300 hover:underline">
          <Route className="size-4" /> Ver rota ({selection.length})
        </Link>
      )}
    </div>
  );
}
