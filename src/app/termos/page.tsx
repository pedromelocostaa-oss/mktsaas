// Termos de uso — apoia o App Review da Meta.

export const metadata = {
  title: "Termos de uso — Pauta",
};

export default function TermosPage() {
  return (
    <main className="min-h-screen py-10 px-6" style={{ background: "var(--color-bg)" }}>
      <article className="max-w-[720px] mx-auto bg-white rounded-[var(--radius-modal)] shadow-[var(--shadow-card)] p-8">
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 27 }} className="mb-1">Pauta</div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 34 }} className="mb-6">Termos de uso</h1>
        <p className="text-[13px] text-[var(--color-muted)] mb-6">Atualizados em 31 de agosto de 2026.</p>

        <Sec titulo="Sobre o serviço">
          O Pauta é uma ferramenta de planejamento e métricas de redes sociais, oferecida por
          Pedro Melo Costa. Usar o Pauta implica aceitar estes termos.
        </Sec>

        <Sec titulo="Sua conta">
          Você é responsável por manter sua senha em sigilo e por tudo que acontecer na sua
          organização. Ao conectar um perfil de rede social, você declara ter autorização de
          quem administra aquele perfil.
        </Sec>

        <Sec titulo="Conteúdo">
          Você mantém a propriedade do conteúdo que enviar. Ao usar o Pauta, você nos dá
          licença limitada de armazenar, exibir e transmitir esse conteúdo apenas para operar o
          serviço (incluindo enviá-lo pelas APIs das redes sociais quando você pedir).
        </Sec>

        <Sec titulo="Uso aceitável">
          Não use o Pauta para violar leis, direitos de terceiros ou os termos das próprias
          redes sociais. Podemos suspender contas que quebrarem essas regras.
        </Sec>

        <Sec titulo="Cobrança">
          As três primeiras contas do plano são gratuitas. A partir da quarta, cobramos por
          conta ativa. Arquivar uma conta para a cobrança na virada do ciclo. Cancelar a
          assinatura acontece dentro do produto, sem falar com suporte.
        </Sec>

        <Sec titulo="Encerramento">
          Você pode encerrar sua conta a qualquer momento. Podemos encerrar contas que
          violem estes termos ou não paguem faturas em atraso, sempre com aviso prévio.
        </Sec>

        <Sec titulo="Sem garantias">
          O serviço é oferecido "como está". Fazemos o razoável para manter o produto no ar e
          seus dados seguros, mas não garantimos disponibilidade ininterrupta.
        </Sec>

        <Sec titulo="Contato">
          Escreva para{" "}
          <a href="mailto:pedromelocostaa@gmail.com" className="underline">
            pedromelocostaa@gmail.com
          </a>
          .
        </Sec>
      </article>
    </main>
  );
}

function Sec({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-[17px] font-semibold mb-2">{titulo}</h2>
      <div className="text-[14px] text-[var(--color-ink-2)] leading-relaxed">{children}</div>
    </section>
  );
}
