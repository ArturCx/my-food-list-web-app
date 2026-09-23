"use client";

import { useEffect, useRef } from "react";
import {
  GeolocateControl,
  Map as MLMap,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapMouseEvent,
} from "maplibre-gl";
import { CATEGORY_COLOR } from "@/lib/categories";
import type { Category, RestaurantPin } from "@/lib/schema";

/** OpenFreeMap: gratuito, sem chave, sem limite. "bright" tem cor; o ruído é escondido abaixo. */
const STYLE_URL = "https://tiles.openfreemap.org/styles/bright";
/** Centro padrão: Belo Horizonte. */
const DEFAULT_CENTER: [number, number] = [-43.9352, -19.9245];
const DEFAULT_ZOOM = 11.5;
/** Inclinação padrão da câmera (0 = vista de cima, 60 = máximo). */
const DEFAULT_PITCH = 55;

const SOURCE = "restaurants";
const L_CLUSTER_HALO = "restaurants-cluster-halo";
const L_CLUSTER = "restaurants-cluster";
const L_CLUSTER_COUNT = "restaurants-cluster-count";
const L_PINS = "restaurants-pins";
const L_SELECTED_HALO = "restaurants-selected-halo";
const ACTIVE_COLOR = "#f43f5e";

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

function recolorRoads(m: MLMap) {
  for (const layer of m.getStyle().layers ?? []) {
    const isRoad = /^(highway|bridge|tunnel)-/.test(layer.id) && !/(path|railway)/.test(layer.id);
    if (!isRoad) continue;
    if (layer.type === "line") {
      const color = layer.id.endsWith("-casing")
        ? ROAD_COLORS.casing
        : MAJOR_ROAD.test(layer.id)
          ? ROAD_COLORS.major
          : ROAD_COLORS.minor;
      m.setPaintProperty(layer.id, "line-color", color);
    } else if (layer.type === "symbol" && layer.id.startsWith("highway-name")) {
      m.setPaintProperty(layer.id, "text-color", ROAD_COLORS.label);
      m.setPaintProperty(layer.id, "text-halo-color", ROAD_COLORS.labelHalo);
    }
  }
  // Área de vias (praças de pedágio, rotatórias largas) segue o mesmo tom.
  if (m.getLayer("highway-area")) m.setPaintProperty("highway-area", "fill-color", ROAD_COLORS.minor);
}

/**
 * Pins são imagens registradas no mapa e desenhados pelo WebGL no mesmo frame
 * que os tiles. Marcadores HTML ficariam sempre um frame atrasados.
 */
const PIN_W = 28;
const PIN_H = 37;
const PIN_SCALE = 2; // renderiza em 2x para ficar nítido em telas retina

