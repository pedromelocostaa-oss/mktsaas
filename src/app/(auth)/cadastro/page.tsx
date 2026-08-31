"use client";

// Cadastro. Validação de senha na frente (docs/04 — regra visível enquanto digita).
// Opt-in de novidades vem SEMPRE desmarcado (docs/08 #22).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Btn } from "@/components/ui/btn";
import { Field, ForcaSenha, GoogleBtn, Input, MailIcon, Senha } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [novidades, setNovidades] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const googleAtivo = false;
  const forte = senha.length >= 10 && /[a-zA-Z]/.test(senha) && /[0-9]/.test(senha) && !/^(senha|123456|qwerty|pauta|password|admin)/i.test(senha);
  const pode = nome.trim().length >= 2 && email.includes("@") && forte;

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    if (!pode) return;
    setErro("");
    setCarregando(true);
    const { error } = await authClient.signUp.email({
      name: nome.trim(),
      email,
      password: senha,
      // additionalField declarado em server/auth.ts
      // @ts-expect-error — additionalField
      productUpdates: novidades,
    });
    setCarregando(false);
    if (error) {
      setErro(error.message ?? "Não deu para criar a conta.");
      return;
    }
    router.push("/verificar");
  }

  return (
    <>
      <div className="bg-white shadow-[var(--shadow-card)] rounded-[var(--radius-card)] p-6">
        <h1 className="text-[19px] font-semibold">Criar conta</h1>
        <p className="text-[13px] mt-1 mb-5 text-[var(--color-muted)]">
          Leva um minuto. Você escolhe as contas e conecta as redes depois.
        </p>

        {googleAtivo && (
          <>
            <GoogleBtn
              label="Criar com Google"
              onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}
            />
            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-[var(--color-border)]" />
              <span className="text-xs text-[var(--color-muted)]">ou com e-mail</span>
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            </div>
          </>
        )}

        <form onSubmit={cadastrar} className="space-y-4" noValidate>
          <Field label="Seu nome">
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Como quer ser chamado"
              autoComplete="name"
              required
            />
          </Field>
          <Field label="E-mail de trabalho">
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
          <Field label="Senha">
            <Senha
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="crie uma senha"
              autoComplete="new-password"
            />
            {senha.length > 0 && <ForcaSenha v={senha} />}
          </Field>

          <label className="flex items-start gap-2.5 text-[13px] cursor-pointer">
            <input
              type="checkbox"
              checked={novidades}
              onChange={(e) => setNovidades(e.target.checked)}
              style={{ accentColor: "var(--color-accent)", marginTop: 3 }}
            />
            <span className="text-[var(--color-muted)]">
              Quero receber novidades do produto por e-mail. Nada de propaganda de terceiros.
            </span>
          </label>

          {erro && <div className="text-[13px] text-[var(--color-danger)]">{erro}</div>}

          <Btn kind="primary" full type="submit" disabled={!pode || carregando}>
            {carregando ? "Criando…" : "Criar conta"}
          </Btn>

          <p className="text-xs text-[var(--color-muted)] leading-relaxed">
            Ao criar a conta você concorda com os{" "}
            <a href="#" className="text-[var(--color-ink)] underline">
              termos de uso
            </a>{" "}
            e com a{" "}
            <a href="#" className="text-[var(--color-ink)] underline">
              política de privacidade
            </a>
            .
          </p>
        </form>
      </div>

      <p className="text-[13px] text-center mt-5 text-[var(--color-muted)]">
        Já tem conta?{" "}
        <Link href="/entrar" className="text-[var(--color-ink)] underline font-medium">
          Entrar
        </Link>
      </p>
    </>
  );
}
