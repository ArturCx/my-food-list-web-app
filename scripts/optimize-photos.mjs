/**
 * Para cada foto em public/restaurants/<slug>/N.jpg gera:
 *   N.jpg        original recomprimido (máx. 1600px, jpg q80)
 *   N-md.jpg     960px, para o painel de detalhe
 *   N-thumb.jpg  192x192 cover, para a lista (48px em telas 2x/4x)
 * e atualiza a lista `photos` do JSON (só os originais).
 * Respeita `photoFocus` ao recortar a thumbnail.
 *
 * Idempotente: o original só é recomprimido se for png/webp ou maior que 1600px
 * (recomprimir jpg a cada rodada degradaria a foto e mudaria os bytes, forçando
 * reupload). As variantes só são regeradas se faltarem, se o original for mais
 * novo, ou se o foco da thumbnail mudou (hash do foco guardado em .focus.json).
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

let before = 0, after = 0, touched = 0;
for (const slug of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT, slug);
  if (!fs.statSync(dir).isDirectory()) continue;
  const jf = path.join(CONTENT, `${slug}.json`);
  const r = fs.existsSync(jf) ? JSON.parse(fs.readFileSync(jf, "utf8")) : null;

  const focusFile = path.join(dir, ".focus.json");
  const focusSeen = fs.existsSync(focusFile) ? JSON.parse(fs.readFileSync(focusFile, "utf8")) : {};

  for (const f of fs.readdirSync(dir)) {
    if (!isOriginal(f)) continue;
    let p = path.join(dir, f);
    let buf = fs.readFileSync(p);
    before += buf.length;

    // Original: recomprime só se precisar.
    const meta = await sharp(buf).metadata();
    const needsEncode = !/\.jpe?g$/i.test(f) || (meta.width ?? 0) > 1600 || (meta.orientation ?? 1) !== 1;
    if (needsEncode) {
      const out = await sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
      const dest = p.replace(/\.(png|webp|jpeg)$/i, ".jpg");
      if (dest !== p) fs.unlinkSync(p);
      fs.writeFileSync(dest, out);
      p = dest; buf = out; touched++;
    }
    after += buf.length;

    const stem = path.basename(p, ".jpg");
    const key = `/restaurants/${slug}/${stem}.jpg`;
    const focus = r?.photoFocus?.[key];
    const focusKey = focus ? `${focus.x},${focus.y}` : "";
    const mdPath = path.join(dir, `${stem}-md.jpg`), thumbPath = path.join(dir, `${stem}-thumb.jpg`);
    const mtime = fs.statSync(p).mtimeMs;
    const stale = (v) => !fs.existsSync(v) || fs.statSync(v).mtimeMs < mtime;

    if (stale(mdPath)) {
      fs.writeFileSync(mdPath, await sharp(buf).resize({ width: 960, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toBuffer());
      touched++;
    }
    if (stale(thumbPath) || focusSeen[stem] !== focusKey) {
      fs.writeFileSync(thumbPath, await thumbnail(buf, focus));
      focusSeen[stem] = focusKey;
      touched++;
    }
  }
  fs.writeFileSync(focusFile, JSON.stringify(focusSeen));

  if (r) {
    r.photos = fs.readdirSync(dir).filter(isOriginal).sort((a, b) => parseInt(a) - parseInt(b)).map((f) => `/restaurants/${slug}/${f}`);
    fs.writeFileSync(jf, JSON.stringify(r, null, 2) + "\n");
  }
}
console.log(`${touched} arquivo(s) gerado(s); originais: ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB`);
