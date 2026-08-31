// Tokens de links públicos (docs/04):
//   token  = base64url(32 bytes aleatórios)   ← vai na URL, nunca no banco
//   lookup = sha256(token)                    ← é isto que se grava e indexa
//
// Vazamento do dump não vira acesso.

import { createHash, randomBytes } from "crypto";

export function novoToken(): string {
  const buf = randomBytes(32);
  return b64url(buf);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function b64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
