import "server-only";

/**
 * Roteamento a pé via Valhalla público (OpenStreetMap). Sem chave; uso leve.
 * - matrix(): distâncias/tempos entre todos os pares
 * - route(): geometria do trajeto na ordem dada
 * - bestOrder(): menor caminho aberto passando por todos os pontos (TSP)
 */
const VALHALLA = "https://valhalla1.openstreetmap.de";
export type LatLng = { lat: number; lng: number };

async function valhalla<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${VALHALLA}/${endpoint}`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "my-food-list/0.1" },
    body: JSON.stringify(body),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Valhalla ${endpoint} ${res.status}`);
  return res.json() as Promise<T>;
}

/** Matriz [i][j] = { km, min } a pé. */
export async function matrix(points: LatLng[]) {
  const locs = points.map((p) => ({ lat: p.lat, lon: p.lng }));
  const data = await valhalla<{ sources_to_targets: { distance: number; time: number }[][] }>("sources_to_targets", {
    sources: locs, targets: locs, costing: "pedestrian", units: "kilometers",
  });
  return data.sources_to_targets.map((row) => row.map((c) => ({ km: c.distance, min: c.time / 60 })));
}

/** Trajeto a pé na ordem dada: geometria (lng,lat) e resumo por trecho. */
export async function route(points: LatLng[]) {
  const data = await valhalla<{ trip: { legs: { shape: string; summary: { length: number; time: number } }[] } }>("route", {
    locations: points.map((p) => ({ lat: p.lat, lon: p.lng })), costing: "pedestrian", units: "kilometers",
  });
  const coords: [number, number][] = [];
  const legs = data.trip.legs.map((leg) => {
    const pts = decodePolyline6(leg.shape);
    coords.push(...pts);
    return { km: leg.summary.length, min: leg.summary.time / 60, coords: pts };
  });
  return { coords, legs };
}

/** Polyline do Valhalla (precisão 1e6) → [lng, lat][] */
function decodePolyline6(str: string): [number, number][] {
  const out: [number, number][] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const which of ["lat", "lng"] as const) {
      let result = 0, shift = 0, b: number;
      do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === "lat") lat += delta; else lng += delta;
    }
    out.push([lng / 1e6, lat / 1e6]);
  }
  return out;
}

/**
 * Ordem que minimiza o tempo total de um caminho ABERTO (não volta ao início).
 * `fixedStart`: índice obrigatório de partida (ex.: localização do usuário).
 * Exato (Held-Karp) até 11 pontos; acima disso, vizinho mais próximo + 2-opt.
 */
export function bestOrder(cost: number[][], fixedStart?: number): number[] {
  const n = cost.length;
  if (n <= 1) return [...Array(n).keys()];
  if (n <= 11) return heldKarp(cost, fixedStart);
  return twoOpt(cost, nearestNeighbor(cost, fixedStart ?? 0), fixedStart !== undefined);
}

function heldKarp(cost: number[][], fixedStart?: number): number[] {
  const n = cost.length, FULL = (1 << n) - 1;
  const starts = fixedStart !== undefined ? [fixedStart] : [...Array(n).keys()];
  let best: { total: number; path: number[] } | null = null;
  for (const s of starts) {
    // dp[mask][j] = menor custo para visitar `mask` terminando em j, começando em s
    const dp = new Map<number, number>(), parent = new Map<number, number>();
    const key = (mask: number, j: number) => mask * n + j;
    dp.set(key(1 << s, s), 0);
    for (let mask = 1; mask <= FULL; mask++) {
      if (!(mask & (1 << s))) continue;
      for (let j = 0; j < n; j++) {
        if (!(mask & (1 << j))) continue;
        const cur = dp.get(key(mask, j));
        if (cur === undefined) continue;
        for (let k = 0; k < n; k++) {
          if (mask & (1 << k)) continue;
          const nm = mask | (1 << k), val = cur + cost[j][k];
          if (val < (dp.get(key(nm, k)) ?? Infinity)) { dp.set(key(nm, k), val); parent.set(key(nm, k), j); }
        }
      }
    }
    for (let j = 0; j < n; j++) {
      const total = dp.get(key(FULL, j));
      if (total === undefined || (best && total >= best.total)) continue;
      const path: number[] = []; let mask = FULL, cur = j;
      while (path.length < n) { path.push(cur); const p = parent.get(key(mask, cur)); mask &= ~(1 << cur); if (p === undefined) break; cur = p; }
      best = { total, path: path.reverse() };
    }
  }
  return best!.path;
}

function nearestNeighbor(cost: number[][], start: number): number[] {
  const n = cost.length, seen = new Set([start]), path = [start];
  while (path.length < n) {
    const last = path[path.length - 1];
    let next = -1;
    for (let k = 0; k < n; k++) if (!seen.has(k) && (next < 0 || cost[last][k] < cost[last][next])) next = k;
    seen.add(next); path.push(next);
  }
  return path;
}

function twoOpt(cost: number[][], path: number[], keepStart: boolean): number[] {
  const total = (p: number[]) => p.reduce((s, v, i) => (i ? s + cost[p[i - 1]][v] : 0), 0);
  let best = path.slice(), improved = true;
  while (improved) {
    improved = false;
    for (let i = keepStart ? 1 : 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const cand = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        if (total(cand) < total(best) - 1e-9) { best = cand; improved = true; }
      }
    }
  }
  return best;
}
