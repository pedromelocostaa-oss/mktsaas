"use client";

// Drawer do editor de post. Fase 1: sem mídia; sem envio de aprovação.
// Regras principais:
// - PostTarget.caption null herda baseCaption (docs/08 #4).
// - Agendamento bloqueado escreve quem trava (docs/08 #2).
// - Arquivar oferece Desfazer (docs/08 #23).

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { Btn } from "@/components/ui/btn";
import { Chip } from "@/components/ui/chip";
import { netMeta, STAGE_LABEL, STAGE_COLOR, REVIEW_LABEL, NETWORKS } from "@/lib/network";
import { atualizarPost, agendarPost, arquivarPost, desarquivarPost, setTargetCaption } from "@/server/services/posts";
import { pedirAprovacao, cancelarAprovacao } from "@/server/services/review";
import { useToast } from "@/components/ui/toast";
import { MediaPanel } from "@/components/post/media-panel";
import type { Network } from "@prisma/client";

interface PostFull {
  id: string;
  title: string;
  scheduledAt: string;
  stage: "IDEA" | "PRODUCTION" | "SCHEDULED" | "PUBLISHED";
  baseCaption: string;
  internalNote: string;
  targets: { network: Network; caption: string | null }[];
  review: { state: "PENDING" | "APPROVED" | "CHANGES"; approverName: string; note: string | null } | null;
  campanha: string | null;
  brandName: string;
  brandConnections: Network[];
}

