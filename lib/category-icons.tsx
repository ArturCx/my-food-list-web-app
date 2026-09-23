import {
  Bean, Beef, Beer, ChefHat, Coffee, CookingPot, Ham, Hamburger, Martini, Pizza, Soup,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "./schema";

/** Um ícone Lucide por categoria (mesmo pacote, mesmo traço). */
export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  pizzaria: Pizza,
  hamburgueria: Hamburger,
  bar: Martini,
  cervejaria: Beer,
  "cozinha-brasileira": CookingPot,
  "cozinha-mineira": Bean,
  "alta-gastronomia": ChefHat,
  "cozinha-espanhola": Ham,
  "cozinha-asiatica": Soup,
  "cozinha-alema": Beef,
  cafe: Coffee,
};
