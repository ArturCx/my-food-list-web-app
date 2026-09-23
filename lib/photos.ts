/**
 * Monta a URL de uma foto. Os JSONs guardam caminhos como "/restaurants/<slug>/1.jpg".
 * Sem NEXT_PUBLIC_PHOTO_BASE_URL (dev), serve de public/. Com ela (produção), do bucket R2.
 * Variantes: "thumb" (192x192, lista) e "md" (960px, painel). Ver scripts/optimize-photos.mjs.
 */
const BASE = (process.env.NEXT_PUBLIC_PHOTO_BASE_URL ?? "").replace(/\/$/, "");

export type PhotoVariant = "full" | "md" | "thumb";

export function photoUrl(src: string, variant: PhotoVariant = "full") {
  const path = variant === "full" ? src : src.replace(/\.jpg$/i, `-${variant}.jpg`);
  return `${BASE}${path}`;
}
