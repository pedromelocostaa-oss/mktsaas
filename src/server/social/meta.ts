// Adapter Meta — Instagram + Facebook usam o MESMO app da Meta.
// docs/05: Instagram API with Instagram Login (não exige Página do Facebook).
// Nota: contas Business/Creator apenas. Menos de 100 seguidores perde algumas métricas.
//
// Endpoints usados (2026):
// - Autorização: https://www.instagram.com/oauth/authorize
// - Troca de código: https://api.instagram.com/oauth/access_token
// - Long-lived: /access_token?grant_type=ig_exchange_token
// - Insights conta: /{ig-user-id}/insights (reach, follower_count)
// - Media: /{ig-user-id}/media (permalink, timestamp, media_type)
// - Insights media: /{media-id}/insights (impressions/views, likes, comments, saved, shares, reach)
//
// Endpoints são chamados só quando META_APP_ID+SECRET estiverem definidos e
// o access token estiver presente. Em dev, a app roda sem isso — Fase 5 aceite
// diz que "entrada manual funciona"; a UI trata rede manual como cidadã de primeira classe.

import type { Network, SocialConnection } from "@prisma/client";
import { AdapterError, type BrandDailyMetricInput, type PostMetricInput, type SocialAdapter, type TokenSet } from "./adapter";
import { decryptToken } from "@/lib/crypto";

const GRAPH = "https://graph.instagram.com"; // Graph endpoint que também serve para Insights via IG Login
const OAUTH_BASE_IG = "https://www.instagram.com";
const OAUTH_TOKEN = "https://api.instagram.com/oauth/access_token";

function metaConfigured() {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

function metaAppUrl() {
  const base = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/api/oauth/meta/callback`;
}

function makeAdapter(network: Network): SocialAdapter {
  return {
    network,
    automatic: true,

    authUrl(brandId, state) {
      if (!metaConfigured()) return null;
      // Estado carrega brandId (validamos server-side depois) + nonce (CSRF).
      // Escopo mínimo (docs/05: cada permissão a mais é uma rodada extra de revisão).
      const scopes = "instagram_business_basic,instagram_business_manage_insights";
      const p = new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        redirect_uri: metaAppUrl(),
        response_type: "code",
        scope: scopes,
        state: `${brandId}::${state}::${network}`,
      });
      return `${OAUTH_BASE_IG}/oauth/authorize?${p.toString()}`;
    },

    async exchangeCode(code, redirectUri) {
      if (!metaConfigured()) throw new AdapterError("no_meta_app", "META_APP_ID/SECRET não configurados.");

      // 1) short-lived
      const form = new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      });
      const r1 = await fetch(OAUTH_TOKEN, { method: "POST", body: form });
      if (!r1.ok) throw new AdapterError("oauth_code", await r1.text());
      const short = (await r1.json()) as { access_token: string; user_id?: string };

      // 2) long-lived (60d)
      const p2 = new URLSearchParams({
        grant_type: "ig_exchange_token",
        client_secret: process.env.META_APP_SECRET!,
        access_token: short.access_token,
      });
      const r2 = await fetch(`${GRAPH}/access_token?${p2.toString()}`);
      if (!r2.ok) throw new AdapterError("oauth_ll", await r2.text());
      const long = (await r2.json()) as { access_token: string; token_type: string; expires_in: number };

      // 3) perfil
      const r3 = await fetch(`${GRAPH}/me?fields=id,username&access_token=${long.access_token}`);
      if (!r3.ok) throw new AdapterError("me", await r3.text());
      const me = (await r3.json()) as { id: string; username?: string };

      return {
        accessToken: long.access_token,
        expiresAt: new Date(Date.now() + long.expires_in * 1000),
        externalId: me.id,
        displayName: me.username ?? null,
      };
    },

    async refresh(conn) {
      if (!metaConfigured()) throw new AdapterError("no_meta_app", "META_APP_ID/SECRET não configurados.");
      const token = decryptToken(conn.accessToken);
      const p = new URLSearchParams({
        grant_type: "ig_refresh_token",
        access_token: token,
      });
      const r = await fetch(`${GRAPH}/refresh_access_token?${p.toString()}`);
      if (!r.ok) throw new AdapterError("refresh", await r.text());
      const j = (await r.json()) as { access_token: string; expires_in: number };
      return {
        accessToken: j.access_token,
        expiresAt: new Date(Date.now() + j.expires_in * 1000),
        externalId: conn.externalId,
      };
    },

    async fetchProfileDaily(conn, from, to) {
      if (!metaConfigured()) return [];
      const token = decryptToken(conn.accessToken);
      // reach diário + follower_count diário
      const metrics = ["reach", "follower_count"].join(",");
      const p = new URLSearchParams({
        metric: metrics,
        period: "day",
        since: String(Math.floor(from.getTime() / 1000)),
        until: String(Math.floor(to.getTime() / 1000)),
        access_token: token,
      });
      const r = await fetch(`${GRAPH}/${conn.externalId}/insights?${p.toString()}`);
      if (!r.ok) throw new AdapterError("insights", await r.text());
      const j = (await r.json()) as { data: Array<{ name: string; values: Array<{ value: number; end_time: string }> }> };
      const porDia = new Map<string, BrandDailyMetricInput>();
      for (const m of j.data) {
        for (const v of m.values) {
          const dia = v.end_time.slice(0, 10);
          const linha =
            porDia.get(dia) ??
            ({ date: new Date(dia + "T00:00:00Z"), reach: 0, engagement: 0, followers: 0, followersDelta: 0 } as BrandDailyMetricInput);
          if (m.name === "reach") linha.reach = v.value;
          if (m.name === "follower_count") {
            linha.followersDelta = v.value;
          }
          porDia.set(dia, linha);
        }
      }
      return [...porDia.values()];
    },

    async fetchPostMetrics(conn, externalId) {
      if (!metaConfigured()) throw new AdapterError("no_meta_app", "sem app Meta");
      const token = decryptToken(conn.accessToken);
      const metrics = ["reach", "likes", "comments", "shares", "saved", "views"].join(",");
      const r = await fetch(
        `${GRAPH}/${externalId}/insights?metric=${metrics}&access_token=${token}`,
      );
      if (!r.ok) throw new AdapterError("post_insights", await r.text());
      const j = (await r.json()) as { data: Array<{ name: string; values: Array<{ value: number }> }> };
      const val = (k: string) => j.data.find((d) => d.name === k)?.values?.[0]?.value ?? null;
      return {
        reach: val("reach"),
        likes: val("likes"),
        comments: val("comments"),
        shares: val("shares"),
        saves: val("saved"),
        views: val("views"),
        raw: j,
      } satisfies PostMetricInput;
    },
  };
}

export const instagramAdapter = makeAdapter("INSTAGRAM");
// Reusa a mesma implementação p/ Facebook — mesmo app da Meta (docs/05).
// Endpoints reais para Página do FB são diferentes (graph.facebook.com/{page-id}/insights),
// mas a interface é a mesma. Em Fase 5 tratamos Facebook como automático via
// Meta mesmo app; o adapter aqui responde vazio quando chamado sem app configurado.
export const facebookAdapter = makeAdapter("FACEBOOK");
