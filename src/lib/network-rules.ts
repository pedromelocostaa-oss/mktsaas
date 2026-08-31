// Regras de formato/proporção por rede — Fase 2. Valores de referência das
// documentações oficiais em 2026; conservador quando a rede permite variação.
// A UI usa isto para AVISAR antes de salvar (Fase 2 aceite), não bloqueia.

import type { Network } from "@prisma/client";

export interface MediaMeta {
  kind: "IMAGE" | "VIDEO";
  mimeType: string;
  bytes: number;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
}

interface NetworkRule {
  imageMime: string[];
  videoMime: string[];
  /** Proporções aceitas — cada uma como [w, h]. */
  ratios: Array<[number, number]>;
  /** Duração de vídeo (ms). null quando ilimitado ou não aplicável. */
  minVideoMs?: number;
  maxVideoMs?: number;
  /** Tamanho máximo por arquivo (bytes). */
  maxBytes: number;
  /** Tolerância na comparação de proporção (fração). */
  ratioTolerance?: number;
}

const MB = 1024 * 1024;

// Instagram (feed + Reels). Reels 9:16; feed 1:1, 4:5, 1.91:1.
export const RULES: Record<Network, NetworkRule> = {
  INSTAGRAM: {
    imageMime: ["image/jpeg", "image/png", "image/webp"],
    videoMime: ["video/mp4", "video/quicktime"],
    ratios: [[1, 1], [4, 5], [1.91, 1], [9, 16]],
    minVideoMs: 3_000,
    maxVideoMs: 15 * 60 * 1000,
    maxBytes: 300 * MB,
    ratioTolerance: 0.02,
  },
  TIKTOK: {
    imageMime: ["image/jpeg", "image/png", "image/webp"],
    videoMime: ["video/mp4", "video/quicktime", "video/webm"],
    ratios: [[9, 16], [1, 1]],
    minVideoMs: 3_000,
    maxVideoMs: 10 * 60 * 1000,
    maxBytes: 500 * MB,
    ratioTolerance: 0.02,
  },
  FACEBOOK: {
    imageMime: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    videoMime: ["video/mp4", "video/quicktime"],
    ratios: [[1, 1], [4, 5], [1.91, 1], [16, 9], [9, 16]],
    maxVideoMs: 240 * 60 * 1000,
    maxBytes: 1024 * MB,
    ratioTolerance: 0.03,
  },
  YOUTUBE: {
    imageMime: ["image/jpeg", "image/png", "image/webp"],
    videoMime: ["video/mp4", "video/quicktime", "video/webm"],
    ratios: [[16, 9], [9, 16]],
    maxBytes: 2048 * MB,
    ratioTolerance: 0.02,
  },
  LINKEDIN: {
    imageMime: ["image/jpeg", "image/png"],
    videoMime: ["video/mp4"],
    ratios: [[1, 1], [1.91, 1], [4, 5], [16, 9], [9, 16]],
    maxVideoMs: 10 * 60 * 1000,
    maxBytes: 200 * MB,
    ratioTolerance: 0.03,
  },
  X: {
    imageMime: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    videoMime: ["video/mp4"],
    ratios: [[16, 9], [1, 1], [4, 5], [9, 16]],
    maxVideoMs: 140 * 1000,
    maxBytes: 512 * MB,
    ratioTolerance: 0.03,
  },
};

const NET_LABEL: Record<Network, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
  LINKEDIN: "LinkedIn",
  X: "X",
};

export interface MediaWarning {
  network: Network;
  kind: "mime" | "ratio" | "duration" | "bytes";
  message: string;
}

/**
 * Retorna a lista de avisos por rede. UI usa para mostrar warning ANTES de
 * salvar (Fase 2 aceite). Nunca bloqueia — o usuário decide.
 */
export function validarMedia(m: MediaMeta, networks: Network[]): MediaWarning[] {
  const out: MediaWarning[] = [];
  for (const n of networks) {
    const r = RULES[n];
    const label = NET_LABEL[n];

    const allowedMime = m.kind === "VIDEO" ? r.videoMime : r.imageMime;
    if (!allowedMime.includes(m.mimeType)) {
      out.push({
        network: n,
        kind: "mime",
        message: `${label} não aceita ${m.mimeType}. Aceita ${allowedMime.join(", ")}.`,
      });
    }

    if (m.bytes > r.maxBytes) {
      out.push({
        network: n,
        kind: "bytes",
        message: `Arquivo maior que ${Math.round(r.maxBytes / MB)} MB para ${label}.`,
      });
    }

    if (m.width && m.height) {
      const has = matchesAnyRatio(m.width, m.height, r.ratios, r.ratioTolerance ?? 0.02);
      if (!has) {
        out.push({
          network: n,
          kind: "ratio",
          message: `Proporção ${m.width}×${m.height} não é padrão para ${label}. Aceitas: ${r.ratios.map(([w, h]) => `${w}:${h}`).join(", ")}.`,
        });
      }
    }

    if (m.kind === "VIDEO" && m.durationMs != null) {
      if (r.minVideoMs != null && m.durationMs < r.minVideoMs) {
        out.push({
          network: n,
          kind: "duration",
          message: `Vídeo mais curto que ${Math.round(r.minVideoMs / 1000)}s — ${label} pode recusar.`,
        });
      }
      if (r.maxVideoMs != null && m.durationMs > r.maxVideoMs) {
        const s = Math.round(r.maxVideoMs / 1000);
        const rotulo = s >= 60 ? `${Math.round(s / 60)} min` : `${s}s`;
        out.push({
          network: n,
          kind: "duration",
          message: `Vídeo mais longo que ${rotulo} — ${label} não aceita.`,
        });
      }
    }
  }
  return out;
}

function matchesAnyRatio(w: number, h: number, list: Array<[number, number]>, tol: number) {
  const target = w / h;
  return list.some(([rw, rh]) => {
    const r = rw / rh;
    return Math.abs(r - target) / r <= tol;
  });
}
