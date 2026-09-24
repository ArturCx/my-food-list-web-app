"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type Snap = "peek" | "half" | "full";
/** Altura de cada posição, em px, para a viewport dada. */
export function snapHeight(snap: Snap, vh: number) {
  return snap === "peek" ? 92 : snap === "half" ? Math.round(vh * 0.5) : Math.round(vh * 0.92);
}

type Props = {
  snap: Snap;
  onSnapChange: (s: Snap) => void;
  /** Chamado com a altura atual em px (para o mapa compensar). */
  onHeightChange?: (px: number) => void;
  /** Conteúdo fixo no topo, visível até no modo recolhido (arrastável). */
  header: React.ReactNode;
  /** Rodapé fixo abaixo da área rolável (ex.: botão principal). Some no modo recolhido. */
  footer?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Bottom sheet de três posições (recolhido / metade / cheio), arrastável pelo cabeçalho.
 * O conteúdo rola por dentro; o cabeçalho é a única área de arraste, para não brigar com o scroll.
 */
export function BottomSheet({ snap, onSnapChange, onHeightChange, header, footer, children }: Props) {
  const [vh, setVh] = useState(0);
  const [dragPx, setDragPx] = useState<number | null>(null); // altura durante o arraste
  const drag = useRef<{ startY: number; startH: number; moved: boolean } | null>(null);

  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const target = vh ? snapHeight(snap, vh) : 0;
  const height = dragPx ?? target;
  useEffect(() => { onHeightChange?.(height); }, [height, onHeightChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startH: height, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dy = drag.current.startY - e.clientY;
    if (Math.abs(dy) > 4) drag.current.moved = true;
    const max = snapHeight("full", vh), min = snapHeight("peek", vh);
    setDragPx(Math.max(min, Math.min(max, drag.current.startH + dy)));
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    const { moved } = drag.current;
    drag.current = null;
    if (!moved) { // toque simples no cabeçalho: alterna recolhido ↔ metade
      setDragPx(null);
      onSnapChange(snap === "peek" ? "half" : snap === "half" ? "full" : "half");
      return;
    }
    const h = dragPx ?? target;
    // Vai para a posição mais próxima da altura em que soltou
    const best = (["peek", "half", "full"] as Snap[]).reduce((a, b) => (Math.abs(snapHeight(b, vh) - h) < Math.abs(snapHeight(a, vh) - h) ? b : a));
    setDragPx(null);
    onSnapChange(best);
  };

  return (
    <div
      className={cn("glass fixed inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-[28px] pb-[env(safe-area-inset-bottom)]", dragPx === null && "transition-[height] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]")}
      style={{ height: vh ? height : "50dvh" }}
      role="dialog"
      aria-label="Painel"
    >
      <div
        className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="mx-auto mt-2.5 mb-1 h-1.5 w-11 rounded-full bg-slate-400/50" aria-hidden />
        {header}
      </div>
      <div className={cn("mfl-scroll min-h-0 flex-1 overflow-y-auto", snap === "peek" && "pointer-events-none opacity-0")}>{children}</div>
      {footer && <div className={cn("shrink-0 border-t border-white/60 dark:border-white/10", snap === "peek" && "hidden")}>{footer}</div>}
    </div>
  );
}
