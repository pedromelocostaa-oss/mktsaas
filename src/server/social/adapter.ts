// Contrato de adapter — docs/05. Um por rede, mesma forma. Rede manual
// implementa e simplesmente não coleta.

import type { Network, SocialConnection } from "@prisma/client";

export interface TokenSet {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  externalId: string;
  displayName?: string | null;
  scopes?: string[];
}

export interface BrandDailyMetricInput {
  date: Date; // 00:00 UTC do dia
  reach: number;
  engagement: number;
  followers: number;
  followersDelta: number;
}

export interface PostMetricInput {
  reach: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  raw: unknown;
}

export interface SocialAdapter {
  network: Network;
  automatic: boolean;

  authUrl(brandId: string, state: string): string | null;
  exchangeCode(code: string, redirectUri: string): Promise<TokenSet>;
  refresh(conn: SocialConnection): Promise<TokenSet>;

  fetchProfileDaily(conn: SocialConnection, from: Date, to: Date): Promise<BrandDailyMetricInput[]>;
  fetchPostMetrics(conn: SocialConnection, externalId: string): Promise<PostMetricInput>;
}

/** Erro reconhecível — quando levantado, o job de coleta grava lastSyncError e continua. */
export class AdapterError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
