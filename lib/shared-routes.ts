import "server-only";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/l/1
export function newCode(len = 8) {
  const bytes = randomBytes(len);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export type RouteMode = "shortest" | "custom";
export type SharedRouteDef = { slugs: string[]; start: { lat: number; lng: number } | null; mode: RouteMode };

export async function createSharedRoute(def: SharedRouteDef, createdBy: string | null) {
  for (let i = 0; i < 3; i++) {
    const code = newCode();
    try {
      await db().insert(schema.sharedRoutes).values({ code, slugs: def.slugs, mode: def.mode, startLat: def.start?.lat ?? null, startLng: def.start?.lng ?? null, createdBy });
      return code;
    } catch (e) {
      if (i === 2) throw e; // colisão improvável; tenta outro código
    }
  }
  throw new Error("unreachable");
}

export async function getSharedRoute(code: string): Promise<SharedRouteDef | null> {
  const [row] = await db().select().from(schema.sharedRoutes).where(eq(schema.sharedRoutes.code, code)).limit(1);
  if (!row) return null;
  return { slugs: row.slugs, mode: row.mode, start: row.startLat != null && row.startLng != null ? { lat: row.startLat, lng: row.startLng } : null };
}
