/**
 * Lê um txt com linhas "Nome do lugar = <url ou caminho local>" e coloca cada
 * imagem como foto PRINCIPAL do restaurante. O nome é casado com o slug/nome
 * dos JSONs ignorando acentos, pontuação e texto entre parênteses.
 * Links de página do imgur viram link direto.
 *
 * Uso: pnpm apply-photos <arquivo.txt> [--replace]   (--replace substitui a principal atual)
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const [, , file, flag] = process.argv;
if (!file) { console.error("Uso: pnpm apply-photos <arquivo.txt> [--replace]"); process.exit(1); }
const replace = flag === "--replace";

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "");
const CONTENT = path.join(process.cwd(), "content", "restaurants");
const index = fs.readdirSync(CONTENT).map((f) => {
  const r = JSON.parse(fs.readFileSync(path.join(CONTENT, f), "utf8"));
  return { slug: r.slug, keys: [norm(r.slug), norm(r.name)] };
});
const findSlug = (name) => {
  const n = norm(name);
  const hit = index.find((r) => r.keys.includes(n)) ?? index.find((r) => r.keys.some((k) => k.startsWith(n) || n.startsWith(k)));
  return hit?.slug;
};

for (const line of fs.readFileSync(file, "utf8").split("\n")) {
  if (!line.includes("=")) continue;
  const i = line.indexOf("=");
  const name = line.slice(0, i).trim();
  let src = line.slice(i + 1).trim().replace(/^\(.*?\)\s*/, "");
  const slug = findSlug(name);
  if (!slug) { console.log(`✖ "${name}": nenhum restaurante encontrado`); continue; }
  const dir = path.join(process.cwd(), "public", "restaurants", slug);
  fs.mkdirSync(dir, { recursive: true });
  if (replace) for (const f of fs.readdirSync(dir)) if (/^1\./.test(f)) fs.unlinkSync(path.join(dir, f));

  if (src.startsWith("/")) {
    if (!fs.existsSync(src)) { console.log(`✖ ${slug}: arquivo local não existe: ${src}`); continue; }
    const existing = fs.readdirSync(dir).filter((f) => /^\d+\./.test(f)).sort((a, b) => parseInt(b) - parseInt(a));
    for (const f of existing) fs.renameSync(path.join(dir, f), path.join(dir, `${parseInt(f) + 1}${f.slice(f.indexOf("."))}`));
    fs.copyFileSync(src, path.join(dir, `1${path.extname(src) || ".jpg"}`));
    console.log(`✔ ${slug}: arquivo local (principal)`);
    continue;
  }
  const im = src.match(/^https?:\/\/imgur\.com\/([A-Za-z0-9]+)$/);
  if (im) src = `https://i.imgur.com/${im[1]}.jpg`;
  try {
    execFileSync("node", ["scripts/add-photo.mjs", slug, src], { stdio: ["ignore", "pipe", "pipe"] });
    console.log(`✔ ${slug}`);
  } catch (e) {
    console.log(`✖ ${slug}: ${(e.stderr || e.stdout || "").toString().trim().split("\n").pop()}`);
  }
}
execFileSync("node", ["scripts/optimize-photos.mjs"], { stdio: "inherit" });
