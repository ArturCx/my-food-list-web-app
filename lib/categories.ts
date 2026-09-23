import type { Category } from "./schema";

/**
 * Cores dos pins, por família, todas longe do rosa do pin selecionado (#f43f5e):
 *   laranja  → comida rápida (pizzaria, hamburgueria)
 *   roxo/amarelo → bebida (bar, cervejaria)
 *   verde    → cozinha brasileira e mineira
 *   grafite  → alta gastronomia
 *   azuis    → cozinhas internacionais (espanhola, asiática, alemã)
 *   marrom   → café
 * A primeira categoria do restaurante define a cor.
 */
export const CATEGORY_COLOR: Record<Category, string> = {
  pizzaria: "#f97316",
  hamburgueria: "#c2410c",
  bar: "#7c3aed",
  cervejaria: "#eab308",
  "cozinha-brasileira": "#16a34a",
  "cozinha-mineira": "#65a30d",
  "alta-gastronomia": "#1e293b",
  "cozinha-espanhola": "#0284c7",
  "cozinha-asiatica": "#0e7490",
  "cozinha-alema": "#1d4ed8",
  cafe: "#78350f",
};

/** Gradiente por categoria (fundo das miniaturas sem foto), na mesma família da cor do pin. */
export const CATEGORY_GRADIENT: Record<Category, string> = {
  pizzaria: "linear-gradient(135deg,#fb923c,#ea580c)",
  hamburgueria: "linear-gradient(135deg,#ea580c,#9a3412)",
  bar: "linear-gradient(135deg,#a78bfa,#6d28d9)",
  cervejaria: "linear-gradient(135deg,#fde047,#ca8a04)",
  "cozinha-brasileira": "linear-gradient(135deg,#4ade80,#15803d)",
  "cozinha-mineira": "linear-gradient(135deg,#a3e635,#4d7c0f)",
  "alta-gastronomia": "linear-gradient(135deg,#475569,#0f172a)",
  "cozinha-espanhola": "linear-gradient(135deg,#38bdf8,#0369a1)",
  "cozinha-asiatica": "linear-gradient(135deg,#22d3ee,#155e75)",
  "cozinha-alema": "linear-gradient(135deg,#60a5fa,#1e40af)",
  cafe: "linear-gradient(135deg,#b45309,#451a03)",
};
