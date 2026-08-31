// Cliente R2 (S3-compatível). Fase 2 — upload direto por URL assinada (docs/03).
// A app NUNCA proxi o binário; o browser envia direto para o R2.

import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _client: S3Client | null = null;

function client() {
  if (_client) return _client;
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 não configurado. Preencha R2_ENDPOINT/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY em .env.local.");
  }
  _client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

export function bucket() {
  const b = process.env.R2_BUCKET;
  if (!b) throw new Error("R2_BUCKET não configurado.");
  return b;
}

export function r2ConfiguredSync() {
  return !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);
}

/**
 * URL assinada de PUT com expiração curta. O browser sobe direto o binário —
 * não passa pelo Node da app (docs/03 media.requestUpload; Fase 2 aceite:
 * vídeo de 200 MB sobe sem passar pelo servidor).
 */
export async function signPutUrl(key: string, contentType: string, expiresIn = 60 * 15) {
  const cmd = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client(), cmd, { expiresIn });
}

export async function deleteObject(key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

/** URL pública para exibir a mídia. Usa R2_PUBLIC_URL (custom domain ou r2.dev). */
export function publicUrl(key: string) {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) return `/media/${key}`; // fallback dev — não expõe nada real
  return `${base.replace(/\/$/, "")}/${key}`;
}

/** Chave estável e única: <org>/<brand>/<post>/<uuid>-<slug>.<ext> */
export function buildKey(opts: { orgId: string; brandId: string; postId: string; originalName: string }) {
  const ext = opts.originalName.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? "bin";
  const slug = opts.originalName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "arquivo";
  const uid = cryptoRandom(10);
  return `${opts.orgId}/${opts.brandId}/${opts.postId}/${uid}-${slug}.${ext}`;
}

function cryptoRandom(n: number) {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
