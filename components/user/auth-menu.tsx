"use client";

import { LogIn } from "lucide-react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

/** Botão de entrar / avatar do usuário no cabeçalho. Só renderiza com Clerk ligado. */
export function AuthMenu({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    <div className="flex shrink-0 items-center">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button type="button" aria-label="Entrar" className="glass-soft flex size-10 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95">
            <LogIn className="size-4" />
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  );
}
