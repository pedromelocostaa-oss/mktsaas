// Regras de validação por rede (Fase 2 aceite):
// "Formato ou proporção fora do aceito por uma rede alvo avisa antes de salvar."

import { describe, expect, it } from "vitest";
import { validarMedia } from "@/lib/network-rules";

describe("validarMedia", () => {
  it("imagem 1:1 no Instagram passa sem aviso", () => {
    const r = validarMedia(
      { kind: "IMAGE", mimeType: "image/jpeg", bytes: 1_000_000, width: 1080, height: 1080 },
      ["INSTAGRAM"],
    );
    expect(r).toHaveLength(0);
  });

  it("proporção quadrada rejeitada pelo YouTube (aceita 16:9 e 9:16)", () => {
    const r = validarMedia(
      { kind: "IMAGE", mimeType: "image/jpeg", bytes: 1_000_000, width: 1080, height: 1080 },
      ["YOUTUBE"],
    );
    expect(r.some((w) => w.kind === "ratio")).toBe(true);
  });

  it("mime incompatível avisa por rede", () => {
    const r = validarMedia(
      { kind: "IMAGE", mimeType: "image/gif", bytes: 500_000, width: 1080, height: 1080 },
      ["INSTAGRAM"],
    );
    expect(r.find((w) => w.kind === "mime")).toBeTruthy();
  });

  it("vídeo mais longo que X avisa (140s)", () => {
    const r = validarMedia(
      {
        kind: "VIDEO",
        mimeType: "video/mp4",
        bytes: 5_000_000,
        width: 1080,
        height: 1920,
        durationMs: 200_000, // 200s > 140s
      },
      ["X"],
    );
    expect(r.find((w) => w.kind === "duration")).toBeTruthy();
  });

  it("Reels 9:16 no Instagram passa", () => {
    const r = validarMedia(
      {
        kind: "VIDEO",
        mimeType: "video/mp4",
        bytes: 20_000_000,
        width: 1080,
        height: 1920,
        durationMs: 30_000,
      },
      ["INSTAGRAM"],
    );
    expect(r).toHaveLength(0);
  });

  it("valida contra múltiplas redes ao mesmo tempo", () => {
    const r = validarMedia(
      { kind: "IMAGE", mimeType: "image/jpeg", bytes: 1_000_000, width: 1080, height: 1080 },
      ["INSTAGRAM", "YOUTUBE"],
    );
    // Instagram aceita 1:1; YouTube não.
    expect(r.filter((w) => w.network === "INSTAGRAM")).toHaveLength(0);
    expect(r.filter((w) => w.network === "YOUTUBE").length).toBeGreaterThan(0);
  });
});
