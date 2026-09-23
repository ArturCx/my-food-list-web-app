"use client";

import { useEffect, useRef } from "react";
import { Map as MLMap, NavigationControl, setWorkerUrl, type GeoJSONSource, LngLatBounds } from "maplibre-gl";
import { STYLE_URL, DEFAULT_CENTER, applyBaseStyle } from "./base-style";
import type { RouteResult } from "@/app/api/route/route";

export type RouteMapStop = { slug: string; name: string; lat: number; lng: number; selected: boolean };
type Props = {
  stops: RouteMapStop[]; // todos os lugares candidatos
  result: RouteResult | null;
  onToggle: (slug: string) => void;
};

const SRC_PLACES = "route-places", SRC_LINE = "route-line", SRC_ORDER = "route-order";

/** Mapa da página de rota: lugares clicáveis, trajeto e numeração da ordem de visita. */
export default function RouteMap({ stops, result, onToggle }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const loaded = useRef(false);
  const onToggleRef = useRef(onToggle);
  const dataRef = useRef({ stops, result });
  useEffect(() => { onToggleRef.current = onToggle; dataRef.current = { stops, result }; }, [onToggle, stops, result]);

  const sync = (m: MLMap) => {
    const { stops, result } = dataRef.current;
    (m.getSource(SRC_PLACES) as GeoJSONSource)?.setData({
      type: "FeatureCollection",
      features: stops.map((s) => ({ type: "Feature", geometry: { type: "Point", coordinates: [s.lng, s.lat] }, properties: { slug: s.slug, name: s.name, selected: s.selected } })),
    });
    (m.getSource(SRC_LINE) as GeoJSONSource)?.setData({
      type: "FeatureCollection",
      features: result ? [{ type: "Feature", geometry: { type: "LineString", coordinates: result.coords }, properties: {} }] : [],
    });
    (m.getSource(SRC_ORDER) as GeoJSONSource)?.setData({
      type: "FeatureCollection",
      features: (result?.stops ?? []).map((s, i) => ({ type: "Feature", geometry: { type: "Point", coordinates: [s.lng, s.lat] }, properties: { n: s.slug ? String(i + (result!.stops[0].slug ? 1 : 0)) : "★", start: !s.slug } })),
    });
  };

  useEffect(() => {
    if (!container.current || map.current) return;
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const m = new MLMap({ container: container.current, style: STYLE_URL, center: DEFAULT_CENTER, zoom: 13, pitch: 0, attributionControl: { compact: true } });
    m.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.current = m;
    m.on("load", () => {
      applyBaseStyle(m);
      m.addSource(SRC_PLACES, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addSource(SRC_LINE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addSource(SRC_ORDER, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      // Trajeto: borda branca + linha azul
      m.addLayer({ id: "route-line-casing", type: "line", source: SRC_LINE, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#fff", "line-width": 9, "line-opacity": 0.9 } });
      m.addLayer({ id: "route-line", type: "line", source: SRC_LINE, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#2563eb", "line-width": 5 } });
      // Lugares: bolinha cinza (não selecionado) ou azul (selecionado)
      m.addLayer({ id: "route-places", type: "circle", source: SRC_PLACES, paint: {
        "circle-radius": ["case", ["get", "selected"], 9, 7],
        "circle-color": ["case", ["get", "selected"], "#2563eb", "#94a3b8"],
        "circle-stroke-color": "#fff", "circle-stroke-width": 2.5,
      } });
      m.addLayer({ id: "route-places-label", type: "symbol", source: SRC_PLACES, layout: {
        "text-field": ["get", "name"], "text-font": ["Noto Sans Bold"], "text-size": 11, "text-offset": [0, 1.3], "text-anchor": "top", "text-optional": true,
      }, paint: { "text-color": "#0f172a", "text-halo-color": "#fff", "text-halo-width": 1.5 } });
      // Ordem de visita: número sobre cada parada
      m.addLayer({ id: "route-order-bg", type: "circle", source: SRC_ORDER, paint: {
        "circle-radius": 13, "circle-color": ["case", ["get", "start"], "#f43f5e", "#0f172a"], "circle-stroke-color": "#fff", "circle-stroke-width": 2.5,
      } });
      m.addLayer({ id: "route-order", type: "symbol", source: SRC_ORDER, layout: {
        "text-field": ["get", "n"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-allow-overlap": true,
      }, paint: { "text-color": "#fff" } });
      loaded.current = true;
      sync(m);
      fitAll(m, dataRef.current.stops.map((s) => [s.lng, s.lat] as [number, number]));
    });
    m.on("click", "route-places", (e) => {
      const f = m.queryRenderedFeatures(e.point, { layers: ["route-places"] })[0];
      if (f?.properties?.slug) onToggleRef.current(f.properties.slug as string);
    });
    m.on("mouseenter", "route-places", () => { m.getCanvas().style.cursor = "pointer"; });
    m.on("mouseleave", "route-places", () => { m.getCanvas().style.cursor = ""; });
    return () => { m.remove(); map.current = null; loaded.current = false; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !loaded.current) return;
    sync(m);
    if (result) fitAll(m, result.coords);
  }, [stops, result]);

  return <div ref={container} className="h-full w-full" />;
}

function fitAll(m: MLMap, coords: [number, number][]) {
  if (coords.length < 2) return;
  const b = coords.reduce((acc, c) => acc.extend(c), new LngLatBounds(coords[0], coords[0]));
  m.fitBounds(b, { padding: { top: 60, bottom: 60, left: 440, right: 60 }, duration: 700, maxZoom: 16 });
}
