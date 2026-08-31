"use client";

// Entrada manual de métricas — só aparece para redes sem API na rede alvo do post.
// docs/05: rede manual é cidadã de primeira classe.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/ui/btn";
import { useToast } from "@/components/ui/toast";
import { enterManualMetrics } from "@/server/services/metrics";
import { netMeta, NETWORKS } from "@/lib/network";
import type { Network } from "@prisma/client";

interface Props {
  postId: string;
  targets: { id: string; network: Network; metricSource: "API" | "MANUAL" }[];
}

export function ManualMetrics({ targets }: Props) {
  // Só faz sentido para redes cuja fonte é MANUAL (rede sem API OU rede
  // API que o usuário optou por preencher à mão).
  const manuais = targets.filter((t) => netMeta[t.network].source === "MANUAL" || t.metricSource === "MANUAL");
  if (manuais.length === 0) return null;

  return (
    <div className="bg-white rounded-[var(--radius-card)] p-5">
      <h3 className="text-[15px] font-semibold mb-1">Preencher números à mão</h3>
      <p className="text-[13px] text-[var(--color-muted)] leading-relaxed mb-3">
        Para redes sem API. Os números que você informar entram no histórico como
        "à mão" e o relatório compartilhado diz isso.
      </p>
      <div className="space-y-3">
        {manuais.map((t) => (
          <ManualLinha key={t.id} target={t} />
        ))}
      </div>
    </div>
  );
}

function ManualLinha({ target }: { target: { id: string; network: Network } }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [reach, setReach] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [shares, setShares] = useState("");
  const [saves, setSaves] = useState("");
  const [views, setViews] = useState("");

  function salvar() {
    startTransition(async () => {
      const num = (v: string) => (v ? Number(v) : undefined);
      const r = await enterManualMetrics({
        postTargetId: target.id,
        reach: num(reach),
        likes: num(likes),
        comments: num(comments),
        shares: num(shares),
        saves: num(saves),
        views: num(views),
      });
      if (!r.ok) return toast.push({ text: r.error });
      toast.push({ text: `${netMeta[target.network].label}: números salvos.` });
      setReach("");
      setLikes("");
      setComments("");
      setShares("");
      setSaves("");
      setViews("");
      router.refresh();
    });
  }

  const camposComuns = "text-[13px] px-2 py-1.5 bg-white border border-[var(--color-border)] rounded-[10px] outline-none w-full";

  return (
    <div className="rounded-[var(--radius-btn)] p-3" style={{ background: "var(--color-surface-sunken)" }}>
      <div className="flex items-center gap-2 mb-2">
        <span
          aria-hidden
          className="inline-block rounded-full"
          style={{ width: 8, height: 8, background: netMeta[target.network].color }}
        />
        <span className="text-[13px] font-medium">{netMeta[target.network].label}</span>
        <span className="text-[11px] text-[var(--color-muted)] ml-1">preenchimento à mão</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Campo label="Alcance" value={reach} onChange={setReach} className={camposComuns} />
        <Campo label="Curtidas" value={likes} onChange={setLikes} className={camposComuns} />
        <Campo label="Comentários" value={comments} onChange={setComments} className={camposComuns} />
        <Campo label="Compart." value={shares} onChange={setShares} className={camposComuns} />
        <Campo label="Salvos" value={saves} onChange={setSaves} className={camposComuns} />
        <Campo label="Views" value={views} onChange={setViews} className={camposComuns} />
      </div>
      <div className="mt-3 flex justify-end">
        <Btn onClick={salvar} disabled={pending}>{pending ? "Salvando…" : "Salvar números"}</Btn>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className: string;
}) {
  return (
    <label className="block">
      <div className="text-[11px] text-[var(--color-muted)] mb-1">{label}</div>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className={className}
      />
    </label>
  );
}

// Sanity: NETWORKS é o subconjunto tratado — evita esquecer nova rede no futuro.
void NETWORKS;
