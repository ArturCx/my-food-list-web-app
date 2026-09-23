import { pgTable, text, smallint, timestamp, primaryKey, index } from "drizzle-orm/pg-core";

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
