// E-mails de aprovação. Regras do docs/07:
// - Tabela, inline, 600px, nada de flex/grid.
// - Versão texto sempre.
// - Assunto: "{Autor} pediu sua aprovação".
// - Uma linha antes do botão: "você não precisa criar conta".
// - Rodapé: "o link mostra só aquela publicação e expira em 14 dias".

import { enviarEmail } from "./send";

interface PedidoInput {
  to: string;
  approverName: string;
  autorNome: string;
  postTitle: string;
  scheduledAt: Date;
  link: string;
  expiresAt: Date;
}

export async function enviarPedidoAprovacao(m: PedidoInput) {
  const dataStr = m.scheduledAt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const validoAte = m.expiresAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });

  const subject = `${m.autorNome} pediu sua aprovação`;
  const text = [
    `Olá, ${m.approverName}.`,
    ``,
    `${m.autorNome} pediu para você aprovar uma publicação no Pauta:`,
    ``,
    `Título: ${m.postTitle}`,
    `Publica em: ${dataStr}`,
    ``,
    `Você não precisa criar conta. Abra o link, veja o post, aprova ou pede ajuste:`,
    m.link,
    ``,
    `O link mostra só essa publicação e expira em ${validoAte}.`,
    `— Pauta`,
  ].join("\n");

  const html = renderPedidoHtml({ ...m, dataStr, validoAte });

  return enviarEmail({ to: m.to, subject, html, text });
}

interface LembreteInput {
  to: string;
  approverName: string;
  postTitle: string;
  hint: string;
  appUrl: string;
}

export async function enviarLembreteAprovador(m: LembreteInput) {
  const subject = `Ainda dá tempo de responder`;
  const text = [
    `Olá, ${m.approverName}.`,
    ``,
    `Só um lembrete: a publicação "${m.postTitle}" ainda espera sua resposta.`,
    `${m.hint}`,
    ``,
    `— Pauta`,
  ].join("\n");

  const html = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#F1EFE9;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;background:#F1EFE9;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;">
        <tr><td style="padding:32px;">
          <p style="margin:0 0 12px;font-size:14px;color:#63625D;font-family:Arial,sans-serif;">Pauta</p>
          <h1 style="margin:0 0 12px;font-size:22px;color:#1A1D24;font-family:Georgia,serif;">Ainda dá tempo de responder</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#494842;">Olá, ${escape(m.approverName)}. Só um lembrete: a publicação <strong>"${escape(m.postTitle)}"</strong> ainda espera sua resposta.</p>
          <p style="margin:0;font-size:14px;color:#63625D;">${escape(m.hint)}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#8E8C86;font-family:Arial,sans-serif;">Pauta · ${escape(m.appUrl)}</p>
    </td></tr>
  </table>
</body></html>`;

  return enviarEmail({ to: m.to, subject, html, text });
}

function renderPedidoHtml(m: PedidoInput & { dataStr: string; validoAte: string }) {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#F1EFE9;font-family:Arial,sans-serif;color:#1A1D24;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;background:#F1EFE9;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;">
        <tr>
          <td style="padding:32px 32px 8px;">
            <p style="margin:0;font-size:13px;color:#63625D;font-family:Arial,sans-serif;">Pauta</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 8px;">
            <h1 style="margin:0;font-size:26px;line-height:1.2;color:#1A1D24;font-family:Georgia,serif;font-weight:400;">
              ${escape(m.autorNome)} pediu sua aprovação
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 24px;">
            <p style="margin:0;font-size:15px;line-height:1.55;color:#494842;">
              Olá, ${escape(m.approverName)}. Dá uma olhada na publicação abaixo e responda direto pelo botão — <strong>você não precisa criar conta.</strong>
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBFAF8;border-radius:12px;">
              <tr>
                <td style="padding:20px 22px;">
                  <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#8E8C86;">Publicação</p>
                  <p style="margin:0 0 12px;font-size:17px;line-height:1.35;color:#1A1D24;font-weight:600;">${escape(m.postTitle)}</p>
                  <p style="margin:0;font-size:13px;color:#63625D;">Publica em ${escape(m.dataStr)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:12px 32px 8px;">
            <a href="${escape(m.link)}"
               style="display:inline-block;background:#1A1D24;color:#FFFFFF;text-decoration:none;
                      padding:14px 24px;border-radius:12px;font-size:15px;font-weight:600;font-family:Arial,sans-serif;">
              Ver e responder
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding:12px 32px 32px;">
            <p style="margin:0;font-size:12px;color:#8E8C86;line-height:1.5;">
              O link mostra só essa publicação e expira em ${escape(m.validoAte)}.
              Se preferir copiar: <span style="color:#63625D;word-break:break-all;">${escape(m.link)}</span>
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#8E8C86;font-family:Arial,sans-serif;">Pauta</p>
    </td></tr>
  </table>
</body></html>`;
}

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