function pinSvg(fill: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_W * PIN_SCALE}" height="${PIN_H * PIN_SCALE}" viewBox="0 0 24 32">
    <path d="M12 31c-1.2-8.5-11-13.4-11-20A11 11 0 1 1 23 11c0 6.6-9.8 11.5-11 20z" fill="${fill}" stroke="#fff" stroke-width="2"/>
    <circle cx="12" cy="11" r="4" fill="#fff"/>
  </svg>`;
}

function loadImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(PIN_W * PIN_SCALE, PIN_H * PIN_SCALE);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

async function registerPinImages(m: MLMap) {
  const entries: [string, string][] = [
    ...(Object.entries(CATEGORY_COLOR) as [Category, string][]).map(([c, color]): [string, string] => [`pin-${c}`, color]),
    ["pin-active", ACTIVE_COLOR],
  ];
  await Promise.all(
    entries.map(async ([name, color]) => {
      const img = await loadImage(pinSvg(color));
      if (!m.hasImage(name)) m.addImage(name, img, { pixelRatio: PIN_SCALE });
    }),
  );
}

type Props = {
  pins: RestaurantPin[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  /** Espaço ocupado por painéis flutuantes, para o flyTo não esconder o pin atrás deles. */
  padding?: { left: number; right: number };
};

/** `category` é a primeira do lugar: define a cor do pin. */
type PinProps = { slug: string; name: string; category: string; selected: boolean };

function toGeoJSON(pins: RestaurantPin[], selectedSlug: string | null): GeoJSON.FeatureCollection<GeoJSON.Point, PinProps> {
  return {
    type: "FeatureCollection",
    features: pins.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.coordinates.lng, p.coordinates.lat] },
      properties: { slug: p.slug, name: p.name, category: p.categories[0], selected: p.slug === selectedSlug },
    })),
  };
}

function addLayers(m: MLMap) {
  m.addSource(SOURCE, {
    type: "geojson",
    data: toGeoJSON([], null),
    cluster: true,
    clusterRadius: 44,
    clusterMaxZoom: 15,
  });

  // Clusters: bolha branca translúcida com halo suave e contador.
  m.addLayer({
    id: L_CLUSTER_HALO,
    type: "circle",
    source: SOURCE,
    filter: ["has", "point_count"],
    paint: { "circle-radius": 27, "circle-color": "rgba(15,23,42,0.12)", "circle-blur": 0.6 },
  });
  m.addLayer({
    id: L_CLUSTER,
    type: "circle",
    source: SOURCE,
    filter: ["has", "point_count"],
    paint: {
      "circle-radius": 22,
      "circle-color": "rgba(255,255,255,0.88)",
      "circle-stroke-width": 1,
      "circle-stroke-color": "rgba(255,255,255,0.95)",
    },
  });
  m.addLayer({
    id: L_CLUSTER_COUNT,
    type: "symbol",
    source: SOURCE,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Noto Sans Bold"],
      "text-size": 14,
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#0f172a" },
  });

  // Halo pulsante sob o pin selecionado (raio animado em animateHalo).
  m.addLayer({
    id: L_SELECTED_HALO,
    type: "circle",
    source: SOURCE,
    filter: ["all", ["!", ["has", "point_count"]], ["get", "selected"]],
    paint: {
      "circle-radius": 14,
      "circle-color": ACTIVE_COLOR,
      "circle-opacity": 0.25,
      "circle-blur": 0.4,
      "circle-pitch-alignment": "map",
    },
  });

  // Pins: ícone por categoria, o selecionado em rosa, bem maior e por cima.
  m.addLayer({
    id: L_PINS,
    type: "symbol",
    source: SOURCE,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": ["case", ["get", "selected"], "pin-active", ["concat", "pin-", ["get", "category"]]],
      "icon-size": ["case", ["get", "selected"], 1.75, 1],
      "icon-anchor": "bottom",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "symbol-sort-key": ["case", ["get", "selected"], 1, 0],
    },
  });
}

/** Pulso do halo do pin selecionado. Retorna a função de parar. */
function animateHalo(m: MLMap) {
  let raf = 0;
  const start = performance.now();
  const tick = (now: number) => {
    const t = ((now - start) % 1800) / 1800; // 0 → 1 a cada 1,8s
    if (m.getLayer(L_SELECTED_HALO)) {
      m.setPaintProperty(L_SELECTED_HALO, "circle-radius", 10 + t * 26);
      m.setPaintProperty(L_SELECTED_HALO, "circle-opacity", 0.35 * (1 - t));
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

export default function RestaurantMap({ pins, selectedSlug, onSelect, padding }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const loaded = useRef(false);
  const stopHalo = useRef<(() => void) | null>(null);

  // Refs para os handlers do mapa não ficarem presos a closures antigas.
  const onSelectRef = useRef(onSelect);
  const dataRef = useRef({ pins, selectedSlug });
  useEffect(() => {
    onSelectRef.current = onSelect;
    dataRef.current = { pins, selectedSlug };
  }, [onSelect, pins, selectedSlug]);

  // Init
  useEffect(() => {
    if (!container.current || map.current) return;
    // Worker servido de public/ (ver scripts/copy-maplibre-worker.mjs).
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const m = new MLMap({
      container: container.current,
      style: STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: DEFAULT_PITCH,
      attributionControl: { compact: true },
    });
    m.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    // "Onde estou": pede permissão ao navegador, mostra o ponto azul e centraliza UMA vez.
    // trackUserLocation fica desligado de propósito: com ele ligado, cada atualização de
    // posição recentralizava o mapa e desfazia o voo até o pin selecionado.
    // Só funciona em HTTPS ou localhost. Se negado, o mapa fica em BH.
    const geolocate = new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      showUserLocation: true,
      showAccuracyCircle: true,
      fitBoundsOptions: { maxZoom: 14, pitch: DEFAULT_PITCH },
    });
    m.addControl(geolocate, "bottom-right");
    map.current = m;

    m.on("load", async () => {
      for (const layer of m.getStyle().layers ?? []) {
        if (HIDDEN_LAYER_PREFIXES.some((p) => layer.id.startsWith(p))) {
          m.setLayoutProperty(layer.id, "visibility", "none");
        }
      }
      recolorRoads(m);
      await registerPinImages(m);
      if (!map.current) return; // desmontou enquanto carregava
      addLayers(m);
      stopHalo.current = animateHalo(m);
      loaded.current = true;
      const { pins, selectedSlug } = dataRef.current;
      (m.getSource(SOURCE) as GeoJSONSource).setData(toGeoJSON(pins, selectedSlug));
      // Já abre centralizado em quem está usando.
      geolocate.trigger();
    });

    // Interação
    m.on("click", L_PINS, (e: MapMouseEvent) => {
      const f = m.queryRenderedFeatures(e.point, { layers: [L_PINS] })[0];
      const slug = f?.properties?.slug as string | undefined;
      if (slug) onSelectRef.current(slug);
    });
    m.on("click", L_CLUSTER, async (e: MapMouseEvent) => {
      const f = m.queryRenderedFeatures(e.point, { layers: [L_CLUSTER] })[0];
      if (!f) return;
      const src = m.getSource(SOURCE) as GeoJSONSource;
      const zoom = await src.getClusterExpansionZoom(f.properties.cluster_id as number);
      m.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom, duration: 400 });
    });
    for (const layer of [L_PINS, L_CLUSTER]) {
      m.on("mouseenter", layer, () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", layer, () => { m.getCanvas().style.cursor = ""; });
    }

    return () => {
      stopHalo.current?.();
      m.remove();
      map.current = null;
      loaded.current = false;
    };
  }, []);

  // Dados e seleção: 28 pontos, reenviar o GeoJSON inteiro é barato.
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded.current) return;
    (m.getSource(SOURCE) as GeoJSONSource).setData(toGeoJSON(pins, selectedSlug));
  }, [pins, selectedSlug]);

  // Voa até o selecionado
  useEffect(() => {
    const m = map.current;
    const pin = pins.find((p) => p.slug === selectedSlug);
    if (!m || !pin) return;
    m.flyTo({
      center: [pin.coordinates.lng, pin.coordinates.lat],
      zoom: Math.max(m.getZoom(), 15),
      pitch: Math.max(m.getPitch(), DEFAULT_PITCH),
      padding: { left: padding?.left ?? 0, right: padding?.right ?? 0, top: 0, bottom: 0 },
      duration: 700,
    });
  }, [selectedSlug, pins, padding]);

  return <div ref={container} className="h-full w-full" />;
}
