import { NextResponse } from "next/server";
import { z } from "zod";
import { getRestaurants } from "@/lib/restaurants";
import { bestOrder, matrix, route, type LatLng } from "@/lib/routing";

const bodySchema = z.object({
  slugs: z.array(z.string()).min(2).max(15),
  /** Ponto de partida opcional (ex.: localização do usuário). */
  start: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

export type RouteStop = { slug: string | null; name: string; lat: number; lng: number };
export type RouteResult = {
  stops: RouteStop[]; // na ordem de visita (o primeiro pode ser o ponto de partida)
  legs: { km: number; min: number }[]; // legs[i] = trecho stops[i] → stops[i+1]
  totalKm: number;
  totalMin: number;
  coords: [number, number][]; // geometria do trajeto, [lng, lat]
};

/** Menor rota a pé passando por todos os lugares escolhidos. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { slugs, start } = parsed.data;

  const bySlug = new Map(getRestaurants().map((r) => [r.slug, r]));
  const stops: RouteStop[] = [];
  for (const s of slugs) {
    const r = bySlug.get(s);
    if (!r?.coordinates) return NextResponse.json({ error: `lugar sem coordenadas: ${s}` }, { status: 400 });
    stops.push({ slug: s, name: r.name, lat: r.coordinates.lat, lng: r.coordinates.lng });
  }
  const points: (RouteStop & LatLng)[] = start ? [{ slug: null, name: "Você", ...start }, ...stops] : stops;

  try {
    const m = await matrix(points);
    const order = bestOrder(m.map((row) => row.map((c) => c.min)), start ? 0 : undefined);
    const ordered = order.map((i) => points[i]);
    const r = await route(ordered);
    const result: RouteResult = {
      stops: ordered,
      legs: r.legs,
      totalKm: r.legs.reduce((s, l) => s + l.km, 0),
      totalMin: r.legs.reduce((s, l) => s + l.min, 0),
      coords: r.coords,
    };
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: `serviço de rotas indisponível (${(e as Error).message})` }, { status: 502 });
  }
}
