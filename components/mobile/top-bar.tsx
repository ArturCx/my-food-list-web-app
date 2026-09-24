"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Route } from "lucide-react";
import { AuthMenu } from "@/components/user/auth-menu";
import { ThemeToggle } from "@/components/theme-toggle";

/** Barra flutuante do topo no celular: logo, título e ações. */
type Props = {
  title: string;
  subtitle?: string;
  authEnabled: boolean;
  /** Com `backHref`, mostra uma seta de voltar no lugar do logo e esconde o atalho da rota. */
  backHref?: string;
};

export function TopBar({ title, subtitle, authEnabled, backHref }: Props) {
  return (
    <header className="glass fixed inset-x-3 top-[max(12px,env(safe-area-inset-top))] z-20 flex items-center gap-2.5 rounded-full py-2 pr-2 pl-2">
      {backHref ? (
        <Link href={backHref} aria-label="Voltar" className="glass-soft flex size-10 shrink-0 items-center justify-center rounded-full">
          <ArrowLeft className="size-4" />
        </Link>
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-900">
          <Image src="/logo-mfl.png" alt="" width={32} height={32} priority className="size-8" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm leading-tight font-extrabold tracking-tight">{title}</p>
        {subtitle && <p className="truncate text-[11px] leading-tight text-muted-foreground">{subtitle}</p>}
      </div>
      <ThemeToggle />
      {!backHref && (
        <Link href="/rota" aria-label="Rolê de bares" className="glass-soft flex size-10 items-center justify-center rounded-full">
          <Route className="size-4" />
        </Link>
      )}
      <AuthMenu enabled={authEnabled} />
    </header>
  );
}
