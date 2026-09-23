/**
 * Baixa uma foto (ex.: link do CDN do Instagram, copiado do navegador) e a coloca
 * como PRINCIPAL do restaurante, empurrando as outras para trás. Depois roda o
 * optimize-photos, que recomprime e atualiza o JSON.
 *
 * Uso: pnpm add-photo <slug> "<url>" [--last]   (--last coloca no fim em vez de no início)
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const [, , slug, url, flag] = process.argv;
if (!slug || !url) {
  console.error('Uso: pnpm add-photo <slug> "<url>" [--last]');
  process.exit(1);
}
const json = path.join(process.cwd(), "content", "restaurants", `${slug}.json`);
if (!fs.existsSync(json)) {
  console.error(`Restaurante "${slug}" não existe.`);
  process.exit(1);
}
const dir = path.join(process.cwd(), "public", "restaurants", slug);
fs.mkdirSync(dir, { recursive: true });

const res = await fetch(url, {
  headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36", Accept: "image/*" },
});
if (!res.ok) { console.error(`HTTP ${res.status}`); process.exit(1); }
const type = (res.headers.get("content-type") || "").split(";")[0];
if (!type.startsWith("image/")) { console.error(`Não é imagem (${type}). Link expirado?`); process.exit(1); }
const buf = Buffer.from(await res.arrayBuffer());

const existing = fs.readdirSync(dir).filter((f) => /^\d+\.(jpe?g|png|webp)$/i.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
if (flag === "--last") {
  fs.writeFileSync(path.join(dir, `${existing.length + 1}.jpg`), buf);
} else {
  // Renomeia de trás para frente para abrir o slot 1.
  for (const f of [...existing].reverse()) {
    const n = parseInt(f);
    fs.renameSync(path.join(dir, f), path.join(dir, `${n + 1}${path.extname(f)}`));
  }
  fs.writeFileSync(path.join(dir, "1.jpg"), buf);
}
console.log(`✔ ${slug}: ${(buf.length / 1024).toFixed(0)} KB salvos (${flag === "--last" ? "última" : "principal"})`);
execFileSync("node", ["scripts/optimize-photos.mjs"], { stdio: "inherit" });
