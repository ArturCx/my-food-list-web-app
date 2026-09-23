/**
 * Aplica um JSON de pesquisa (array de objetos por slug) nos arquivos em
 * content/restaurants/ e baixa as fotos para public/restaurants/<slug>/.
 *
 * Uso: node scripts/import-research.mjs <resultados.json>
 *
 * Campos aceitos por item: address, website, instagram, description, badge,
 * hours, menuUrl, photos (URLs). Campos null/ausentes são ignorados, exceto
 * badge:null que remove o badge. Se o endereço mudar, coordinates volta a
 * null para o `pnpm geocode` recalcular. Slugs que ainda não existem viram
 * arquivos novos (exigem `category`; status "closed" é pulado).
 */
import fs from "node:fs";
import path from "node:path";

const [, , inputPath] = process.argv;
if (!inputPath) {
  console.error("Uso: node scripts/import-research.mjs <resultados.json>");
  process.exit(1);
}

const CONTENT = path.join(process.cwd(), "content", "restaurants");
const PUBLIC = path.join(process.cwd(), "public", "restaurants");
const results = JSON.parse(fs.readFileSync(inputPath, "utf8"));

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

async function download(url, dest) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) my-food-list/0.1", Accept: "image/*" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = (res.headers.get("content-type") || "").split(";")[0].trim();
  const ext = EXT[type];
  if (!ext) throw new Error(`não é imagem (${type})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 5_000) throw new Error(`muito pequena (${buf.length}B)`);
  fs.writeFileSync(dest + ext, buf);
  return path.basename(dest + ext);
}

for (const item of results) {
  const file = path.join(CONTENT, `${item.slug}.json`);
  const isNew = !fs.existsSync(file);
  if (isNew && item.status === "closed") {
    console.warn(`✖ ${item.slug}: fechado, não criado — ${item.statusNote ?? ""}`);
    continue;
  }
  if (isNew && !item.category) {
    console.warn(`✖ ${item.slug}: novo sem category, pulando`);
    continue;
  }
  const r = isNew
    ? { slug: item.slug, name: item.name, description: "", category: item.category, address: "", coordinates: null, photos: [] }
    : JSON.parse(fs.readFileSync(file, "utf8"));
  const changes = isNew ? ["novo"] : [];
  if (isNew) { r.address = item.address ?? ""; r.description = item.description ?? ""; }
  if (item.category && item.category !== r.category) { r.category = item.category; changes.push("category"); }

  if (item.status && item.status !== "open") {
    console.warn(`! ${r.name}: status "${item.status}" — ${item.statusNote ?? ""}`);
  }
  if (item.name && item.name !== r.name) { r.name = item.name; changes.push("name"); }
  if (item.address && norm(item.address) !== norm(r.address)) {
    r.address = item.address;
    r.coordinates = null;
    changes.push("address→geocode");
  }
  for (const k of ["website", "instagram", "description", "menuUrl"]) {
    if (item[k] && item[k] !== r[k]) { r[k] = item[k]; changes.push(k); }
  }
  if (item.instagram && item.instagram.startsWith("@")) r.instagram = item.instagram.slice(1);
  if ("badge" in item) {
    if (item.badge && item.badge !== r.badge) { r.badge = item.badge; changes.push("badge"); }
    if (item.badge === null && r.badge) { delete r.badge; changes.push("-badge"); }
  }
  if (item.hours && Object.keys(item.hours).length) { r.hours = item.hours; changes.push("hours"); }

  if (Array.isArray(item.photos) && item.photos.length) {
    const dir = path.join(PUBLIC, item.slug);
    fs.mkdirSync(dir, { recursive: true });
    const saved = [];
    for (const [i, url] of item.photos.slice(0, 3).entries()) {
      try {
        const name = await download(url, path.join(dir, String(i + 1)));
        saved.push(`/restaurants/${item.slug}/${name}`);
      } catch (e) {
        console.warn(`  foto ${i + 1} de ${r.name} falhou: ${e.message} (${url})`);
      }
    }
    if (saved.length) { r.photos = saved; changes.push(`${saved.length} foto(s)`); }
  }

  // Ordem estável das chaves para diffs limpos.
  const ordered = {};
  for (const k of ["slug","name","description","category","badge","address","coordinates","website","instagram","instagramEmbed","menuUrl","hours","photos"]) {
    if (k in r) ordered[k] = r[k];
  }
  fs.writeFileSync(file, JSON.stringify(ordered, null, 2) + "\n");
  console.log(`✔ ${r.name}: ${changes.length ? changes.join(", ") : "sem mudanças"}`);
}
