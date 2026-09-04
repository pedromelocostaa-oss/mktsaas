// Templates de e-mail — todos usam o mesmo esqueleto HTML tabular (docs/07).
// 600px, inline styles, Arial/Georgia fallback, sempre com versão texto.

interface Layout {
  preheader?: string;
  titulo: string;
  corpoHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
  rodape?: string;
}

export function htmlLayout(l: Layout) {
  const cta = l.ctaLabel && l.ctaHref
    ? `<tr><td align="center" style="padding:12px 32px 8px;">
         <a href="${escape(l.ctaHref)}"
            style="display:inline-block;background:#1A1D24;color:#FFFFFF;text-decoration:none;
                   padding:14px 24px;border-radius:12px;font-size:15px;font-weight:600;font-family:Arial,sans-serif;">
           ${escape(l.ctaLabel)}
         </a>
       </td></tr>`
    : "";
  const rodape = l.rodape
    ? `<tr><td style="padding:8px 32px 32px;">
         <p style="margin:0;font-size:12px;color:#8E8C86;line-height:1.5;">${l.rodape}</p>
       </td></tr>`
    : "";
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#F1EFE9;font-family:Arial,sans-serif;color:#1A1D24;">
  ${l.preheader ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escape(l.preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;background:#F1EFE9;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;">
        <tr><td style="padding:32px 32px 8px;">
          <p style="margin:0;font-size:13px;color:#63625D;">Pauta</p>
        </td></tr>
        <tr><td style="padding:0 32px 8px;">
          <h1 style="margin:0;font-size:26px;line-height:1.2;color:#1A1D24;font-family:Georgia,serif;font-weight:400;">
            ${escape(l.titulo)}
          </h1>
        </td></tr>
        <tr><td style="padding:8px 32px 16px;">${l.corpoHtml}</td></tr>
        ${cta}
        ${rodape}
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#8E8C86;">Pauta</p>
    </td></tr>
  </table>
</body></html>`;
}

export function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─────────────────────────────────────────────────────── 2.1 boas-vindas
export function tmplBoasVindas(o: { nome: string; appUrl: string }) {
  return {
    subject: "Sua conta no Pauta está pronta",
    text: [
      `Olá, ${o.nome}!`,
      ``,
      `Sua conta no Pauta está pronta. O que fazer agora:`,
      `1. Crie sua primeira conta (marca ou pessoa cujo conteúdo você gerencia).`,
      `2. Se quiser coleta automática, conecte Instagram/Facebook. Redes sem API entram à mão dentro de cada post.`,
      `3. Compartilhe o painel ou publicações escolhidas com seu cliente por link — sem cadastro para quem recebe.`,
      ``,
      `Entrar: ${o.appUrl}`,
      ``,
      `— Pauta`,
    ].join("\n"),
    html: htmlLayout({
      preheader: "Bem-vindo. Vamos organizar seu calendário.",
      titulo: `Olá, ${o.nome}. Bem-vindo ao Pauta.`,
      corpoHtml: `
        <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#494842;">
          Sua conta está pronta. O Pauta organiza seus posts num calendário, coleta as métricas quando conecta com a rede social, e te dá links para compartilhar tudo com seu cliente sem exigir que ele faça login.
        </p>
        <p style="margin:0;font-size:15px;line-height:1.55;color:#494842;">
          O primeiro passo é entrar e criar sua primeira conta (marca ou pessoa cujo conteúdo você gerencia).
        </p>`,
      ctaLabel: "Entrar no Pauta",
      ctaHref: o.appUrl,
    }),
  };
}

// ─────────────────────────────────────────────────────── 2.2 verificar
export function tmplVerificar(o: { nome: string; url: string }) {
  return {
    subject: "Confirme seu e-mail",
    text: [
      `Olá, ${o.nome}.`,
      ``,
      `Confirme seu e-mail clicando no link abaixo:`,
      o.url,
      ``,
      `O Pauta funciona sem essa confirmação, mas envio de pedido de aprovação e compartilhamento de link ficam bloqueados até você confirmar — para não enviar mensagem em nome de terceiro.`,
      ``,
      `— Pauta`,
    ].join("\n"),
    html: htmlLayout({
      preheader: "Um clique para liberar envio em seu nome.",
      titulo: "Confirme seu e-mail",
      corpoHtml: `
        <p style="margin:0;font-size:15px;line-height:1.55;color:#494842;">
          Olá, ${escape(o.nome)}. Um clique confirma seu endereço.
        </p>
        <p style="margin:12px 0 0;font-size:13px;line-height:1.55;color:#63625D;">
          O Pauta funciona sem essa confirmação, mas enviar pedido de aprovação e compartilhar link ficam bloqueados até confirmar — para não enviar mensagem em seu nome sem certeza de que é você.
        </p>`,
      ctaLabel: "Confirmar",
      ctaHref: o.url,
    }),
  };
}

// ─────────────────────────────────────────────────────── 2.3 esqueci senha
export function tmplResetSenha(o: { nome: string; url: string }) {
  return {
    subject: "Redefinir sua senha",
    text: [
      `Olá, ${o.nome}.`,
      ``,
      `Alguém pediu para redefinir a senha da sua conta no Pauta.`,
      `Se foi você, use este link:`,
      o.url,
      ``,
      `O link vale por 1 hora. Se não foi você, ignore este e-mail — sua senha atual continua valendo.`,
      ``,
      `Duas coisas úteis:`,
      `• Se você entrou com Google, não existe senha para redefinir. Volte pra tela de entrar e use "Continuar com Google".`,
      `• Verifique também sua caixa de spam se este e-mail chegou lá.`,
      ``,
      `— Pauta`,
    ].join("\n"),
    html: htmlLayout({
      preheader: "Link válido por 1 hora.",
      titulo: "Redefinir sua senha",
      corpoHtml: `
        <p style="margin:0;font-size:15px;line-height:1.55;color:#494842;">
          Olá, ${escape(o.nome)}. Alguém pediu para redefinir a senha da sua conta.
        </p>
        <p style="margin:12px 0 0;font-size:13px;color:#63625D;">O link vale por 1 hora. Se não foi você, ignore este e-mail.</p>`,
      ctaLabel: "Criar senha nova",
      ctaHref: o.url,
      rodape: `Se você entrou com Google, não existe senha para redefinir — use "Continuar com Google" na tela de entrar. Confira também sua caixa de spam.`,
    }),
  };
}

// ─────────────────────────────────────────────────────── 2.5 aprovado
export function tmplAprovado(o: { autorNome: string; aprovadorNome: string; postTitle: string; link: string }) {
  return {
    subject: `${o.aprovadorNome} aprovou "${o.postTitle}"`,
    text: [
      `Olá, ${o.autorNome}.`,
      ``,
      `${o.aprovadorNome} aprovou o post "${o.postTitle}". Você pode agendar a publicação agora.`,
      ``,
      `Abrir no Pauta: ${o.link}`,
      ``,
      `— Pauta`,
    ].join("\n"),
    html: htmlLayout({
      preheader: `Já dá para agendar a publicação.`,
      titulo: `${o.aprovadorNome} aprovou o post`,
      corpoHtml: `
        <p style="margin:0;font-size:15px;line-height:1.55;color:#494842;">
          Olá, ${escape(o.autorNome)}. <strong>${escape(o.aprovadorNome)}</strong> aprovou o post
          <em>"${escape(o.postTitle)}"</em>. Você pode agendar a publicação agora.
        </p>`,
      ctaLabel: "Agendar publicação",
      ctaHref: o.link,
    }),
  };
}

// ─────────────────────────────────────────────────────── 2.6 ajuste pedido
export function tmplAjustePedido(o: {
  autorNome: string;
  aprovadorNome: string;
  postTitle: string;
  nota: string;
  link: string;
}) {
  return {
    subject: `${o.aprovadorNome} pediu ajuste em "${o.postTitle}"`,
    text: [
      `Olá, ${o.autorNome}.`,
      ``,
      `${o.aprovadorNome} pediu ajuste em "${o.postTitle}". O que precisa mudar:`,
      ``,
      o.nota,
      ``,
      `Ver e ajustar: ${o.link}`,
      ``,
      `— Pauta`,
    ].join("\n"),
    html: htmlLayout({
      preheader: `Leia o que precisa mudar antes de ajustar.`,
      titulo: `${o.aprovadorNome} pediu ajuste`,
      corpoHtml: `
        <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#494842;">
          Olá, ${escape(o.autorNome)}. <strong>${escape(o.aprovadorNome)}</strong> pediu ajuste no post
          <em>"${escape(o.postTitle)}"</em>.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7E7E4;border-radius:12px;">
          <tr><td style="padding:16px 18px;">
            <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#8F2E24;">O que mudar</p>
            <p style="margin:0;font-size:14px;line-height:1.55;color:#494842;white-space:pre-wrap;">${escape(o.nota)}</p>
          </td></tr>
        </table>`,
      ctaLabel: "Ver e ajustar",
      ctaHref: o.link,
    }),
  };
}

// ─────────────────────────────────────────────────────── 2.9 véspera
export function tmplVespera(o: { autorNome: string; postTitle: string; horaPt: string; link: string }) {
  return {
    subject: `Amanhã: ${o.postTitle}`,
    text: [
      `Olá, ${o.autorNome}.`,
      ``,
      `Lembrete: você tem "${o.postTitle}" agendado para amanhã, ${o.horaPt}.`,
      `Se quiser conferir ou ajustar: ${o.link}`,
      ``,
      `— Pauta`,
    ].join("\n"),
    html: htmlLayout({
      preheader: `Só um lembrete — dá tempo de ajustar.`,
      titulo: `Amanhã: ${o.postTitle}`,
      corpoHtml: `
        <p style="margin:0;font-size:15px;line-height:1.55;color:#494842;">
          Olá, ${escape(o.autorNome)}. Um lembrete: você tem <strong>${escape(o.postTitle)}</strong> agendado
          para amanhã, ${escape(o.horaPt)}.
        </p>
        <p style="margin:8px 0 0;font-size:13px;color:#63625D;">Dá tempo de ajustar se precisar.</p>`,
      ctaLabel: "Abrir no Pauta",
      ctaHref: o.link,
    }),
  };
}
