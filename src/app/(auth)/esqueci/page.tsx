"use client";

// Esqueci — mesma confirmação exista ou não a conta (docs/04). E já responde
// as duas perguntas seguintes (spam, Google) no lugar de esperar o ticket.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Btn } from "@/components/ui/btn";
import { Field, Input, MailIcon } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export default function EsqueciPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [espera, setEspera] = useState(0);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera(espera - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setCarregando(true);
    // Better Auth aceita sempre e envia só se existir — atende docs/04.
    await authClient.requestPasswordReset({
      email,
      redirectTo: "/redefinir",
    });
    setCarregando(false);
    setEnviado(true);
    setEspera(45);
  }

  return (
    <>
      <Link
        href="/entrar"
        className="inline-flex items-center gap-1.5 text-[13px] mb-4 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
      >
        ← Voltar para entrar
      </Link>

      <div className="bg-white shadow-[var(--shadow-card)] rounded-[var(--radius-card)] p-6">
        {!enviado ? (
          <>
            <h1 className="text-[19px] font-semibold">Redefinir senha</h1>
            <p className="text-[13px] mt-1 mb-5 text-[var(--color-muted)] leading-relaxed">
              Diga o e-mail da sua conta e mandamos um link para criar uma senha nova.
            </p>
            <form onSubmit={enviar} className="space-y-4" noValidate>
              <Field label="E-mail">
                <Input
                  icon={<MailIcon />}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@estudio.com.br"
                  autoComplete="email"
                  required
                />
              </Field>
              <Btn kind="primary" full type="submit" disabled={!email.includes("@") || carregando}>
                {carregando ? "Enviando…" : "Enviar link"}
              </Btn>
            </form>
          </>
        ) : (
          <>
            <span
              className="flex items-center justify-center rounded-full"
              style={{ width: 40, height: 40, background: "var(--color-accent-bg)" }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
            </span>
            <h1 className="text-[19px] font-semibold mt-4">Verifique seu e-mail</h1>
            <p className="text-[13px] mt-2 text-[var(--color-muted)] leading-relaxed">
              Se houver uma conta em <strong className="text-[var(--color-ink)]">{email}</strong>, o link chega em alguns minutos.
              Ele vale por 1 hora e só pode ser usado uma vez.
            </p>
            <div className="mt-5 pt-5 space-y-2.5 text-[13px] text-[var(--color-muted)] border-t border-[var(--color-border-soft)]">
              <div className="font-semibold text-[var(--color-ink)]">Não chegou?</div>
              <div>
                Procure na caixa de spam ou em promoções — o remetente é{" "}
                <strong className="text-[var(--color-ink)]">nao-responda@pauta.app</strong>.
              </div>
              <div>Se você entrou com Google, não existe senha para redefinir: use o botão “Continuar com Google”.</div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Btn disabled={espera > 0 || carregando} onClick={() => enviar({ preventDefault() {} } as React.FormEvent)}>
                {espera > 0 ? `Reenviar em ${espera}s` : "Reenviar link"}
              </Btn>
              <button
                type="button"
                onClick={() => setEnviado(false)}
                className="text-[13px] text-[var(--color-muted)] underline underline-offset-2"
              >
                Usar outro e-mail
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
