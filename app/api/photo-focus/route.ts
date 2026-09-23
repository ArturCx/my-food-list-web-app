import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isEditStage } from "@/lib/stage";

/** Grava `photoFocus` no JSON do restaurante. Só responde com STAGE=DEV no .env. */
const bodySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  focus: z.record(z.string(), z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) })),
});

export async function POST(req: Request) {
  if (!isEditStage()) return NextResponse.json({ error: "not available" }, { status: 404 });
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { slug, focus } = parsed.data;
  const file = path.join(process.cwd(), "content", "restaurants", `${slug}.json`);
  if (!fs.existsSync(file)) return NextResponse.json({ error: "slug não existe" }, { status: 404 });

  const r = JSON.parse(fs.readFileSync(file, "utf8"));
  const clean: Record<string, { x: number; y: number }> = {};
  for (const [src, f] of Object.entries(focus)) {
    if (r.photos?.includes(src) && !(f.x === 50 && f.y === 50)) clean[src] = f;
  }
  if (Object.keys(clean).length) r.photoFocus = clean;
  else delete r.photoFocus;

  const ordered: Record<string, unknown> = {};
  for (const k of ["slug","name","description","categories","badge","address","coordinates","website","instagram","instagramEmbed","menuUrl","hours","photos","photoFocus"]) {
    if (k in r) ordered[k] = r[k];
  }
  fs.writeFileSync(file, JSON.stringify(ordered, null, 2) + "\n");
  return NextResponse.json({ ok: true, photoFocus: r.photoFocus ?? null });
}
