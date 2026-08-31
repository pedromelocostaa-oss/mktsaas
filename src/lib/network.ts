// Metadados de rede social — cor, nome, modo de coleta.
// Cores do handoff (dessaturadas, não as oficiais das marcas).

import type { Network } from "@prisma/client";

export const NETWORKS: readonly Network[] = ["INSTAGRAM", "TIKTOK", "FACEBOOK", "YOUTUBE", "LINKEDIN", "X"];

export const netMeta: Record<Network, { label: string; color: string; source: "API" | "MANUAL" }> = {
  INSTAGRAM: { label: "Instagram", color: "var(--color-net-instagram)", source: "API" },
  TIKTOK: { label: "TikTok", color: "var(--color-net-tiktok)", source: "API" },
  FACEBOOK: { label: "Facebook", color: "var(--color-net-facebook)", source: "API" },
  YOUTUBE: { label: "YouTube", color: "var(--color-net-youtube)", source: "MANUAL" },
  LINKEDIN: { label: "LinkedIn", color: "var(--color-net-linkedin)", source: "MANUAL" },
  X: { label: "X", color: "var(--color-net-x)", source: "MANUAL" },
};

export const STAGE_LABEL = {
  IDEA: "Ideia",
  PRODUCTION: "Em produção",
  SCHEDULED: "Agendado",
  PUBLISHED: "Publicado",
} as const;

export const STAGE_COLOR = {
  IDEA: "var(--color-muted-2)",
  PRODUCTION: "var(--color-ink-2)",
  SCHEDULED: "var(--color-accent)",
  PUBLISHED: "var(--color-ink)",
} as const;

export const REVIEW_LABEL = {
  PENDING: "Aguardando aprovação",
  APPROVED: "Aprovado",
  CHANGES: "Ajuste pedido",
} as const;
