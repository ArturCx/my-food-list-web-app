import "server-only";
import { auth } from "@clerk/nextjs/server";

/** Clerk configurado? Sem chaves, o site funciona sem login e sem dados de usuário. */
export function authEnabled() {
  return !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;
}

/** userId do Clerk ou null (deslogado / Clerk desligado). */
export async function currentUserId(): Promise<string | null> {
  if (!authEnabled()) return null;
  const { userId } = await auth();
  return userId ?? null;
}
