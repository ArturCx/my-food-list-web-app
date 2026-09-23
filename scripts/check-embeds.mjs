/**
 * Testa se cada `instagramEmbed` é embedável publicamente. O endpoint /media/
 * redireciona (302) para a imagem de posts públicos e responde 404 para posts
 * de contas privadas, com embed desativado ou removidos.
 * Uso: pnpm check-embeds
 */
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "content", "restaurants");
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
let ok = 0, bad = [];
for (const f of files) {
  const r = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
  if (!r.instagramEmbed) continue;
  const m = r.instagramEmbed.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
  if (!m) { bad.push(`${r.name}: link inválido`); continue; }
  const res = await fetch(`https://www.instagram.com/p/${m[2]}/media/?size=l`, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0" } });
  if (res.status === 302) ok++;
  else bad.push(`${r.name}: ${res.status} (${r.instagramEmbed})`);
  await new Promise((r) => setTimeout(r, 300));
}
console.log(`${ok} embed(s) públicos`);
if (bad.length) console.log("não embedáveis:\n  " + bad.join("\n  "));
