import type { Category } from "./schema";

/** Gradiente por categoria (thumbnails, pins). */
export const CATEGORY_GRADIENT: Record<Category, string> = {
  "alta-gastronomia": "linear-gradient(135deg,#f43f5e,#fb923c)",
  restaurante: "linear-gradient(135deg,#fb7185,#f472b6)",
  bar: "linear-gradient(135deg,#a78bfa,#818cf8)",
  cervejaria: "linear-gradient(135deg,#fbbf24,#f59e0b)",
  hamburgueria: "linear-gradient(135deg,#fb923c,#f43f5e)",
  "wine-bar": "linear-gradient(135deg,#a78bfa,#60a5fa)",
  cafe: "linear-gradient(135deg,#34d399,#10b981)",
};

/** Cor sólida por categoria (borda do pin). */
export const CATEGORY_COLOR: Record<Category, string> = {
  "alta-gastronomia": "#f43f5e",
  restaurante: "#ec4899",
  bar: "#8b5cf6",
  cervejaria: "#f59e0b",
  hamburgueria: "#f97316",
  "wine-bar": "#6366f1",
  cafe: "#10b981",
};
