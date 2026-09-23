/**
 * Preenche `coordinates` nos restaurantes que ainda não têm, via Nominatim (OSM).
 * Uso: pnpm geocode [--force]
 * Respeita o limite de 1 req/s da API pública.
 */
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "content", "restaurants");
const force = process.argv.includes("--force");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Tenta variações do endereço, da mais específica para a mais genérica. */
function candidates(address: string): string[] {
  const clean = address
    .replace(/\s*-\s*lj\s*\d+/i, "")
    .replace(/\s*-\s*LJ\s*\d+/i, "")
    .replace(/\bBH\b/, "Belo Horizonte")
    .trim();
  const withState = /MG$/.test(clean) ? clean : `${clean} - MG`;
  const noNeighborhood = withState.replace(/ - [^,-]+, /, ", ");
  return [...new Set([withState, noNeighborhood])].map((s) => `${s}, Brasil`);
}

async function lookup(q: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "br");
  const res = await fetch(url, {
    headers: { "User-Agent": "my-food-list/0.1 (personal project)" },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = (await res.json()) as { lat: string; lon: string }[];
  return data[0] ? { lat: +data[0].lat, lng: +data[0].lon } : null;
}

async function main() {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
  let done = 0;
  for (const file of files) {
    const p = path.join(DIR, file);
    const r = JSON.parse(fs.readFileSync(p, "utf8"));
    if (r.coordinates && !force) continue;
    let found = null;
    for (const q of candidates(r.address)) {
      found = await lookup(q);
      await sleep(1100);
      if (found) break;
    }
    if (found) {
      r.coordinates = found;
      fs.writeFileSync(p, JSON.stringify(r, null, 2) + "\n");
      console.log(`✔ ${r.name}: ${found.lat}, ${found.lng}`);
      done++;
    } else {
      console.warn(`✖ ${r.name}: não encontrado (${r.address})`);
    }
  }
  console.log(`\n${done} restaurante(s) geocodificado(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
