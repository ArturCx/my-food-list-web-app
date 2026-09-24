import { NextResponse } from "next/server";

/**
 * Localização aproximada por IP, usada quando o navegador não consegue geolocalizar
 * (comum em desktop Linux sem serviço de localização). Precisão de bairro/cidade.
 * Na Vercel vem dos headers de geolocalização; fora dela consulta ipwho.is (ou geojs).
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const h = req.headers;
  const lat = Number(h.get("x-vercel-ip-latitude")), lng = Number(h.get("x-vercel-ip-longitude"));
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0) {
    return NextResponse.json({ lat, lng, city: decodeURIComponent(h.get("x-vercel-ip-city") ?? ""), source: "vercel" });
  }
  // Fora da Vercel: provedores gratuitos, sem chave, em ordem de preferência.
  const providers: { url: string; pick: (d: Record<string, unknown>) => { lat: number; lng: number; city: string } | null }[] = [
    { url: "https://ipwho.is/", pick: (d) => (d.success && typeof d.latitude === "number" ? { lat: d.latitude as number, lng: d.longitude as number, city: String(d.city ?? "") } : null) },
    { url: "https://get.geojs.io/v1/ip/geo.json", pick: (d) => (d.latitude ? { lat: Number(d.latitude), lng: Number(d.longitude), city: String(d.city ?? "") } : null) },
  ];
  for (const p of providers) {
    try {
      const res = await fetch(p.url, { headers: { "user-agent": "my-food-list/0.1" }, cache: "no-store", signal: AbortSignal.timeout(4000) });
      const got = p.pick((await res.json()) as Record<string, unknown>);
      if (got && Number.isFinite(got.lat) && Number.isFinite(got.lng)) return NextResponse.json({ ...got, source: new URL(p.url).hostname });
    } catch {}
  }
  return NextResponse.json({ error: "sem estimativa" }, { status: 404 });
}
