"use client";

// Redefinir. Recebe ?token=... do e-mail. Depois de trocar, loga direto
// (docs/04 — "Redefinir senha loga direto") e invalida outras sessões.

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Btn } from "@/components/ui/btn";
import { Field, ForcaSenha, Senha } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

function RedefinirInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [senha, setSenha] = useState("");
  const [conf, setConf] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const forte = senha.length >= 10 && /[a-zA-Z]/.test(senha) && /[0-9]/.test(senha);
  const igual = conf.length > 0 && conf === senha;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setErro("Este link não é mais válido. Peça outro.");
      return;
    }
    if (!forte || !igual) return;
    setCarregando(true);
    const { error } = await authClient.resetPassword({ newPassword: senha, token });
    setCarregando(false);
    if (error) {
      setErro("Este link não é mais válido. Peça outro.");
      return;
    }
    router.push("/");
  }

  return (
    <div className="bg-white shadow-[var(--shadow-card)] rounded-[var(--radius-card)] p-6">
      <h1 className="text-[19px] font-semibold">Criar senha nova</h1>
      <p className="text-[13px] mt-1 mb-4 text-[var(--color-muted)]">
        Depois de salvar, você entra direto — e as outras sessões desta conta são fechadas.
      </p>

      {!token && (
        <div className="text-[13px] text-[var(--color-danger)] mb-4">
          Este link não é mais válido. Peça outro em <a href="/esqueci" className="underline">Esqueci a senha</a>.
        </div>
      )}

      <form onSubmit={salvar} className="space-y-4" noValidate>
        <Field label="Nova senha">
          <Senha value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="crie uma senha" autoComplete="new-password" />
          {senha.length > 0 && <ForcaSenha v={senha} />}
        </Field>
        <Field label="Repita a senha" erro={conf.length > 0 && !igual ? "As duas senhas estão diferentes." : undefined}>
          <Senha
            value={conf}
            onChange={(e) => setConf(e.target.value)}
            placeholder="a mesma senha"
            erro={conf.length > 0 && !igual}
            autoComplete="new-password"
          />
        </Field>

        {erro && <div className="text-[13px] text-[var(--color-danger)]">{erro}</div>}

        <Btn kind="primary" full type="submit" disabled={!forte || !igual || !token || carregando}>
          {carregando ? "Salvando…" : "Salvar e entrar"}
        </Btn>
      </form>
    </div>
  );
}

export default function RedefinirPage() {
  return (
    <Suspense fallback={null}>
      <RedefinirInner />
    </Suspense>
  );
}
