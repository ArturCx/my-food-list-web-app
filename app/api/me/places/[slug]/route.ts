import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth";
import { upsertUserPlace } from "@/lib/user-places";
import { getRestaurant } from "@/lib/restaurants";

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

/** Atualiza estrela e/ou nota do usuário para um lugar. */
export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "login necessário" }, { status: 401 });
  const { slug } = await params;
  if (!getRestaurant(slug)) return NextResponse.json({ error: "lugar não existe" }, { status: 404 });
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const patch = { ...parsed.data };
  if (typeof patch.note === "string" && !patch.note.trim()) patch.note = null;
  return NextResponse.json(await upsertUserPlace(userId, slug, patch));
}
