"use client";

import { useEffect, useRef } from "react";
import { GeolocateControl, Map as MLMap, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import { CATEGORY_COLOR } from "@/lib/categories";
import type { RestaurantPin } from "@/lib/schema";

/** OpenFreeMap: gratuito, sem chave, sem limite. "bright" tem cor; o ruído é escondido abaixo. */
const STYLE_URL = "https://tiles.openfreemap.org/styles/bright";
/** Centro padrão: Belo Horizonte. */
const DEFAULT_CENTER: [number, number] = [-43.9352, -19.9245];
const DEFAULT_ZOOM = 11.5;
const SOURCE = "restaurants";

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

type Props = {
  pins: RestaurantPin[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  /** Espaço ocupado por painéis flutuantes, para o flyTo não esconder o pin atrás deles. */
  padding?: { left: number; right: number };
};

type PinProps = { slug: string; name: string; category: string };

function toGeoJSON(pins: RestaurantPin[]): GeoJSON.FeatureCollection<GeoJSON.Point, PinProps> {
  return {
    type: "FeatureCollection",
    features: pins.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.coordinates.lng, p.coordinates.lat] },
      properties: { slug: p.slug, name: p.name, category: p.category },
    })),
  };
}

export default function RestaurantMap({ pins, selectedSlug, onSelect, padding }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const loaded = useRef(false);

  // Refs para os handlers não ficarem presos a closures antigas.
  const selectedRef = useRef(selectedSlug);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    selectedRef.current = selectedSlug;
    onSelectRef.current = onSelect;
  }, [selectedSlug, onSelect]);

  /** Sincroniza marcadores HTML com as features visíveis (pins + clusters). */
  const syncMarkers = () => {
    const m = map.current;
    if (!m || !loaded.current || !m.getSource(SOURCE)) return;
    const features = m.querySourceFeatures(SOURCE);
    const seen = new Set<string>();

    for (const f of features) {
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
      const props = f.properties as { cluster?: boolean; cluster_id?: number; point_count?: number } & Partial<PinProps>;
      const key = props.cluster ? `c${props.cluster_id}` : `p${props.slug}`;
      seen.add(key);

      let marker = markers.current.get(key);
      if (!marker) {
        const el = document.createElement("div");
        if (props.cluster) {
          el.className = "mfl-cluster";
          el.textContent = String(props.point_count);
          el.onclick = async () => {
            const src = m.getSource(SOURCE) as GeoJSONSource;
            const zoom = await src.getClusterExpansionZoom(props.cluster_id!);
            m.easeTo({ center: [lng, lat], zoom, duration: 400 });
          };
        } else {
          el.className = "mfl-pin";
          el.style.setProperty("--pin", CATEGORY_COLOR[props.category as keyof typeof CATEGORY_COLOR]);
          el.title = props.name ?? "";
          el.setAttribute("role", "button");
          el.setAttribute("aria-label", props.name ?? "");
          el.onclick = (e) => {
            e.stopPropagation();
            onSelectRef.current(props.slug!);
          };
        }
        marker = new Marker({ element: el }).setLngLat([lng, lat]).addTo(m);
        markers.current.set(key, marker);
      }
      if (!props.cluster) {
        marker.getElement().dataset.active = String(props.slug === selectedRef.current);
      }
    }

    for (const [key, marker] of markers.current) {
      if (!seen.has(key)) {
        marker.remove();
        markers.current.delete(key);
      }
    }
  };

  // Init
  useEffect(() => {
    if (!container.current || map.current) return;
    const markerStore = markers.current;
    // Worker servido de public/ (ver scripts/copy-maplibre-worker.mjs).
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const m = new MLMap({
      container: container.current,
      style: STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
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
      fitBoundsOptions: { maxZoom: 14 },
    });
    m.addControl(geolocate, "bottom-right");
    map.current = m;

    m.on("load", () => {
      for (const layer of m.getStyle().layers ?? []) {
        if (HIDDEN_LAYER_PREFIXES.some((p) => layer.id.startsWith(p))) {
          m.setLayoutProperty(layer.id, "visibility", "none");
        }
      }
      recolorRoads(m);
      m.addSource(SOURCE, {
        type: "geojson",
        data: toGeoJSON([]),
        cluster: true,
        clusterRadius: 44,
        clusterMaxZoom: 15,
      });
      // Camada invisível só para o source ser consultável via querySourceFeatures.
      m.addLayer({ id: `${SOURCE}-anchor`, type: "circle", source: SOURCE, paint: { "circle-opacity": 0, "circle-radius": 0 } });
      loaded.current = true;
      (m.getSource(SOURCE) as GeoJSONSource).setData(toGeoJSON(pins));
      syncMarkers();
      // Já abre centralizado em quem está usando.
      geolocate.trigger();
    });
    m.on("render", syncMarkers);
    m.on("moveend", syncMarkers);

    return () => {
      m.remove();
      map.current = null;
      loaded.current = false;
      markerStore.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dados
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded.current) return;
    (m.getSource(SOURCE) as GeoJSONSource).setData(toGeoJSON(pins));
    // Clusters mudam de id quando os dados mudam: limpa e recria.
    for (const marker of markers.current.values()) marker.remove();
    markers.current.clear();
    syncMarkers();
  }, [pins]);

  // Seleção: destaca o pin e voa até ele
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    for (const [key, marker] of markers.current) {
      if (key.startsWith("p")) marker.getElement().dataset.active = String(key === `p${selectedSlug}`);
    }
    const pin = pins.find((p) => p.slug === selectedSlug);
    if (!pin) return;
    m.flyTo({
      center: [pin.coordinates.lng, pin.coordinates.lat],
      zoom: Math.max(m.getZoom(), 15),
      padding: { left: padding?.left ?? 0, right: padding?.right ?? 0, top: 0, bottom: 0 },
      duration: 700,
    });
  }, [selectedSlug, pins, padding]);

  return <div ref={container} className="h-full w-full" />;
}
