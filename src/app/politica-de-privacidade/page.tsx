// Política de privacidade — exigida pelo App Review da Meta (docs/05).
// Descreve o que coletamos, o porquê, e o mecanismo de apagamento de dados.

export const metadata = {
  title: "Política de privacidade — Pauta",
  description: "Como o Pauta trata dados pessoais e credenciais de redes sociais.",
};

export default function PoliticaPage() {
  return (
    <main className="min-h-screen py-10 px-6" style={{ background: "var(--color-bg)" }}>
      <article className="max-w-[720px] mx-auto bg-white rounded-[var(--radius-modal)] shadow-[var(--shadow-card)] p-8">
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 27 }} className="mb-1">Pauta</div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 34 }} className="mb-6">Política de privacidade</h1>
        <p className="text-[13px] text-[var(--color-muted)] mb-6">Atualizada em 31 de agosto de 2026.</p>

        <Sec titulo="Quem somos">
          O Pauta é um planejador editorial e painel de métricas para redes sociais. Ele é
          operado por Pedro Melo Costa. Contato:{" "}
          <a href="mailto:pedromelocostaa@gmail.com" className="underline">pedromelocostaa@gmail.com</a>.
        </Sec>

        <Sec titulo="O que coletamos">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Dados de conta:</strong> nome, e-mail e senha (armazenada em hash bcrypt) —
              para autenticação.
            </li>
            <li>
              <strong>Credenciais de redes sociais:</strong> quando você conecta um perfil (Instagram,
              Facebook etc.), guardamos apenas o token de acesso emitido pela rede — <em>nunca</em>
              sua senha. O token é criptografado em repouso com AES-256-GCM usando uma chave
              separada do banco.
            </li>
            <li>
              <strong>Métricas públicas:</strong> alcance, engajamento, curtidas e comentários dos
              posts que você gerencia — o que a API da rede social entrega.
            </li>
            <li>
              <strong>Conteúdo que você cria:</strong> títulos de post, textos, mídia enviada,
              anotações internas.
            </li>
          </ul>
        </Sec>

        <Sec titulo="Como usamos">
          Os dados são usados exclusivamente para operar o Pauta: exibir seu calendário editorial,
          mostrar métricas, permitir aprovação por link e gerar relatórios que você compartilha.
          Não vendemos dados e não os compartilhamos com terceiros para publicidade.
        </Sec>

        <Sec titulo="Onde ficam">
          Banco de dados PostgreSQL hospedado pelo Supabase. Mídia hospedada no Cloudflare R2.
          E-mails transacionais entregues via Resend. Todos os subprocessadores têm acordos de
          proteção de dados vigentes.
        </Sec>

        <Sec titulo="Retenção">
          Dados de conta são mantidos enquanto sua organização existir. Tokens de rede social
          duram enquanto a conexão estiver ativa; ao desconectar, o token é apagado do banco em
          até 24 horas. Snapshots históricos de métricas ficam retidos para reproduzir
          relatórios passados.
        </Sec>

        <Sec titulo="Apagar seus dados" id="dados-apagados">
          Você pode encerrar sua conta a qualquer momento em Configurações → Equipe. Ao encerrar,
          apagamos os dados pessoais em até 30 dias. Métricas agregadas podem permanecer em
          formato anonimizado.
          <br />
          <br />
          Se você quer que apaguemos dados vinculados a um perfil de rede social específico,
          escreva para{" "}
          <a href="mailto:pedromelocostaa@gmail.com" className="underline">
            pedromelocostaa@gmail.com
          </a>{" "}
          com o assunto <strong>"Apagar dados"</strong> e o identificador do perfil. Confirmamos
          o apagamento em até 7 dias corridos.
          <br />
          <br />
          A Meta também entrega solicitações automáticas de apagamento pelo webhook{" "}
          <code className="text-[12px] bg-[var(--color-surface-sunken)] px-1 rounded">
            POST /api/webhooks/meta
          </code>
          . Quando recebemos uma dessas, apagamos todas as conexões e snapshots vinculados
          ao usuário e devolvemos um <code>confirmation_code</code>.
        </Sec>

        <Sec titulo="Segurança">
          Sessões usam cookies httpOnly com SameSite=Lax. Verificações críticas rodam no
          servidor, não no middleware. Tokens de rede social são cifrados. Links públicos de
          relatório usam token de 32 bytes aleatórios; o banco só guarda o hash SHA-256.
        </Sec>

        <Sec titulo="Seus direitos (LGPD)">
          Você tem direito de acessar, corrigir, portar ou apagar seus dados a qualquer momento.
          Escreva para{" "}
          <a href="mailto:pedromelocostaa@gmail.com" className="underline">
            pedromelocostaa@gmail.com
          </a>
          .
        </Sec>

        <Sec titulo="Mudanças">
          Se algo material mudar, avisamos por e-mail e atualizamos a data no topo desta página.
        </Sec>
      </article>
    </main>
  );
}

function Sec({ titulo, children, id }: { titulo: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mb-6">
      <h2 className="text-[17px] font-semibold mb-2">{titulo}</h2>
      <div className="text-[14px] text-[var(--color-ink-2)] leading-relaxed">{children}</div>
    </section>
  );
}
