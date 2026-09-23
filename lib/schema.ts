import { z } from "zod";

export const CATEGORIES = {
  "alta-gastronomia": "Alta gastronomia",
  restaurante: "Restaurante",
  bar: "Bar",
  cervejaria: "Cervejaria",
  hamburgueria: "Hamburgueria",
  "wine-bar": "Wine bar",
  cafe: "Café",
} as const;

export type Category = keyof typeof CATEGORIES;

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const timeRange = z
  .string()
  .regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/, "Formato esperado: HH:MM-HH:MM");

/** Horário por dia. `null` ou ausente = fechado. Array permite mais de um turno. */
export const hoursSchema = z
  .object(
    Object.fromEntries(
      WEEKDAYS.map((d) => [d, z.array(timeRange).nullable().optional()]),
    ) as Record<Weekday, z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>>,
  )
  .strict();

export const restaurantSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    description: z.string().min(1),
    category: z.enum(Object.keys(CATEGORIES) as [Category, ...Category[]]),
    badge: z.string().optional(),
    address: z.string().min(1),
    coordinates: z.object({ lat: z.number(), lng: z.number() }).nullable(),
    website: z.url().optional(),
    instagram: z.string().optional(),
    /** Post/reel do Instagram para embed (URL completa). */
    instagramEmbed: z.url().optional(),
    menuUrl: z.url().nullable().optional(),
    hours: hoursSchema.nullable().optional(),
    photos: z.array(z.string()).default([]),
  })
  .strict();

export type Restaurant = z.infer<typeof restaurantSchema>;

/** Versão leve enviada ao mapa. */
export type RestaurantPin = Pick<
  Restaurant,
  "slug" | "name" | "category" | "badge"
> & { coordinates: NonNullable<Restaurant["coordinates"]> };
