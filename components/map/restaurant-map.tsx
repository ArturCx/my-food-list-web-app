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

import { STYLE_URL, DEFAULT_CENTER, DEFAULT_PITCH, applyBaseStyle } from "./base-style";

/** Usado só se não houver pins para calcular o zoom sem agrupamento. */
const FALLBACK_ZOOM = 13;
const CLUSTER_RADIUS = 44;
const CLUSTER_MAX_ZOOM = 15;
const SOURCE = "restaurants";
const L_CLUSTER_HALO = "restaurants-cluster-halo";
const L_CLUSTER = "restaurants-cluster";
const L_CLUSTER_COUNT = "restaurants-cluster-count";
const L_PINS = "restaurants-pins";
const L_SELECTED_HALO = "restaurants-selected-halo";
const ACTIVE_COLOR = "#f43f5e";

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

/**
 * Menor zoom em que nenhum pin agrupa: o primeiro em que todos os pares ficam
 * a mais de CLUSTER_RADIUS px de distância na projeção Web Mercator (tiles de 512px).
 */
function noClusterZoom(pins: RestaurantPin[]): number {
  if (pins.length < 2) return FALLBACK_ZOOM;
  const merc = pins.map((p) => {
    const lat = (p.coordinates.lat * Math.PI) / 180;
    return [ (p.coordinates.lng + 180) / 360, (1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2 ];
  });
  for (let z = 10; z <= CLUSTER_MAX_ZOOM; z += 0.1) {
    const scale = 512 * 2 ** z;
    let ok = true;
    outer: for (let i = 0; i < merc.length; i++) {
      for (let j = i + 1; j < merc.length; j++) {
        const dx = (merc[i][0] - merc[j][0]) * scale, dy = (merc[i][1] - merc[j][1]) * scale;
        if (Math.hypot(dx, dy) < CLUSTER_RADIUS * 1.05) { ok = false; break outer; }
      }
    }
    if (ok) return Math.round(z * 10) / 10;
  }
  return CLUSTER_MAX_ZOOM;
}

type Props = {
  pins: RestaurantPin[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  /** Clique no mapa fora de pins e clusters. */
  onDeselect?: () => void;
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
    clusterRadius: CLUSTER_RADIUS,
    clusterMaxZoom: CLUSTER_MAX_ZOOM,
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

/** Graus por segundo da rotação lenta em torno do pin selecionado. */
const ORBIT_SPEED = 2.5;

export default function RestaurantMap({ pins, selectedSlug, onSelect, onDeselect, padding }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const loaded = useRef(false);
  const stopHalo = useRef<(() => void) | null>(null);

  // Refs para os handlers do mapa não ficarem presos a closures antigas.
  const onSelectRef = useRef(onSelect);
  const onDeselectRef = useRef(onDeselect);
  const dataRef = useRef({ pins, selectedSlug });
  useEffect(() => {
    onSelectRef.current = onSelect;
    onDeselectRef.current = onDeselect;
    dataRef.current = { pins, selectedSlug };
  }, [onSelect, onDeselect, pins, selectedSlug]);

  // Rotação lenta ("órbita") em torno do pin selecionado.
  const orbitRaf = useRef(0);
  const stopOrbit = () => {
    cancelAnimationFrame(orbitRaf.current);
    orbitRaf.current = 0;
  };
  const startOrbit = (m: MLMap) => {
    stopOrbit();
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      // O centro já está deslocado pelo padding, então girar mantém o pin parado na tela.
      m.setBearing(m.getBearing() + ORBIT_SPEED * dt);
      orbitRaf.current = requestAnimationFrame(tick);
    };
    orbitRaf.current = requestAnimationFrame(tick);
  };

  // Init
  useEffect(() => {
    if (!container.current || map.current) return;
    // Worker servido de public/ (ver scripts/copy-maplibre-worker.mjs).
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    // Zoom padrão: o menor em que nenhum pin aparece agrupado.
    const defaultZoom = noClusterZoom(dataRef.current.pins);
    const m = new MLMap({
      container: container.current,
      style: STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: defaultZoom,
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
      fitBoundsOptions: { maxZoom: defaultZoom, pitch: DEFAULT_PITCH },
    });
    m.addControl(geolocate, "bottom-right");
    map.current = m;

    m.on("load", async () => {
      applyBaseStyle(m);
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
    m.on("click", (e: MapMouseEvent) => {
      const hit = m.queryRenderedFeatures(e.point, { layers: [L_PINS, L_CLUSTER] });
      if (hit.length === 0) onDeselectRef.current?.();
    });
    // Qualquer gesto do usuário (não movimentos programáticos) interrompe a rotação.
    for (const ev of ["dragstart", "zoomstart", "rotatestart", "pitchstart"] as const) {
      m.on(ev, (e) => { if (e.originalEvent) stopOrbit(); });
    }
    m.on("wheel", () => stopOrbit());
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
      stopOrbit();
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

  // Voa até o selecionado e, ao chegar, começa a girar devagar em torno dele.
  useEffect(() => {
    const m = map.current;
    stopOrbit();
    const pin = pins.find((p) => p.slug === selectedSlug);
    if (!m || !pin) return;
    let cancelled = false;
    m.once("moveend", () => { if (!cancelled) startOrbit(m); });
    m.flyTo({
      center: [pin.coordinates.lng, pin.coordinates.lat],
      zoom: Math.max(m.getZoom(), 15),
      pitch: Math.max(m.getPitch(), DEFAULT_PITCH),
      padding: { left: padding?.left ?? 0, right: padding?.right ?? 0, top: 0, bottom: 0 },
      duration: 700,
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug, pins, padding]);

  return <div ref={container} className="h-full w-full" />;
}
