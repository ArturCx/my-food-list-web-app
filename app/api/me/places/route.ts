import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { listUserPlaces } from "@/lib/user-places";

/** Todas as avaliações e anotações do usuário logado, indexadas por slug. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({}, { status: 401 });
  return NextResponse.json(await listUserPlaces(userId));
}
