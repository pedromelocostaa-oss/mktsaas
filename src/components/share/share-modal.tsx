"use client";

// Modal Compartilhar (handoff §10). Fica dentro do shell — o botão do header
// abre. Também aberto pelo drawer do post ao clicar "Compartilhar este post"
// (com POSTS já pré-selecionado).

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogTitle } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { Btn } from "@/components/ui/btn";
import { useToast } from "@/components/ui/toast";
import { criarShareLink } from "@/server/services/share";
import { ShareLinksList } from "./share-links-list";
import type { Network } from "@prisma/client";
import { netMeta } from "@/lib/network";

interface PostOpt {
  id: string;
  title: string;
  scheduledAt: string;
  networks: Network[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandName: string;
  posts: PostOpt[];
  postsPreSelecionados?: string[];
  tipoInicial?: "DASHBOARD" | "POSTS";
}

export function ShareModal({
  open,
  onOpenChange,
  brandId,
  brandName,
  posts,
  postsPreSelecionados,
  tipoInicial,
}: Props) {
  const toast = useToast();
  // docs/08 #17: default é "menos exposto" → DASHBOARD (só métricas).
  const [tipo, setTipo] = useState<"DASHBOARD" | "POSTS">(tipoInicial ?? "DASHBOARD");
  const [expira, setExpira] = useState<"7" | "30" | "nunca">("30");
  const [confirmaNunca, setConfirmaNunca] = useState(false);
  const [selecao, setSelecao] = useState<string[]>(postsPreSelecionados ?? []);
  const [baseline, setBaseline] = useState<"PREVIOUS" | "AVG12W" | "LAST_YEAR">("PREVIOUS");
  const [link, setLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelecao((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function gerar() {
    startTransition(async () => {
      const r = await criarShareLink({
        brandId,
        kind: tipo,
        postIds: tipo === "POSTS" ? selecao : [],
        baseline,
        rangeDays: 30,
        expira,
        confirmaNunca: expira === "nunca" ? confirmaNunca : false,
      });
      if (!r.ok) return toast.push({ text: traduzErro(r.error) });
      setLink(r.url);
      toast.push({ text: "Link gerado." });
    });
  }

  function copiar() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.push({ text: "Link copiado." });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent widthPx={600}>
        <DialogHeader>
          <DialogTitle>Compartilhar de {brandName}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {/* 1. Escolha de tipo */}
          <div className="grid grid-cols-2 gap-2">
            <CardEscolha
              on={tipo === "DASHBOARD"}
              onClick={() => setTipo("DASHBOARD")}
              titulo="Painel do período"
              hint="Os números da conta inteira nos últimos 30 dias."
            />
            <CardEscolha
              on={tipo === "POSTS"}
              onClick={() => setTipo("POSTS")}
              titulo="Publicações escolhidas"
              hint="Só os posts que você marcar. Nada além deles."
            />
          </div>

          {/* 2. Se POSTS, lista de escolha */}
          {tipo === "POSTS" && (
            <div className="mt-4">
              <label className="block text-[13px] font-medium mb-1.5">Escolha as publicações</label>
              <div
                className="border border-[var(--color-border)] rounded-[var(--radius-btn)] max-h-[240px] overflow-y-auto"
                style={{ background: "var(--color-surface-sunken)" }}
              >
                {posts.length === 0 ? (
                  <div className="p-4 text-[13px] text-[var(--color-muted)]">
                    Nenhuma publicação por aqui.
                  </div>
                ) : (
                  <ul>
                    {posts.map((p, i) => {
                      const on = selecao.includes(p.id);
                      return (
                        <li
                          key={p.id}
                          className="px-3 py-2.5 flex items-center gap-3"
                          style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(p.id)}
                            style={{ accentColor: "var(--color-accent)" }}
                          />
                          <span className="flex gap-1">
                            {p.networks.map((n) => (
                              <span
                                key={n}
                                className="inline-block rounded-full"
                                style={{ width: 7, height: 7, background: netMeta[n].color }}
                              />
                            ))}
                          </span>
                          <span className="flex-1 min-w-0 truncate text-[13px]">{p.title}</span>
                          <span className="text-[11px] tabular text-[var(--color-muted)]">
                            {new Date(p.scheduledAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="text-[11px] mt-2 text-[var(--color-muted)]">
                {selecao.length === 0
                  ? "Marque pelo menos uma publicação."
                  : `${selecao.length} publicação${selecao.length === 1 ? "" : "es"} escolhida${selecao.length === 1 ? "" : "s"}.`}
              </div>
            </div>
          )}

          {/* 3. Base de comparação (só DASHBOARD) */}
          {tipo === "DASHBOARD" && (
            <div className="mt-4">
              <label className="block text-[13px] font-medium mb-1.5">Base de comparação</label>
              <select
                value={baseline}
                onChange={(e) => setBaseline(e.target.value as typeof baseline)}
                className="text-[13px] px-3 py-2 bg-white border border-[var(--color-border)] rounded-[var(--radius-input-inline)] outline-none"
              >
                <option value="PREVIOUS">período anterior</option>
                <option value="AVG12W">média das últimas 12 semanas</option>
                <option value="LAST_YEAR">mesmo período do ano passado</option>
              </select>
              <div className="text-[11px] mt-1.5 text-[var(--color-muted)]">
                A base escolhida aparece impressa no relatório.
              </div>
            </div>
          )}

          {/* 4. Expiração */}
          <div className="mt-4">
            <label className="block text-[13px] font-medium mb-1.5">Expira em</label>
            <Segmented
              value={expira}
              onChange={(v) => {
                setExpira(v);
                if (v !== "nunca") setConfirmaNunca(false);
              }}
              options={[
                { value: "7", label: "7 dias" },
                { value: "30", label: "30 dias" },
                { value: "nunca", label: "Nunca" },
              ]}
              ariaLabel="Expiração"
            />
            {expira === "nunca" && (
              <label
                className="mt-2 flex items-start gap-2 rounded-[var(--radius-btn)] p-3 cursor-pointer"
                style={{ background: "var(--color-warn-bg)", color: "var(--color-warn)" }}
              >
                <input
                  type="checkbox"
                  checked={confirmaNunca}
                  onChange={(e) => setConfirmaNunca(e.target.checked)}
                  style={{ accentColor: "var(--color-warn)", marginTop: 2 }}
                />
                <span className="text-[12px] leading-relaxed">
                  Entendo que quem tiver este link vê esses dados para sempre, mesmo depois de sair
                  do projeto.
                </span>
              </label>
            )}
          </div>

          {/* 5. Divulgação */}
          <div
            className="mt-4 rounded-[var(--radius-btn)] p-4"
            style={{ background: "var(--color-surface-sunken)" }}
          >
            <div className="text-[13px] font-semibold mb-1.5">Quem abrir vai ver</div>
            <ul className="text-[13px] text-[var(--color-ink-2)] space-y-1 leading-relaxed">
              {tipo === "DASHBOARD" ? (
                <>
                  <li>· Alcance, engajamento e taxas do período.</li>
                  <li>· Base de comparação escolhida ({baselineLabel(baseline)}).</li>
                  <li>· Lista das publicações do período (podem clicar em cada uma).</li>
                </>
              ) : (
                <>
                  <li>· Só as {selecao.length || "N"} publicações marcadas.</li>
                  <li>· Título, data, redes, mídia e legenda de cada uma.</li>
                </>
              )}
            </ul>

            <div className="text-[13px] font-semibold mt-3 mb-1.5">Nunca vai ver</div>
            <ul className="text-[13px] text-[var(--color-muted)] space-y-1 leading-relaxed">
              <li>· Anotações internas, colaboradores e histórico de edição.</li>
              <li>· Quem aprovou e o que pediu.</li>
              <li>· Rascunhos e ideias.</li>
              <li>· Outras contas da sua organização.</li>
            </ul>
          </div>

          {/* 6. Link */}
          {link && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2.5 bg-[var(--color-surface-sunken)] rounded-full">
              <span className="text-[12px] tabular text-[var(--color-muted)] truncate flex-1">{link}</span>
              <button
                type="button"
                onClick={copiar}
                className="text-[12px] font-semibold text-[var(--color-ink)] underline"
              >
                Copiar
              </button>
            </div>
          )}

          {/* 7. Links existentes desta conta (histórico + telemetria) */}
          <ShareLinksList brandId={brandId} />
        </DialogBody>

        <div className="flex items-center gap-2 px-6 py-4 border-t border-[var(--color-border-soft)] bg-[var(--color-surface-sunken)]">
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="text-[13px] text-[var(--color-muted)] underline"
            >
              Ver como quem recebe
            </a>
          )}
          <div className="flex-1" />
          <Btn onClick={() => onOpenChange(false)}>Fechar</Btn>
          <Btn
            kind="primary"
            onClick={gerar}
            disabled={
              pending ||
              (tipo === "POSTS" && selecao.length === 0) ||
              (expira === "nunca" && !confirmaNunca)
            }
          >
            {pending ? "Gerando…" : link ? "Gerar novo" : "Gerar link"}
          </Btn>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CardEscolha({
  on,
  onClick,
  titulo,
  hint,
}: {
  on: boolean;
  onClick: () => void;
  titulo: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left px-4 py-4 rounded-[var(--radius-select-card)] border transition-colors"
      style={{
        borderColor: on ? "var(--color-ink)" : "var(--color-border)",
        background: on ? "var(--color-surface-sunken)" : "white",
      }}
    >
      <div className="text-[13px] font-semibold">{titulo}</div>
      <div className="text-[11px] mt-1 text-[var(--color-muted)] leading-relaxed">{hint}</div>
    </button>
  );
}

function baselineLabel(b: "PREVIOUS" | "AVG12W" | "LAST_YEAR") {
  return {
    PREVIOUS: "período anterior",
    AVG12W: "média das últimas 12 semanas",
    LAST_YEAR: "mesmo período do ano passado",
  }[b];
}

function traduzErro(err: string) {
  const map: Record<string, string> = {
    confirmacao_nunca_obrigatoria: 'Marque a caixa "Entendo que…" para gerar link sem expiração.',
    escolha_pelo_menos_uma_publicacao: "Marque pelo menos uma publicação.",
    post_fora_do_brand: "Alguma publicação não é dessa conta.",
    sem_sessao: "Faça login novamente.",
    not_found: "Conta não encontrada.",
  };
  return map[err] ?? err;
}
