"use client";

// Filtros do painel: chips de rede + select de base de comparação.
// Alteram a URL (?net, ?b, ?r), o server component refaz as agregações.

import { useRouter, useSearchParams } from "next/navigation";
import { netMeta, NETWORKS } from "@/lib/network";
import { cn } from "@/lib/cn";
import type { Baseline, Network } from "@prisma/client";

interface Props {
  brandId: string;
  rangeDays: number;
  network: Network | null;
  baseline: Baseline;
  conectadas: Network[];
}

export function PainelFiltros({ rangeDays, network, baseline, conectadas }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  function setParam(chave: string, valor: string | null) {
    const next = new URLSearchParams(sp.toString());
    if (valor == null) next.delete(chave);
    else next.set(chave, valor);
    router.replace(`?${next.toString()}`);
  }

  const opcoes = conectadas.length > 0 ? conectadas : NETWORKS;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <Chip on={network === null} onClick={() => setParam("net", null)}>
          Todas as redes
        </Chip>
        {opcoes.map((n) => (
          <Chip key={n} on={network === n} onClick={() => setParam("net", n.toLowerCase())}>
            <span
              aria-hidden
              className="inline-block rounded-full"
              style={{ width: 7, height: 7, background: netMeta[n].color }}
            />
            {netMeta[n].label}
          </Chip>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2 text-[13px]">
        <label className="text-[var(--color-muted)]">Comparar com</label>
        <select
          value={baseline}
          onChange={(e) => setParam("b", e.target.value)}
          className="text-[13px] px-3 py-2 bg-white border border-[var(--color-border)] rounded-[var(--radius-input-inline)] outline-none"
        >
          <option value="PREVIOUS">período anterior</option>
          <option value="AVG12W">média das últimas 12 semanas</option>
          <option value="LAST_YEAR">mesmo período do ano passado</option>
        </select>
      </div>
      {/* rangeDays já vem do header global — só refletido aqui em texto pequeno */}
      <span className="text-[11px] text-[var(--color-muted)]">últimos {rangeDays} dias</span>
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] rounded-full border transition-colors",
        on
          ? "bg-[var(--color-ink)] text-white border-[var(--color-ink)]"
          : "bg-white text-[var(--color-ink-2)] border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)]",
      )}
    >
      {children}
    </button>
  );
}
