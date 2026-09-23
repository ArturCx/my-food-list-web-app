import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Clerk só entra quando as chaves existem; sem elas o site roda como antes, sem login.
 * (Next 16: este arquivo substitui o antigo middleware.ts.)
 */
const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

export default clerkEnabled ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: [
    // Tudo menos arquivos estáticos e internos do Next
    "/((?!_next|maplibre|restaurants|.*\\.(?:png|jpg|jpeg|svg|ico|css|js|mjs|woff2?)$).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
