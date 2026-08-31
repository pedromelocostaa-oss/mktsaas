// Cliente de envio. Se RESEND_API_KEY não estiver definido, apenas loga o
// envio no console — assim o produto roda em dev sem depender de nada externo.
// Fase 9 configura SPF/DKIM/DMARC (docs/07) e liga preferências.

interface EnvioBase {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
}

/** Retorna { ok, id? } — não estoura em produção; loga em dev. */
export async function enviarEmail(m: EnvioBase): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = m.from ?? process.env.RESEND_FROM ?? "Pauta <ola@pauta.app>";

  if (!apiKey) {
    console.info("[email:dev]", { to: m.to, subject: m.subject, textPreview: m.text.slice(0, 240) });
    return { ok: true, id: "dev-log" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(m.to) ? m.to : [m.to],
        subject: m.subject,
        html: m.html,
        text: m.text,
        reply_to: m.replyTo,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[email:resend]", res.status, errText);
      return { ok: false, error: errText };
    }
    const json = (await res.json()) as { id?: string };
    return { ok: true, id: json.id };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
