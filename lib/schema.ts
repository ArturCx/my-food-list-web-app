import { z } from "zod";

export const CATEGORIES = {
  pizzaria: "Pizzaria",
  hamburgueria: "Hamburgueria",
  bar: "Bar",
  cervejaria: "Cervejaria",
  "cozinha-brasileira": "Cozinha Brasileira",
  "cozinha-mineira": "Cozinha Mineira",
  "alta-gastronomia": "Alta Gastronomia",
  "cozinha-espanhola": "Cozinha Espanhola",
  "cozinha-asiatica": "Cozinha Asiática",
  "cozinha-alema": "Cozinha Alemã",
  "cozinha-italiana": "Cozinha Italiana",
  "cozinha-mediterranea": "Cozinha Mediterrânea",
  "cozinha-latina": "Cozinha Latina",
  bistro: "Bistrô",
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
    /** Um lugar pode ter várias categorias; a primeira define a cor do pin. */
    categories: z.array(z.enum(Object.keys(CATEGORIES) as [Category, ...Category[]])).min(1),
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
    /** Ponto de foco por foto (object-position em %), chave = caminho da foto. */
    photoFocus: z.record(z.string(), z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) })).optional(),
  })
  .strict();

export type Restaurant = z.infer<typeof restaurantSchema>;

/** Versão leve enviada ao mapa. */
export type RestaurantPin = Pick<
  Restaurant,
  "slug" | "name" | "categories" | "badge"
> & { coordinates: NonNullable<Restaurant["coordinates"]> };
