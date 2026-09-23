"use client";

import { useEffect, useRef, useState } from "react";
import { Star, Check, LogIn, AlertCircle } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useUserPlaces } from "./user-places-provider";

/** Estrelas de 1 a 5 e anotação pessoal do usuário sobre o lugar. */
export function PlaceRating({ slug }: { slug: string }) {
  const { enabled, signedIn, loaded, places, update } = useUserPlaces();
  if (!enabled) return null;

  if (!signedIn) {
    return (
      <div className="glass-soft flex items-center justify-between gap-3 rounded-2xl p-3">
        <p className="text-xs text-muted-foreground">Entre para avaliar e anotar este lugar.</p>
        <SignInButton mode="modal">
          <button type="button" className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground">
            <LogIn className="size-3.5" /> Entrar
          </button>
        </SignInButton>
      </div>
    );
  }

  const data = places[slug] ?? { rating: null, note: null };
  return <Editor key={slug} slug={slug} data={data} loaded={loaded} update={update} />;
}

function Editor({ slug, data, loaded, update }: { slug: string; data: { rating: number | null; note: string | null }; loaded: boolean; update: (slug: string, patch: { rating?: number | null; note?: string | null }) => Promise<boolean> }) {
  const [failed, setFailed] = useState(false);
  const save = async (patch: { rating?: number | null; note?: string | null }) => {
    const ok = await update(slug, patch);
    setFailed(!ok);
    return ok;
  };
  return (
    <div className={cn("glass-soft flex flex-col gap-3 rounded-2xl p-3 transition-opacity", !loaded && "opacity-50")}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Sua avaliação</span>
        <Stars value={data.rating} onChange={(v) => save({ rating: v })} />
      </div>
      <Note value={data.note ?? ""} onSave={(note) => save({ note })} />
      {failed && (
        <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-500">
          <AlertCircle className="size-3.5" /> Não foi possível salvar. O banco de dados ainda não está configurado.
        </p>
      )}
    </div>
  );
}

function Stars({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Estrelas" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(value === n ? null : n)} // clicar na atual limpa
          className="p-0.5 transition-transform hover:scale-125 active:scale-95"
        >
          <Star className={cn("size-5 transition-colors", n <= shown ? "fill-amber-400 text-amber-400" : "text-slate-300")} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}

function Note({ value, onSave }: { value: string; onSave: (note: string) => Promise<boolean> }) {
  const [text, setText] = useState(value);
  const [state, setState] = useState<"idle" | "dirty" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Salva 800ms depois de parar de digitar; "salvo" só aparece quando a API confirma.
  useEffect(() => {
    if (state !== "dirty") return;
    timer.current = setTimeout(async () => {
      setState("saving");
      const ok = await onSave(text);
      setState(ok ? "saved" : "idle");
    }, 800);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [text, state, onSave]);

  return (
    <div className="mfl-note">
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setState("dirty"); }}
        placeholder="Sua anotação: o que pedir, com quem foi, o que achou…"
        rows={3}
        maxLength={2000}
        aria-label="Anotação"
      />
      <span className={cn("pointer-events-none absolute right-3 bottom-2 flex items-center gap-1 text-[10px] font-bold text-emerald-700 transition-opacity", state === "saved" ? "opacity-100" : "opacity-0")}>
        <Check className="size-3" /> salvo
      </span>
    </div>
  );
}