export function PostDrawer({ brandId, post }: { brandId: string; post: PostFull }) {
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const [salvando, startTransition] = useTransition();

  const [titulo, setTitulo] = useState(post.title);
  const [quando, setQuando] = useState(toLocalInput(post.scheduledAt));
  const [base, setBase] = useState(post.baseCaption);
  const [nota, setNota] = useState(post.internalNote);
  const [nets, setNets] = useState<Network[]>(post.targets.map((t) => t.network));

  function fechar(open: boolean) {
    if (!open) {
      const next = new URLSearchParams(sp.toString());
      next.delete("post");
      router.push(`?${next.toString()}`);
    }
  }

  function salvarBase() {
    startTransition(async () => {
      const r = await atualizarPost({
        id: post.id,
        title: titulo,
        scheduledAt: new Date(quando),
        baseCaption: base,
        internalNote: nota,
        networks: nets,
      });
      if (!r.ok) toast.push({ text: r.error ?? "Não deu para salvar." });
      else toast.push({ text: "Salvo." });
      router.refresh();
    });
  }

  function agendar() {
    startTransition(async () => {
      const r = await agendarPost(post.id);
      if (!r.ok) toast.push({ text: r.error });
      else {
        toast.push({
          text: "Publicação agendada.",
          onUndo: async () => {
            // reverter para PRODUCTION
            await atualizarPost({ id: post.id });
            router.refresh();
          },
        });
        router.refresh();
      }
    });
  }

  function arquivar() {
    startTransition(async () => {
      const r = await arquivarPost(post.id);
      if (!r.ok) return toast.push({ text: "Não deu para arquivar." });
      toast.push({
        text: "Post arquivado.",
        onUndo: async () => {
          await desarquivarPost(post.id);
          router.refresh();
        },
      });
      fechar(false);
      router.refresh();
    });
  }

  const travadoPor = post.review && post.review.state !== "APPROVED" ? post.review.approverName : null;

  return (
    <Sheet open onOpenChange={fechar}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center gap-3 mb-3">
            <Chip variant="neutral" dotColor={STAGE_COLOR[post.stage]}>
              {STAGE_LABEL[post.stage]}
            </Chip>
            {post.review && (
              <Chip
                variant={post.review.state === "CHANGES" ? "danger" : post.review.state === "APPROVED" ? "accent" : "warn"}
              >
                {REVIEW_LABEL[post.review.state]}
              </Chip>
            )}
          </div>
          <SheetTitle asChild>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onBlur={salvarBase}
              className="text-[19px] font-semibold w-full bg-transparent outline-none"
            />
          </SheetTitle>
        </SheetHeader>

        <SheetBody>
          {/* Ajuste pedido — só quando review === CHANGES */}
          {post.review?.state === "CHANGES" && post.review.note && (
            <div className="rounded-[var(--radius-card)] p-4" style={{ background: "var(--color-danger-bg)" }}>
              <div className="text-[13px] font-semibold text-[var(--color-danger)] mb-1">
                {post.review.approverName} pediu ajuste
              </div>
              <div className="text-[13px] text-[var(--color-ink-2)] leading-relaxed">{post.review.note}</div>
            </div>
          )}

          {/* Detalhes */}
          <div className="bg-white rounded-[var(--radius-card)] p-5">
            <h3 className="text-[15px] font-semibold mb-3">Detalhes</h3>
            <div className="space-y-3">
              <Linha label="Quando">
                <input
                  type="datetime-local"
                  value={quando}
                  onChange={(e) => setQuando(e.target.value)}
                  onBlur={salvarBase}
                  className="text-[13px] px-3 py-2 bg-white border border-[var(--color-border)] rounded-[var(--radius-input-inline)] outline-none"
                />
              </Linha>
              <Linha label="Redes">
                <div className="flex flex-wrap gap-1.5">
                  {NETWORKS.map((n) => {
                    const on = nets.includes(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          const next = on ? nets.filter((x) => x !== n) : [...nets, n];
                          setNets(next);
                          startTransition(async () => {
                            await atualizarPost({ id: post.id, networks: next });
                            router.refresh();
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-full border"
                        style={{
                          background: on ? "var(--color-ink)" : "white",
                          color: on ? "white" : "var(--color-ink-2)",
                          borderColor: on ? "var(--color-ink)" : "var(--color-border)",
                        }}
                      >
                        <span
                          aria-hidden
                          className="inline-block rounded-full"
                          style={{ width: 7, height: 7, background: netMeta[n].color }}
                        />
                        {netMeta[n].label}
                      </button>
                    );
                  })}
                </div>
              </Linha>
              <Linha label="Anotação" hint="não sai em link público">
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  onBlur={salvarBase}
                  rows={2}
                  placeholder="Contexto interno, referência, brief… nada aqui vai para quem receber o link."
                  className="w-full text-[13px] px-3 py-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border-soft)] rounded-[var(--radius-input-inline)] outline-none resize-none"
                />
              </Linha>
            </div>
          </div>

          {/* Mídia — Fase 2. Upload direto para R2. */}
          <MediaPanel postId={post.id} networks={nets} />

          {/* Texto base + versões por rede */}
          <div className="bg-white rounded-[var(--radius-card)] p-5">
            <h3 className="text-[15px] font-semibold mb-3">Texto</h3>
            <textarea
              value={base}
              onChange={(e) => setBase(e.target.value)}
              onBlur={salvarBase}
              rows={4}
              placeholder="Escreva uma vez. Vale para todas as redes deste post."
              className="w-full text-[13px] px-3.5 py-3 bg-[var(--color-surface-sunken)] rounded-[var(--radius-btn)] outline-none resize-none min-h-[76px]"
            />
            <TextosPorRede
              postId={post.id}
              baseCaption={base}
              targets={post.targets}
              nets={nets}
            />
          </div>

          {/* Aprovação — Fase 3. */}
          <AprovacaoBloco
            postId={post.id}
            review={post.review}
            defaultApproverEmail={null}
          />

          {/* Ações */}
          <div className="pt-2 space-y-2">
            {travadoPor ? (
              <div
                className="rounded-[var(--radius-btn)] px-4 py-3 text-[13px]"
                style={{ background: "var(--color-warn-bg)", color: "var(--color-warn)" }}
              >
                Agendamento bloqueado até {travadoPor} responder.
              </div>
            ) : post.stage !== "PUBLISHED" && post.stage !== "SCHEDULED" ? (
              <Btn kind="primary" full onClick={agendar} disabled={salvando}>
                Agendar publicação
              </Btn>
            ) : null}
            <Btn full onClick={() => toast.push({ text: "Compartilhar chega na Fase 4." })}>
              Compartilhar este post
            </Btn>
            <Btn kind="ghost" full onClick={arquivar} disabled={salvando}>
              Arquivar post
            </Btn>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function Linha({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-[104px] shrink-0 text-[13px] text-[var(--color-muted)] pt-2">
        {label}
        {hint && <div className="text-[11px]">{hint}</div>}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// Ficam visíveis os targets já existentes com caption específica; para os
// demais, mostra chip tracejado "+ Texto próprio para {rede}".
function TextosPorRede({
  postId,
  baseCaption,
  targets,
  nets,
}: {
  postId: string;
  baseCaption: string;
  targets: { network: Network; caption: string | null }[];
  nets: Network[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [rascunhos, setRascunhos] = useState<Partial<Record<Network, string>>>(() =>
    Object.fromEntries(targets.filter((t) => t.caption !== null).map((t) => [t.network, t.caption ?? ""])),
  );
  const [pending, startTransition] = useTransition();

  const comVersao = Object.keys(rascunhos) as Network[];
  const semVersao = nets.filter((n) => !comVersao.includes(n));

  function salvar(net: Network, valor: string | null) {
    startTransition(async () => {
      const r = await setTargetCaption(postId, net, valor);
      if (!r.ok) toast.push({ text: "Não deu para salvar." });
      router.refresh();
    });
  }

  function remover(net: Network) {
    // Desfazer preserva o texto anterior por 6s.
    const anterior = rascunhos[net] ?? "";
    const cp = { ...rascunhos };
    delete cp[net];
    setRascunhos(cp);
    salvar(net, null);
    toast.push({
      text: `Versão do ${netMeta[net].label} removida.`,
      onUndo: () => {
        setRascunhos((r) => ({ ...r, [net]: anterior }));
        salvar(net, anterior);
      },
    });
  }

  return (
    <div className="mt-4 space-y-3">
      {comVersao.map((net) => (
        <div key={net}>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              aria-hidden
              className="inline-block rounded-full"
              style={{ width: 7, height: 7, background: netMeta[net].color }}
            />
            <span className="text-[13px] font-medium">Versão para {netMeta[net].label}</span>
            <button
              type="button"
              onClick={() => remover(net)}
              className="ml-auto text-[11px] text-[var(--color-muted)] underline"
            >
              usar o texto base
            </button>
          </div>
          <textarea
            value={rascunhos[net] ?? ""}
            onChange={(e) => setRascunhos((r) => ({ ...r, [net]: e.target.value }))}
            onBlur={(e) => salvar(net, e.target.value)}
            rows={3}
            placeholder={baseCaption || "Escreva uma versão específica para esta rede…"}
            className="w-full text-[13px] px-3 py-2 bg-[var(--color-surface-sunken)] rounded-[var(--radius-input-inline)] outline-none resize-none"
          />
        </div>
      ))}
      {semVersao.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {semVersao.map((net) => (
            <button
              key={net}
              type="button"
              onClick={() => {
                setRascunhos((r) => ({ ...r, [net]: "" }));
                salvar(net, "");
              }}
              disabled={pending}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-full"
              style={{ border: "1px dashed #BDB9B0", color: "var(--color-muted)" }}
            >
              <span
                aria-hidden
                className="inline-block rounded-full"
                style={{ width: 7, height: 7, background: netMeta[net].color }}
              />
              + Texto próprio para {netMeta[net].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AprovacaoBloco({
  postId,
  review,
  defaultApproverEmail,
}: {
  postId: string;
  review: { state: "PENDING" | "APPROVED" | "CHANGES"; approverName: string; note: string | null } | null;
  defaultApproverEmail: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [ativo, setAtivo] = useState(!!review);
  const [approverName, setApproverName] = useState(review?.approverName ?? "");
  const [approverEmail, setApproverEmail] = useState(defaultApproverEmail ?? "");
  const [link, setLink] = useState<string | null>(null);

  function enviar() {
    startTransition(async () => {
      const r = await pedirAprovacao({ postId, approverName, approverEmail });
      if (!r.ok) return toast.push({ text: r.error });
      setLink(r.link);
      toast.push({ text: `Pedido enviado para ${approverName}.` });
      router.refresh();
    });
  }

  function cancelar() {
    startTransition(async () => {
      const r = await cancelarAprovacao(postId);
      if (!r.ok) return toast.push({ text: "Não deu para cancelar." });
      setAtivo(false);
      setLink(null);
      router.refresh();
    });
  }

  function copiar() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.push({ text: "Link de aprovação copiado." });
  }

  return (
    <div className="bg-white rounded-[var(--radius-card)] p-5">
      <label className="flex gap-3 items-start cursor-pointer">
        <input
          type="checkbox"
          checked={ativo}
          onChange={(e) => {
            const next = e.target.checked;
            setAtivo(next);
            if (!next && review) cancelar();
          }}
          disabled={pending}
          className="mt-0.5"
          style={{ accentColor: "var(--color-accent)" }}
        />
        <span className="flex-1">
          <span className="block text-[15px] font-semibold">Este post precisa de aprovação</span>
          <span className="block text-[13px] mt-1 text-[var(--color-muted)] leading-relaxed">
            {ativo
              ? "Fica bloqueado para agendamento até a pessoa responder."
              : "Sem isso, o post vai de produção direto para agendado — que é como a maioria funciona."}
          </span>
        </span>
      </label>

      {ativo && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder="Nome de quem aprova"
              disabled={!!review}
              className="text-[13px] px-3 py-2 bg-white border border-[var(--color-border)] rounded-[var(--radius-input-inline)] outline-none"
            />
            <input
              value={approverEmail}
              onChange={(e) => setApproverEmail(e.target.value)}
              placeholder="E-mail"
              type="email"
              disabled={!!review}
              className="text-[13px] px-3 py-2 bg-white border border-[var(--color-border)] rounded-[var(--radius-input-inline)] outline-none"
            />
          </div>

          {review ? (
            <div
              className="text-[13px] px-3 py-2.5 rounded-[var(--radius-btn)]"
              style={{
                background:
                  review.state === "PENDING"
                    ? "var(--color-warn-bg)"
                    : review.state === "APPROVED"
                    ? "var(--color-accent-bg)"
                    : "var(--color-danger-bg)",
                color:
                  review.state === "PENDING"
                    ? "var(--color-warn)"
                    : review.state === "APPROVED"
                    ? "var(--color-accent-dark)"
                    : "var(--color-danger)",
              }}
            >
              {review.state === "PENDING" && `Aguardando ${review.approverName} responder.`}
              {review.state === "APPROVED" && `${review.approverName} aprovou.`}
              {review.state === "CHANGES" && `${review.approverName} pediu ajuste.`}
            </div>
          ) : (
            <Btn
              kind="primary"
              onClick={enviar}
              disabled={pending || approverName.trim().length < 2 || !/@/.test(approverEmail)}
            >
              {pending ? "Enviando…" : "Enviar pedido"}
            </Btn>
          )}

          {link && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-surface-sunken)] rounded-[var(--radius-input-inline)]">
              <span className="text-[11px] text-[var(--color-muted)] truncate flex-1">{link}</span>
              <button
                type="button"
                onClick={copiar}
                className="text-[11px] font-semibold text-[var(--color-ink)] underline"
              >
                Copiar
              </button>
            </div>
          )}

          {review && (
            <button
              type="button"
              onClick={cancelar}
              className="text-[11px] text-[var(--color-muted)] underline"
            >
              Cancelar pedido
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
