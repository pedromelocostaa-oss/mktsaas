// Fase 2 aceite: "Mídia órfã (upload sem post salvo) é limpa por job em 24h."
//
// Este teste NÃO fala com R2 (não temos credenciais aqui). Ele valida:
// - o job existe como export puro
// - responde graciosamente quando R2 não está configurado

import { describe, expect, it } from "vitest";
import { limparOrfaos } from "@/server/services/media-cleanup";

describe("limparOrfaos", () => {
  it("sem R2 configurado, retorna erro 'r2_not_configured' em vez de estourar", async () => {
    const bkp = {
      e: process.env.R2_ENDPOINT,
      a: process.env.R2_ACCESS_KEY_ID,
      s: process.env.R2_SECRET_ACCESS_KEY,
      b: process.env.R2_BUCKET,
    };
    delete process.env.R2_ENDPOINT;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET;
    try {
      const r = await limparOrfaos();
      expect(r.errors).toContain("r2_not_configured");
      expect(r.deleted).toBe(0);
    } finally {
      if (bkp.e) process.env.R2_ENDPOINT = bkp.e;
      if (bkp.a) process.env.R2_ACCESS_KEY_ID = bkp.a;
      if (bkp.s) process.env.R2_SECRET_ACCESS_KEY = bkp.s;
      if (bkp.b) process.env.R2_BUCKET = bkp.b;
    }
  });
});
