// Webhooks obrigatórios da Meta na revisão do app (docs/05):
// - Desautorização
// - Exclusão de dados
//
// GET  → verificação de subscrição (hub.mode/hub.verify_token/hub.challenge).
// POST → recebe eventos; valida assinatura X-Hub-Signature-256 = sha256(app_secret+body).

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  const secret = process.env.META_APP_SECRET;
  if (!secret) return NextResponse.json({ error: "sem_secret" }, { status: 500 });

  if (!checkSignature(raw, sig, secret)) {
    return NextResponse.json({ error: "assinatura_invalida" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // A Meta manda vários formatos dependendo da subscrição. Aqui tratamos:
  // 1) Desautorização — remove a conexão do usuário/perfil.
  // 2) Data deletion request — apaga os dados armazenados para aquele externalId.
  const { object, entry } = body as {
    object?: string;
    entry?: Array<{ id?: string; changes?: Array<{ field?: string; value?: { user_id?: string; deauthorized?: boolean } }> }>;
    user_id?: string;
    signed_request?: string;
  };

  // Deauthorization / data deletion via campo `signed_request` (formato clássico)
  const signed = (body as { signed_request?: string }).signed_request;
  const userIdFromSigned = signed ? parseSignedRequestUserId(signed, secret) : null;

  const alvos = new Set<string>();
  if (userIdFromSigned) alvos.add(userIdFromSigned);
  if (entry) {
    for (const e of entry) {
      if (e.id) alvos.add(e.id);
      if (e.changes) for (const c of e.changes) if (c.value?.user_id) alvos.add(c.value.user_id);
    }
  }

  let apagadas = 0;
  for (const externalId of alvos) {
    const del = await db.socialConnection.deleteMany({
      where: { OR: [{ externalId }, { externalId: `manual:${externalId}` }] },
    });
    apagadas += del.count;
    await db.auditLog.create({
      data: {
        organizationId: "",
        actorId: null,
        action: object === "instagram" || object === "user" ? "meta.deauthorized" : "meta.event",
        targetType: "external_id",
        targetId: externalId,
        metadata: { object },
      },
    }).catch(() => {});
  }

  // A Meta espera JSON com `url` e `confirmation_code` para data deletion.
  // Devolvemos um confirmationCode determinístico (hash do body) — os dados já
  // foram apagados no upsert acima.
  const conf = createHmac("sha256", secret).update(raw).digest("hex").slice(0, 16);
  return NextResponse.json({
    url: `${appBase()}/politica-de-privacidade#dados-apagados`,
    confirmation_code: conf,
    apagadas,
  });
}

function appBase() {
  return process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function checkSignature(raw: string, header: string, secret: string) {
  const sha = header.startsWith("sha256=") ? header.slice(7) : header;
  const hex = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(sha, "hex");
  const b = Buffer.from(hex, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function parseSignedRequestUserId(signed: string, secret: string): string | null {
  const [sigB64, payloadB64] = signed.split(".");
  if (!sigB64 || !payloadB64) return null;
  const sig = Buffer.from(b64urlToStd(sigB64), "base64");
  const expected = createHmac("sha256", secret).update(payloadB64).digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  try {
    const json = JSON.parse(Buffer.from(b64urlToStd(payloadB64), "base64").toString("utf8")) as { user_id?: string };
    return json.user_id ?? null;
  } catch {
    return null;
  }
}

function b64urlToStd(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return s.replace(/-/g, "+").replace(/_/g, "/") + pad;
}
