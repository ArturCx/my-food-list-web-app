import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export type UserPlaceData = { rating: number | null; note: string | null };

export async function listUserPlaces(userId: string): Promise<Record<string, UserPlaceData>> {
  const rows = await db().select().from(schema.userPlaces).where(eq(schema.userPlaces.userId, userId));
  return Object.fromEntries(rows.map((r) => [r.placeSlug, { rating: r.rating, note: r.note }]));
}

export async function upsertUserPlace(userId: string, placeSlug: string, patch: Partial<UserPlaceData>) {
  const values = { userId, placeSlug, ...patch, updatedAt: new Date() };
  const [row] = await db()
    .insert(schema.userPlaces)
    .values(values)
    .onConflictDoUpdate({ target: [schema.userPlaces.userId, schema.userPlaces.placeSlug], set: { ...patch, updatedAt: new Date() } })
    .returning();
  // Linha vazia (sem nota e sem estrela) não precisa existir.
  if (row.rating == null && !row.note) {
    await db().delete(schema.userPlaces).where(and(eq(schema.userPlaces.userId, userId), eq(schema.userPlaces.placeSlug, placeSlug)));
    return { rating: null, note: null };
  }
  return { rating: row.rating, note: row.note };
}
