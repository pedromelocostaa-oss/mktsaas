"use client";

// Verificar e-mail. Verificar NÃO tranca o produto (docs/04 / docs/08 #12).
// Só review.request e share.create ficam bloqueados no server.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Btn } from "@/components/ui/btn";
import { authClient, useSession } from "@/lib/auth-client";

export default function VerificarPage() {
  const { data } = useSession();
  const [espera, setEspera] = useState(0);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera(espera - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const email = data?.user?.email ?? "seu e-mail";

  async function reenviar() {
    if (!data?.user?.email) return;
    setCarregando(true);
    await authClient.sendVerificationEmail({ email: data.user.email, callbackURL: "/" });
    setCarregando(false);
    setEspera(45);
  }

  return (
    <div className="bg-white shadow-[var(--shadow-card)] rounded-[var(--radius-card)] p-6">
      <span
        className="flex items-center justify-center rounded-full"
        style={{ width: 40, height: 40, background: "var(--color-accent-bg)" }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M2 7l10 6 10-6" />
        </svg>
      </span>
      <h1 className="text-[19px] font-semibold mt-4">Confirme seu e-mail</h1>
      <p className="text-[13px] mt-2 text-[var(--color-muted)] leading-relaxed">
        Mandamos um link para <strong className="text-[var(--color-ink)]">{email}</strong>. Clicar nele confirma que o endereço é seu.
      </p>

      <div className="mt-5 px-4 py-3.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border-soft)] rounded-[var(--radius-btn)]">
        <div className="text-[13px] font-semibold">Você já pode usar o Pauta</div>
        <div className="text-[13px] mt-1 text-[var(--color-muted)] leading-relaxed">
          Criar contas, montar o calendário e escrever posts funciona agora. Só ficam esperando a confirmação as coisas
          que saem com o seu nome: <strong className="text-[var(--color-ink)]">enviar posts para aprovação</strong> e{" "}
          <strong className="text-[var(--color-ink)]">compartilhar relatórios</strong>.
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Link href="/">
          <Btn kind="primary">Começar mesmo assim</Btn>
        </Link>
        <Btn disabled={espera > 0 || carregando} onClick={reenviar}>
          {espera > 0 ? `Reenviar em ${espera}s` : "Reenviar e-mail"}
        </Btn>
      </div>
    </div>
  );
}
