"use client";

import { useRef, useState } from "react";
import { Check, Move } from "lucide-react";
import { cn } from "@/lib/utils";
import { photoUrl } from "@/lib/photos";
import type { Restaurant } from "@/lib/schema";

type Focus = NonNullable<Restaurant["photoFocus"]>;
type Props = {
  slug: string;
  name: string;
  photos: string[];
  focus?: Focus;
  fallback: string;
  /** Liga o modo de reposicionar (STAGE=DEV no .env). Renderize com key={slug}. */
  editable?: boolean;
};

/** Carrossel de fotos; `photoFocus` no JSON define o enquadramento (object-position). */
export function PhotoGallery({ slug, name, photos, focus, fallback, editable = false }: Props) {
  const [local, setLocal] = useState<Focus>(focus ?? {});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = async () => {
    setSaving("saving");
    const res = await fetch("/api/photo-focus", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, focus: local }),
    });
    setSaving(res.ok ? "saved" : "error");
    if (res.ok) setDirty(false);
  };

  if (photos.length === 0) {
    return (
      <div className="flex h-48 w-full items-end rounded-[20px] p-3" style={{ backgroundImage: fallback }}>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold">Sem foto ainda</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mfl-scroll flex snap-x gap-2 overflow-x-auto rounded-[20px]">
        {photos.map((src) => (
          <Photo
            key={src}
            src={photoUrl(src, "md")}
            alt={name}
            focus={local[src] ?? { x: 50, y: 50 }}
            editable={editable}
            onChange={(f) => {
              setLocal((prev) => ({ ...prev, [src]: f }));
              setDirty(true);
              setSaving("idle");
            }}
          />
        ))}
      </div>

      {editable && (
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between">
          <span className="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">
            <Move className="size-3" /> Arraste para reposicionar
          </span>
          {(dirty || saving !== "idle") && (
            <button
              type="button"
              onClick={save}
              disabled={saving === "saving" || !dirty}
              className={cn(
                "pointer-events-auto flex min-h-9 items-center gap-1 rounded-full px-3 text-[12px] font-bold shadow-lg",
                saving === "saved" ? "bg-emerald-500 text-white" : saving === "error" ? "bg-rose-500 text-white" : "bg-primary text-primary-foreground",
              )}
            >
              <Check className="size-3.5" />
              {saving === "saving" ? "Salvando…" : saving === "saved" ? "Salvo" : saving === "error" ? "Erro ao salvar" : "Salvar posição"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Photo({
  src, alt, focus, editable, onChange,
}: { src: string; alt: string; focus: { x: number; y: number }; editable: boolean; onChange: (f: { x: number; y: number }) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startY: number; fx: number; fy: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!editable) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, fx: focus.x, fy: focus.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !box.current) return;
    const { width, height } = box.current.getBoundingClientRect();
    // Arrastar a imagem para a direita mostra mais da esquerda: o foco anda ao contrário.
    const dx = ((e.clientX - drag.current.startX) / width) * 100;
    const dy = ((e.clientY - drag.current.startY) / height) * 100;
    const clamp = (v: number) => Math.round(Math.min(100, Math.max(0, v)));
    onChange({ x: clamp(drag.current.fx - dx), y: clamp(drag.current.fy - dy) });
  };
  const onPointerUp = () => { drag.current = null; };

  return (
    <div
      ref={box}
      className={cn("relative h-48 w-full shrink-0 snap-start overflow-hidden rounded-[20px]", editable && "cursor-grab select-none active:cursor-grabbing")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" draggable={false} className="h-full w-full object-cover" style={{ objectPosition: `${focus.x}% ${focus.y}%` }} />
      {editable && (
        <span className="absolute right-2 bottom-2 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[10px] text-white">
          {focus.x}% {focus.y}%
        </span>
      )}
    </div>
  );
}
