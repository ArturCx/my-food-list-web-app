import type { Map as MLMap } from "maplibre-gl";

/** OpenFreeMap: gratuito, sem chave, sem limite. "bright" tem cor; o ruído é escondido abaixo. */
export const STYLE_URL = "https://tiles.openfreemap.org/styles/bright";
/** Centro padrão: Belo Horizonte. */
export const DEFAULT_CENTER: [number, number] = [-43.9352, -19.9245];
/** Inclinação padrão da câmera (0 = vista de cima, 60 = máximo). */
export const DEFAULT_PITCH = 55;

/** Camadas do estilo que só adicionam ruído para o nosso caso (prefixos de id). */
const HIDDEN_LAYER_PREFIXES = [
  "poi", // pontos de interesse (lojas, bancos, etc.)
  "building", // prédios
  "railway", "bridge-railway", "tunnel-railway", "landuse-railway", "cablecar", // trilhos
  "aeroway", "airport", // aeroportos
  "highway-path", "bridge-path", "tunnel-path", // trilhas e calçadas
  "highway-name-path", "highway-name-minor", // nomes de ruas pequenas (mantém as principais)
  "highway-shield", "road_shield", "road_oneway", // escudos de rodovia e setas de mão única
];

/** Recolore as vias no espírito do Google Maps: cinza claro, sem o amarelo do estilo bright. */
const ROAD_COLORS = {
  casing: "#d9dde3", // borda de todas as vias
  major: "#eef0f3", // motorway, trunk, primary
  minor: "#ffffff", // secondary, tertiary, minor, link, service
  label: "#6b7280", // nomes de via
  labelHalo: "#ffffff",
};
const MAJOR_ROAD = /(motorway|trunk|primary)(?!-link)/;

/** Aplica o visual da casa ao estilo carregado: esconde ruído e recolore vias. */
export function applyBaseStyle(m: MLMap) {
  for (const layer of m.getStyle().layers ?? []) {
    if (HIDDEN_LAYER_PREFIXES.some((p) => layer.id.startsWith(p))) {
      m.setLayoutProperty(layer.id, "visibility", "none");
      continue;
    }
    const isRoad = /^(highway|bridge|tunnel)-/.test(layer.id) && !/(path|railway)/.test(layer.id);
    if (!isRoad) continue;
    if (layer.type === "line") {
      const color = layer.id.endsWith("-casing") ? ROAD_COLORS.casing : MAJOR_ROAD.test(layer.id) ? ROAD_COLORS.major : ROAD_COLORS.minor;
      m.setPaintProperty(layer.id, "line-color", color);
    } else if (layer.type === "symbol" && layer.id.startsWith("highway-name")) {
      m.setPaintProperty(layer.id, "text-color", ROAD_COLORS.label);
      m.setPaintProperty(layer.id, "text-halo-color", ROAD_COLORS.labelHalo);
    }
  }
  if (m.getLayer("highway-area")) m.setPaintProperty("highway-area", "fill-color", ROAD_COLORS.minor);
}
