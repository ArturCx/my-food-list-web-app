import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/** Conexão HTTP com o Neon (serverless-friendly). Lança se DATABASE_URL faltar. */
export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida");
  return drizzle(neon(url), { schema });
}

export { schema };
