// Callback do OAuth da Meta (Instagram + Facebook — mesmo app).
// docs/05: escopo mínimo, revisão do app pede webhooks (rota separada).

import { NextResponse } from "next/server";
import { finalizarOAuth } from "@/server/services/connections";
import { limparBackfill } from "@/server/services/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return redirectToApp(`?erro_oauth=${encodeURIComponent(errorDescription ?? error)}`);
  }
  if (!code || !state) {
    return redirectToApp("?erro_oauth=parametros_ausentes");
  }

  // state = "brandId::nonce::network"
  const parts = state.split("::");
  if (parts.length !== 3) return redirectToApp("?erro_oauth=state_forma");
  const [brandId, nonce, network] = parts;

  const redirectUri = `${appBase()}/api/oauth/meta/callback`;
  const r = await finalizarOAuth({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    network: network as any,
    code,
    state: nonce,
    redirectUri,
  });
  if (!r.ok) {
    return redirectToApp(`?erro_oauth=${encodeURIComponent(r.error)}`);
  }

  // Backfill de 30 dias em background (Fase 5 aceite).
  limparBackfill({ brandId: r.brandId, network: network as import("@prisma/client").Network }).catch(() => {});

  return redirectToApp(`/${r.brandId}/configuracoes/redes?conectada=${network.toLowerCase()}`);
}

function appBase() {
  return process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function redirectToApp(pathOrQuery: string) {
  const base = appBase();
  const url = pathOrQuery.startsWith("/") ? `${base}${pathOrQuery}` : `${base}/${pathOrQuery}`;
  return NextResponse.redirect(url);
}
