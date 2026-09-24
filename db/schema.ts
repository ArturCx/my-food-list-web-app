import { pgTable, text, smallint, timestamp, primaryKey, index, jsonb, doublePrecision } from "drizzle-orm/pg-core";

/**
 * Dados do usuário sobre cada lugar. Os lugares em si continuam nos JSONs;
 * `placeSlug` referencia o slug do arquivo. Tudo privado por usuário.
 */
export const userPlaces = pgTable(
  "user_places",
  {
    userId: text("user_id").notNull(), // id do Clerk
    placeSlug: text("place_slug").notNull(),
    rating: smallint("rating"), // 1–5, null = sem avaliação
    note: text("note"), // anotação livre, null = sem nota
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.placeSlug] }), index("user_places_user_idx").on(t.userId)],
);

export type UserPlace = typeof userPlaces.$inferSelect;

/** Rotas compartilhadas por link curto (/rota/<code>). Qualquer pessoa pode criar e abrir. */
export const sharedRoutes = pgTable("shared_routes", {
  code: text("code").primaryKey(), // 8 chars base62
  slugs: jsonb("slugs").$type<string[]>().notNull(), // na ordem de visita
  mode: text("mode").$type<"shortest" | "custom">().default("shortest").notNull(),
  startLat: doublePrecision("start_lat"),
  startLng: doublePrecision("start_lng"),
  createdBy: text("created_by"), // userId do Clerk, se logado
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SharedRoute = typeof sharedRoutes.$inferSelect;
