import "server-only";
import fs from "node:fs";
import path from "node:path";
import { restaurantSchema, type Restaurant } from "./schema";

const CONTENT_DIR = path.join(process.cwd(), "content", "restaurants");

// Cache só em produção: em dev os JSONs mudam sem o Next perceber (não são módulos importados).
let cache: Restaurant[] | null = null;
const USE_CACHE = process.env.NODE_ENV === "production";

export function getRestaurants(): Restaurant[] {
  if (USE_CACHE && cache) return cache;
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".json"));
  const items = files.map((file) => {
    const raw = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, file), "utf8"));
    const parsed = restaurantSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Restaurante inválido em ${file}:\n${parsed.error.message}`);
    }
    if (parsed.data.slug !== file.replace(/\.json$/, "")) {
      throw new Error(`Slug "${parsed.data.slug}" não bate com o nome do arquivo ${file}`);
    }
    return parsed.data;
  });
  cache = items.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return cache;
}

export function getRestaurant(slug: string): Restaurant | undefined {
  return getRestaurants().find((r) => r.slug === slug);
}
