// Adapter "manual" — mesma interface, só não coleta (docs/05).
// A UI trata rede manual como cidadã de primeira classe: chip
// "preenchimento manual" e caixa de números no post.

import type { Network } from "@prisma/client";
import { AdapterError, type SocialAdapter } from "./adapter";

function make(network: Network): SocialAdapter {
  return {
    network,
    automatic: false,
    authUrl: () => null,
    exchangeCode: () => {
      throw new AdapterError("manual", `${network} não tem OAuth no v1.`);
    },
    refresh: () => {
      throw new AdapterError("manual", `${network} não tem OAuth no v1.`);
    },
    fetchProfileDaily: async () => [],
    fetchPostMetrics: () => {
      throw new AdapterError("manual", `${network} não coleta automaticamente no v1.`);
    },
  };
}

export const tiktokAdapter = make("TIKTOK");
export const youtubeAdapter = make("YOUTUBE");
export const linkedinAdapter = make("LINKEDIN");
export const xAdapter = make("X");
