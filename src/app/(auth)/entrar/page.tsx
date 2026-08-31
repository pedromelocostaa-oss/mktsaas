"use client";

// Entrar — e-mail+senha, Google (se configurado), Esqueci a senha, Manter conectado.
//
// docs/04:
// - erro genérico "E-mail ou senha incorretos." (nunca revela existência de conta)
// - hash da senha mesmo quando user não existe (o Better Auth já faz)

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Btn } from "@/components/ui/btn";
import { Field, GoogleBtn, Input, MailIcon, Senha } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export default function EntrarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const googleAtivo = false; // ligado quando .env tiver GOOGLE_CLIENT_ID (Fase 0.5)

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const { error } = await authClient.signIn.email({
      email,
      password: senha,
      rememberMe: lembrar,
      callbackURL: "/",
    });
    setCarregando(false);
    if (error) {
      // Mensagem única, independente da causa (docs/04).
      setErro("E-mail ou senha incorretos.");
      return;
    }
    router.push("/");
  }

  return (
    <>
      <div className="bg-white shadow-[var(--shadow-card)] rounded-[var(--radius-card)] p-6">
        <h1 className="text-[19px] font-semibold">Entrar</h1>
        <p className="text-[13px] mt-1 mb-5 text-[var(--color-muted)]">Continue de onde parou.</p>

        {googleAtivo && (
          <>
            <GoogleBtn
              label="Continuar com Google"
              onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}
            />
            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-[var(--color-border)]" />
              <span className="text-xs text-[var(--color-muted)]">ou com e-mail</span>
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            </div>
          </>
        )}

        <form onSubmit={entrar} className="space-y-4" noValidate>
          <Field label="E-mail">
            <Input
              icon={<MailIcon />}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErro("");
              }}
              placeholder="voce@estudio.com.br"
              erro={!!erro}
              autoComplete="email"
              required
            />
          </Field>

          <Field label="Senha" erro={erro || undefined}>
            <Senha
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                setErro("");
              }}
              erro={!!erro}
              autoComplete="current-password"
            />
          </Field>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input
                type="checkbox"
                checked={lembrar}
                onChange={(e) => setLembrar(e.target.checked)}
                style={{ accentColor: "var(--color-accent)" }}
              />
              Manter conectado
            </label>
            <Link href="/esqueci" className="text-[13px] text-[var(--color-muted)] underline underline-offset-2">
              Esqueci a senha
            </Link>
          </div>

          <Btn kind="primary" full type="submit" disabled={carregando}>
            {carregando ? "Entrando…" : "Entrar"}
          </Btn>
        </form>
      </div>

      <p className="text-[13px] text-center mt-5 text-[var(--color-muted)]">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="text-[var(--color-ink)] underline font-medium">
          Criar uma
        </Link>
      </p>
    </>
  );
}
