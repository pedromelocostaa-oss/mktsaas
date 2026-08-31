"use client";

// NovaContaWizard — 2 passos, rodapé com custo antes do botão (docs/08 #14).
// Nome duplicado avisa mas não bloqueia (Fase 1 checklist).

import { useEffect, useState, useTransition } from "react";
import { Btn } from "@/components/ui/btn";
import { NETWORKS, netMeta } from "@/lib/network";
import { checarNomeDuplicado } from "@/server/services/brands";
import { submeterWizard } from "./actions";
import type { Network } from "@prisma/client";

const TIPOS = [
  {
    id: "COMPANY" as const,
    label: "Marca ou empresa",
    hint: "Em geral alguém de fora aprova o conteúdo antes de publicar.",
    aprova: true,
  },
  {
    id: "PERSON" as const,
    label: "Pessoa ou influenciador",
    hint: "Em geral publica direto, sem passar por ninguém.",
    aprova: false,
  },
];

interface Props {
  contasAtuais: number;
  includedBrands: number;
}

export function NovaContaWizard({ contasAtuais, includedBrands }: Props) {
  const [passo, setPasso] = useState<1 | 2>(1);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"COMPANY" | "PERSON">("COMPANY");
  const [handle, setHandle] = useState("");
  const [nets, setNets] = useState<Network[]>([]);
  const [temAprovador, setTemAprovador] = useState<boolean | null>(null);
  const [aprovador, setAprovador] = useState("");
  const [duplicado, setDuplicado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  const tipoSel = TIPOS.find((x) => x.id === tipo)!;

  // Padrão de aprovação vem do tipo escolhido, mas não sobrepõe escolha explícita.
  useEffect(() => {
    setTemAprovador((cur) => (cur === null ? tipoSel.aprova : cur));
  }, [tipo, tipoSel.aprova]);

  // Verifica duplicidade com debounce.
  useEffect(() => {
    if (nome.trim().length < 2) {
      setDuplicado(false);
      return;
    }
    const t = setTimeout(async () => {
      const r = await checarNomeDuplicado(nome).catch(() => ({ duplicado: false }));
      setDuplicado(r.duplicado);
    }, 300);
    return () => clearTimeout(t);
  }, [nome]);

  // Custo: 3 primeiras contas grátis (includedBrands), R$29 a partir dali.
  const novaN = contasAtuais + 1;
  const cobrada = novaN > includedBrands;

  const podeContinuar = nome.trim().length >= 2;

  function submeter() {
    setErro(null);
    startTransition(async () => {
      const handleLimpo = handle.trim().replace(/^@/, "");
      const r = await submeterWizard({
        name: nome,
        kind: tipo,
        handle: handleLimpo || undefined,
        defaultApprover: temAprovador && aprovador.trim() ? aprovador.trim() : undefined,
        networks: nets,
      });
      // submeterWizard só retorna quando dá erro (redirect no sucesso)
      if (r && !r.ok) setErro(r.error);
    });
  }

  return (
    <div>
      {/* cabeçalho */}
      <div className="flex items-center px-6 py-4 border-b border-[var(--color-border-soft)]">
        <div className="flex-1">
          <h3 className="text-[16px] font-semibold">Nova conta</h3>
          <div className="text-xs mt-0.5 text-[var(--color-muted)]">
            Passo {passo} de 2 · {passo === 1 ? "Quem é" : "Como vai funcionar"}
          </div>
        </div>
      </div>

      {passo === 1 ? (
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-[13px] font-medium mb-1.5">Nome</label>
            <input
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Café Sabiá, Marina Costa, Orla Cosméticos…"
              className="w-full px-3 py-2.5 text-[13px] bg-white border rounded-[var(--radius-btn)] outline-none focus:outline focus:outline-2 focus:outline-[var(--color-accent-light)] focus:outline-offset-2"
              style={{ borderColor: duplicado ? "var(--color-warn)" : "var(--color-border)" }}
            />
            {duplicado && (
              <div className="flex items-start gap-2 mt-2 text-xs text-[var(--color-warn)]">
                <span aria-hidden>⚠</span>
                Você já tem uma conta com esse nome. Se for outra mesmo, diferencie o nome — assim ninguém publica na conta errada depois.
              </div>
            )}
          </div>

          <div>
            <label className="block text-[13px] font-medium mb-2">Que tipo de conta é essa?</label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS.map((x) => {
                const on = tipo === x.id;
                return (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => {
                      setTipo(x.id);
                      setTemAprovador(x.aprova);
                    }}
                    className="text-left px-3.5 py-3 rounded-[var(--radius-select-card)] border transition-colors"
                    style={{
                      borderColor: on ? "var(--color-ink)" : "var(--color-border)",
                      background: on ? "var(--color-surface-sunken)" : "white",
                    }}
                  >
                    <div className="text-[13px] font-semibold">{x.label}</div>
                    <div className="text-xs mt-1 text-[var(--color-muted)] leading-relaxed">{x.hint}</div>
                  </button>
                );
              })}
            </div>
            <div className="text-xs mt-2 text-[var(--color-muted)]">
              Isso só define um padrão de aprovação. Você muda em qualquer post.
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium mb-1.5">
              @ nas redes <span className="text-[var(--color-muted)] font-normal">— opcional</span>
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-[var(--color-border)] rounded-[var(--radius-btn)]">
              <span aria-hidden className="text-[var(--color-muted-2)]">@</span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="cafesabia"
                className="flex-1 text-[13px] bg-transparent outline-none"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-[13px] font-medium mb-2">Conectar redes</label>
            <div className="border border-[var(--color-border)] rounded-[var(--radius-btn)] overflow-hidden">
              {NETWORKS.map((n, i) => {
                const on = nets.includes(n);
                const meta = netMeta[n];
                return (
                  <div
                    key={n}
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}
                  >
                    <span
                      aria-hidden
                      className="inline-block rounded-full"
                      style={{ width: 9, height: 9, background: meta.color }}
                    />
                    <span className="text-[13px] flex-1">{meta.label}</span>
                    <span className="text-xs text-[var(--color-muted)]">
                      {meta.source === "API" ? "coleta automática" : "números à mão"}
                    </span>
                    {on ? (
                      <button
                        type="button"
                        onClick={() => setNets(nets.filter((x) => x !== n))}
                        className="text-[13px] font-semibold text-[var(--color-accent)]"
                      >
                        ✓ Conectada
                      </button>
                    ) : (
                      <Btn onClick={() => setNets([...nets, n])}>Conectar</Btn>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-xs mt-2 text-[var(--color-muted)] leading-relaxed max-w-[62ch]">
              Não precisa ser agora. A conta funciona sem nenhuma conexão — o calendário e as aprovações rodam normal, e
              os números entram à mão até você ter as credenciais do cliente.
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium mb-2">Aprovação de conteúdo</label>
            {[
              { val: false, t: "Eu publico direto", d: "Nenhum post pede aprovação, a menos que você marque um por um." },
              { val: true, t: "Alguém precisa aprovar", d: "Os posts novos já nascem pedindo aprovação dessa pessoa." },
            ].map((opt) => (
              <label
                key={String(opt.val)}
                className="flex gap-3 px-3.5 py-2.5 mb-1.5 cursor-pointer rounded-[var(--radius-select-card)] border"
                style={{
                  borderColor: temAprovador === opt.val ? "var(--color-ink)" : "var(--color-border)",
                  background: temAprovador === opt.val ? "var(--color-surface-sunken)" : "white",
                }}
              >
                <input
                  type="radio"
                  checked={temAprovador === opt.val}
                  onChange={() => setTemAprovador(opt.val)}
                  style={{ accentColor: "var(--color-accent)", marginTop: 3 }}
                />
                <span className="flex-1">
                  <span className="block text-[13px] font-medium">{opt.t}</span>
                  <span className="block text-xs mt-0.5 text-[var(--color-muted)]">{opt.d}</span>
                  {opt.val && temAprovador === true && (
                    <input
                      value={aprovador}
                      onChange={(e) => setAprovador(e.target.value)}
                      placeholder="nome ou e-mail de quem aprova"
                      className="w-full mt-2.5 px-3 py-2 text-[13px] bg-white border border-[var(--color-border)] rounded-[var(--radius-input-inline)] outline-none"
                    />
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* rodapé — custo antes do botão */}
      <div className="flex items-center gap-3 px-6 py-4 border-t border-[var(--color-border-soft)] bg-[var(--color-surface-sunken)]">
        <span className="text-xs flex-1 text-[var(--color-muted)] leading-relaxed max-w-[42ch]">
          {cobrada ? (
            <>
              Esta é sua {novaN}ª conta. As {includedBrands} primeiras estão no plano; a partir daqui são{" "}
              <strong className="text-[var(--color-ink)]">R$ 29/mês por conta</strong>, na próxima fatura.
            </>
          ) : (
            <>
              Esta é sua {novaN}ª conta, dentro das {includedBrands} do seu plano.
            </>
          )}
        </span>
        {passo === 2 && <Btn onClick={() => setPasso(1)}>Voltar</Btn>}
        {passo === 1 ? (
          <Btn kind="primary" disabled={!podeContinuar} onClick={() => setPasso(2)}>
            Continuar →
          </Btn>
        ) : (
          <Btn kind="primary" onClick={submeter} disabled={enviando}>
            {enviando ? "Criando…" : "Criar conta"}
          </Btn>
        )}
      </div>
      {erro && (
        <div className="px-6 py-3 text-[13px] text-[var(--color-danger)] border-t border-[var(--color-border-soft)]">
          {erro}
        </div>
      )}
    </div>
  );
}
