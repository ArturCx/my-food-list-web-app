/** Redimensiona fotos em public/restaurants para no máximo 1600px e recomprime (jpg q80). */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(process.cwd(), "public", "restaurants");
let before = 0, after = 0;
for (const slug of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT, slug);
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const buf = fs.readFileSync(p);
    before += buf.length;
    const out = await sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    const dest = p.replace(/\.(png|webp|jpeg)$/i, ".jpg");
    if (dest !== p) fs.unlinkSync(p);
    fs.writeFileSync(dest, out);
    after += out.length;
  }
  // Atualiza extensões no JSON caso tenham mudado.
  const jf = path.join(process.cwd(), "content", "restaurants", `${slug}.json`);
  if (fs.existsSync(jf)) {
    const r = JSON.parse(fs.readFileSync(jf, "utf8"));
    r.photos = fs.readdirSync(dir).sort().map((f) => `/restaurants/${slug}/${f}`);
    fs.writeFileSync(jf, JSON.stringify(r, null, 2) + "\n");
  }
}
console.log(`${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB`);
