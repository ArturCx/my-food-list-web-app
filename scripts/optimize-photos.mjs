/**
 * Para cada foto em public/restaurants/<slug>/N.jpg gera:
 *   N.jpg        original recomprimido (máx. 1600px, jpg q80)
 *   N-md.jpg     960px, para o painel de detalhe
 *   N-thumb.jpg  192x192 cover, para a lista (48px em telas 2x/4x)
 * e atualiza a lista `photos` do JSON (só os originais).
 * Respeita `photoFocus` ao recortar a thumbnail.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(process.cwd(), "public", "restaurants");
const CONTENT = path.join(process.cwd(), "content", "restaurants");
const isOriginal = (f) => /^\d+\.(jpe?g|png|webp)$/i.test(f);

const THUMB = 192;

/** Recorte quadrado centrado no ponto de foco (ou "attention" do sharp quando não há foco). */
async function thumbnail(buf, focus) {
  if (!focus) {
    return sharp(buf).resize({ width: THUMB, height: THUMB, fit: "cover", position: "attention" }).jpeg({ quality: 75, mozjpeg: true }).toBuffer();
  }
  const { width: w, height: h } = await sharp(buf).metadata();
  const scale = Math.max(THUMB / w, THUMB / h);
  const sw = Math.ceil(w * scale), sh = Math.ceil(h * scale);
  const clamp = (v, max) => Math.max(0, Math.min(max, Math.round(v)));
  const left = clamp((sw * focus.x) / 100 - THUMB / 2, sw - THUMB);
  const top = clamp((sh * focus.y) / 100 - THUMB / 2, sh - THUMB);
  return sharp(buf).resize(sw, sh).extract({ left, top, width: THUMB, height: THUMB }).jpeg({ quality: 75, mozjpeg: true }).toBuffer();
}

let before = 0, after = 0;
for (const slug of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT, slug);
  if (!fs.statSync(dir).isDirectory()) continue;
  const jf = path.join(CONTENT, `${slug}.json`);
  const r = fs.existsSync(jf) ? JSON.parse(fs.readFileSync(jf, "utf8")) : null;

  for (const f of fs.readdirSync(dir)) {
    if (!isOriginal(f)) continue;
    const p = path.join(dir, f);
    const buf = fs.readFileSync(p);
    before += buf.length;
    const base = sharp(buf).rotate();
    const out = await base.clone().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    const dest = p.replace(/\.(png|webp|jpeg)$/i, ".jpg");
    if (dest !== p) fs.unlinkSync(p);
    fs.writeFileSync(dest, out);
    after += out.length;

    const stem = path.basename(dest, ".jpg");
    const focus = r?.photoFocus?.[`/restaurants/${slug}/${stem}.jpg`];
    const md = await base.clone().resize({ width: 960, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
    fs.writeFileSync(path.join(dir, `${stem}-md.jpg`), md);
    fs.writeFileSync(path.join(dir, `${stem}-thumb.jpg`), await thumbnail(out, focus));
  }

  if (r) {
    r.photos = fs.readdirSync(dir).filter(isOriginal).sort((a, b) => parseInt(a) - parseInt(b)).map((f) => `/restaurants/${slug}/${f}`);
    fs.writeFileSync(jf, JSON.stringify(r, null, 2) + "\n");
  }
}
console.log(`${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB (originais) + variantes md/thumb`);
