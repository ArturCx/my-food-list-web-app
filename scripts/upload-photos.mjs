/**
 * Envia public/restaurants/** para o bucket R2 (API S3), pulando o que já está igual
 * (compara o MD5 local com o ETag remoto). Rode depois de `pnpm optimize-photos`.
 *
 * Variáveis em .env.local (nunca commitar):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 *
 * Uso: pnpm upload-photos [--dry]
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { S3Client, PutObjectCommand, HeadObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"]) {
  if (!process.env[k]) { console.error(`Falta ${k} no .env.local`); process.exit(1); }
}
const dry = process.argv.includes("--dry");
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

// Falha cedo se o bucket não existir ou o token não o enxergar.
try {
  await s3.send(new HeadBucketCommand({ Bucket: R2_BUCKET }));
} catch (e) {
  console.error(`Bucket "${R2_BUCKET}" inacessível (${e.name}). Confira o nome e o escopo do token.`);
  process.exit(1);
}

const ROOT = path.join(process.cwd(), "public", "restaurants");
const files = [];
for (const slug of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT, slug);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) if (/\.jpg$/i.test(f)) files.push({ key: `restaurants/${slug}/${f}`, file: path.join(dir, f) });
}

let sent = 0, skipped = 0, bytes = 0;
const CONCURRENCY = 8;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (files.length) {
    const { key, file } = files.shift();
    const body = fs.readFileSync(file);
    const md5 = crypto.createHash("md5").update(body).digest("hex");
    try {
      const head = await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
      if (head.ETag?.replace(/"/g, "") === md5) { skipped++; continue; }
    } catch (e) {
      if (e.$metadata?.httpStatusCode !== 404) throw e;
    }
    if (!dry) {
      await s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET, Key: key, Body: body,
        ContentType: "image/jpeg",
        CacheControl: "public, max-age=86400, stale-while-revalidate=604800",
      }));
    }
    sent++; bytes += body.length;
    console.log(`${dry ? "(dry) " : ""}↑ ${key}`);
  }
}));
console.log(`\n${sent} enviado(s) (${(bytes / 1e6).toFixed(1)} MB), ${skipped} já estavam iguais.`);
