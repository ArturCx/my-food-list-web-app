import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth";
import { getRestaurants } from "@/lib/restaurants";
import { createSharedRoute } from "@/lib/shared-routes";

const bodySchema = z.object({
  slugs: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(2).max(15),
  start: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullable().optional(),
  mode: z.enum(["shortest", "custom"]).default("shortest"),
});

/** Salva uma rota e devolve o código do link curto. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const known = new Set(getRestaurants().map((r) => r.slug));
  if (!parsed.data.slugs.every((s) => known.has(s))) return NextResponse.json({ error: "lugar desconhecido" }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "banco não configurado" }, { status: 503 });
  const code = await createSharedRoute({ slugs: parsed.data.slugs, start: parsed.data.start ?? null, mode: parsed.data.mode }, await currentUserId());
  return NextResponse.json({ code });
}
