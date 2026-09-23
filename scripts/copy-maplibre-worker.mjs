/**
 * O MapLibre resolve o worker via import.meta.url, o que quebra sob o Turbopack.
 * Copiamos o worker (e o módulo compartilhado que ele importa) para public/
 * e apontamos setWorkerUrl() para ele.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];
const outDir = path.join(process.cwd(), "public", "maplibre");
mkdirSync(outDir, { recursive: true });

for (const f of FILES) {
  copyFileSync(require.resolve(`maplibre-gl/dist/${f}`), path.join(outDir, f));
}
console.log(`maplibre worker → public/maplibre/{${FILES.join(",")}}`);
