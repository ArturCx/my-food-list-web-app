"use client";

import { useEffect, useRef } from "react";
import { Map as MLMap, NavigationControl, setWorkerUrl, type GeoJSONSource, LngLatBounds } from "maplibre-gl";
import { styleUrlFor, DEFAULT_CENTER, applyBaseStyle } from "./base-style";
import { useTheme } from "@/lib/theme";
import { locateUser } from "@/lib/locate";
import type { RouteResult } from "@/app/api/route/route";

export type RouteMapStop = { slug: string; name: string; lat: number; lng: number; selected: boolean };
export type LegState = "done" | "current" | "todo";
type Props = {
  stops: RouteMapStop[]; // todos os lugares candidatos
  result: RouteResult | null;
  /** Estado de cada trecho (mesmo índice de result.legs) e paradas já visitadas. */
  legStates?: LegState[];
  visited?: Set<string>;
  onToggle: (slug: string) => void;
};

const SRC_PLACES = "route-places", SRC_LINE = "route-line", SRC_ORDER = "route-order", SRC_USER = "route-user";

/** Mapa da página de rota: lugares clicáveis, trajeto e numeração da ordem de visita. */
export default function RouteMap({ stops, result, legStates, visited, onToggle }: Props) {
  const dark = useTheme() === "dark";
  const darkRef = useRef(dark);
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const loaded = useRef(false);
  const onToggleRef = useRef(onToggle);
  const dataRef = useRef({ stops, result, legStates, visited });
  useEffect(() => { onToggleRef.current = onToggle; dataRef.current = { stops, result, legStates, visited }; }, [onToggle, stops, result, legStates, visited]);

  const sync = (m: MLMap) => {
    const { stops, result, legStates, visited } = dataRef.current;
    (m.getSource(SRC_PLACES) as GeoJSONSource)?.setData({
      type: "FeatureCollection",
      features: stops.map((s) => ({ type: "Feature", geometry: { type: "Point", coordinates: [s.lng, s.lat] }, properties: { slug: s.slug, name: s.name, selected: s.selected } })),
    });
    (m.getSource(SRC_LINE) as GeoJSONSource)?.setData({
      type: "FeatureCollection",
      // Um feature por trecho, com o estado (feito / atual / a fazer) para colorir
      features: result ? result.legs.map((leg, i) => ({ type: "Feature", geometry: { type: "LineString", coordinates: leg.coords }, properties: { state: legStates?.[i] ?? "todo", order: i } })) : [],
    });
    (m.getSource(SRC_ORDER) as GeoJSONSource)?.setData({
      type: "FeatureCollection",
      features: (result?.stops ?? []).map((s, i) => ({ type: "Feature", geometry: { type: "Point", coordinates: [s.lng, s.lat] }, properties: { n: s.slug && !visited?.has(s.slug) ? String(i + (result!.stops[0].slug ? 1 : 0)) : s.slug ? "✓" : "★", start: !s.slug, done: !!s.slug && !!visited?.has(s.slug) } })),
    });
  };

  useEffect(() => {
    if (!container.current || map.current) return;
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const m = new MLMap({ container: container.current, style: styleUrlFor(darkRef.current), center: DEFAULT_CENTER, zoom: 13, pitch: 0, attributionControl: { compact: true } });
    m.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.current = m;
    let firstLoad = true;
    m.on("style.load", () => {
      applyBaseStyle(m, darkRef.current);
      if (m.getSource(SRC_PLACES)) { sync(m); return; }
      m.addSource(SRC_PLACES, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addSource(SRC_LINE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addSource(SRC_ORDER, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addSource(SRC_USER, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      // Localização em tempo real: halo pulsante + ponto azul (aproximada = laranja)
      m.addLayer({ id: "route-user-halo", type: "circle", source: SRC_USER, paint: { "circle-radius": 18, "circle-color": ["case", ["get", "approximate"], "#f59e0b", "#2563eb"], "circle-opacity": 0.25, "circle-blur": 0.5, "circle-pitch-alignment": "map" } });
      m.addLayer({ id: "route-user-dot", type: "circle", source: SRC_USER, paint: { "circle-radius": 7, "circle-color": ["case", ["get", "approximate"], "#f59e0b", "#2563eb"], "circle-stroke-color": "#fff", "circle-stroke-width": 2.5 } });
      // Trajeto: borda branca + linha azul
      const STATE_COLOR: ["match", ["get", "state"], "done", string, "current", string, string] = ["match", ["get", "state"], "done", "#94a3b8", "current", "#f59e0b", "#2563eb"];
      m.addLayer({ id: "route-line-casing", type: "line", source: SRC_LINE, layout: { "line-cap": "round", "line-join": "round", "line-sort-key": ["match", ["get", "state"], "current", 2, 1] }, paint: { "line-color": "#fff", "line-width": ["match", ["get", "state"], "current", 11, 9], "line-opacity": 0.9 } });
      m.addLayer({ id: "route-line", type: "line", source: SRC_LINE, layout: { "line-cap": "round", "line-join": "round", "line-sort-key": ["match", ["get", "state"], "current", 2, 1] }, paint: { "line-color": STATE_COLOR, "line-width": ["match", ["get", "state"], "current", 7, "done", 4, 5], "line-dasharray": ["match", ["get", "state"], "done", ["literal", [1, 2]], ["literal", [1, 0]]] } });
      // Lugares: bolinha cinza (não selecionado) ou azul (selecionado)
      m.addLayer({ id: "route-places", type: "circle", source: SRC_PLACES, paint: {
        "circle-radius": ["case", ["get", "selected"], 9, 7],
        "circle-color": ["case", ["get", "selected"], "#2563eb", "#94a3b8"],
        "circle-stroke-color": "#fff", "circle-stroke-width": 2.5,
      } });
      m.addLayer({ id: "route-places-label", type: "symbol", source: SRC_PLACES, layout: {
        "text-field": ["get", "name"], "text-font": ["Noto Sans Bold"], "text-size": 11, "text-offset": [0, 1.3], "text-anchor": "top", "text-optional": true,
      }, paint: { "text-color": darkRef.current ? "#e2e8f0" : "#0f172a", "text-halo-color": darkRef.current ? "#0b1220" : "#fff", "text-halo-width": 1.5 } });
      // Ordem de visita: número sobre cada parada
      m.addLayer({ id: "route-order-bg", type: "circle", source: SRC_ORDER, paint: {
        "circle-radius": 13, "circle-color": ["case", ["get", "start"], "#f43f5e", ["get", "done"], "#10b981", "#0f172a"], "circle-stroke-color": "#fff", "circle-stroke-width": 2.5,
      } });
      m.addLayer({ id: "route-order", type: "symbol", source: SRC_ORDER, layout: {
        "text-field": ["get", "n"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-allow-overlap": true,
      }, paint: { "text-color": "#fff" } });
      loaded.current = true;
      sync(m);
      if (firstLoad) { firstLoad = false; fitAll(m, dataRef.current.stops.map((s) => [s.lng, s.lat] as [number, number])); }
    });
    m.on("click", "route-places", (e) => {
      const f = m.queryRenderedFeatures(e.point, { layers: ["route-places"] })[0];
      if (f?.properties?.slug) onToggleRef.current(f.properties.slug as string);
    });
    m.on("mouseenter", "route-places", () => { m.getCanvas().style.cursor = "pointer"; });
    m.on("mouseleave", "route-places", () => { m.getCanvas().style.cursor = ""; });
    // Acompanha a posição do usuário enquanto a página está aberta.
    const setUser = (lng: number, lat: number, approximate: boolean) => {
      (m.getSource(SRC_USER) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: { approximate } }] });
    };
    let watchId = 0;
    const startWatch = () => {
      if (!("geolocation" in navigator)) return;
      watchId = navigator.geolocation.watchPosition(
        (p) => setUser(p.coords.longitude, p.coords.latitude, p.coords.accuracy > 5000),
        () => { void locateUser({ timeoutMs: 6000 }).then((l) => setUser(l.lng, l.lat, true)).catch(() => {}); }, // sem GPS: estimativa por IP, uma vez
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
      );
    };
    m.once("load", startWatch);
    // Pulso do halo
    let raf = 0; const t0 = performance.now();
    const pulse = (now: number) => {
      const t = ((now - t0) % 2000) / 2000;
      if (m.getLayer("route-user-halo")) { m.setPaintProperty("route-user-halo", "circle-radius", 10 + t * 16); m.setPaintProperty("route-user-halo", "circle-opacity", 0.35 * (1 - t)); }
      raf = requestAnimationFrame(pulse);
    };
    raf = requestAnimationFrame(pulse);
    return () => { cancelAnimationFrame(raf); if (watchId) navigator.geolocation.clearWatch(watchId); m.remove(); map.current = null; loaded.current = false; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || darkRef.current === dark) return;
    darkRef.current = dark;
    m.setStyle(styleUrlFor(dark));
  }, [dark]);

  useEffect(() => {
    const m = map.current;
    if (!m || !loaded.current) return;
    sync(m);
  }, [stops, result, legStates, visited]);
  useEffect(() => {
    const m = map.current;
    if (m && loaded.current && result) fitAll(m, result.coords);
  }, [result]);

  return <div ref={container} className="h-full w-full" />;
}

function fitAll(m: MLMap, coords: [number, number][]) {
  if (coords.length < 2) return;
  const b = coords.reduce((acc, c) => acc.extend(c), new LngLatBounds(coords[0], coords[0]));
  m.fitBounds(b, { padding: { top: 60, bottom: 60, left: 440, right: 60 }, duration: 700, maxZoom: 16 });
}
