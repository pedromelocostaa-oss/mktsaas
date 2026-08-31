// AES-256-GCM para tokens de rede social em repouso (docs/08 #10, docs/02).
// A chave (SOCIAL_TOKEN_KEY) é separada do resto da app justamente para que um
// dump do banco NÃO vire acesso ao Instagram de ninguém.
//
// Formato: base64url(iv || ciphertext || authTag) — auto-contido.

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 12; // 96 bits — recomendado GCM
const TAG_LEN = 16;

function key(): Buffer {
  const raw = process.env.SOCIAL_TOKEN_KEY;
  if (!raw) throw new Error("SOCIAL_TOKEN_KEY não configurado. Gere com: openssl rand -hex 32");
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== 32) throw new Error("SOCIAL_TOKEN_KEY precisa ter 32 bytes (64 chars hex).");
  return buf;
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return b64url(Buffer.concat([iv, enc, tag]));
}

export function decryptToken(sealed: string): string {
  const buf = fromB64url(sealed);
  if (buf.length < IV_LEN + TAG_LEN + 1) throw new Error("Token cifrado inválido.");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const enc = buf.subarray(IV_LEN, buf.length - TAG_LEN);
  const decipher = createDecipheriv(ALG, key(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

/** Predicado que evita crashar quando a chave falta em dev. */
export function socialCryptoConfigured() {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}
