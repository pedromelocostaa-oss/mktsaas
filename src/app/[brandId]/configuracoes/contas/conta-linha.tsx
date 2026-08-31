"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Btn } from "@/components/ui/btn";
import { arquivarBrand, desarquivarBrand } from "@/server/services/brands";
import { useToast } from "@/components/ui/toast";
import { netMeta } from "@/lib/network";
import type { Network } from "@prisma/client";

interface Props {
  id: string;
  name: string;
  handle: string | null;
  kind: "COMPANY" | "PERSON";
  networks: Network[];
  archived: boolean;
}

export function ContaLinha({ id, name, handle, kind, networks, archived }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function arquivar() {
    startTransition(async () => {
      const r = await arquivarBrand(id);
      if (!r.ok) return toast.push({ text: "Não deu para arquivar." });
      toast.push({
        text: `Conta “${name}” arquivada.`,
        onUndo: async () => {
          await desarquivarBrand(id);
          router.refresh();
        },
      });
      router.refresh();
    });
  }

  function restaurar() {
    startTransition(async () => {
      const r = await desarquivarBrand(id);
      if (!r.ok) return toast.push({ text: "Não deu para restaurar." });
      toast.push({ text: `Conta “${name}” restaurada.` });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <span
        aria-hidden
        className="flex items-center justify-center rounded-full text-white text-[12px] font-semibold"
        style={{ width: 32, height: 32, background: "var(--color-ink)" }}
      >
        {name
          .split(/\s+/)
          .map((w) => w[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase()}
      </span>
      <div className="flex-1">
        <div className="text-[13px] font-medium">{name}</div>
        <div className="text-[11px] text-[var(--color-muted)]">
          {kind === "COMPANY" ? "Marca" : "Pessoa"}
          {handle && ` · @${handle}`}
          {networks.length > 0 && ` · ${networks.length} rede${networks.length === 1 ? "" : "s"}`}
        </div>
      </div>
      {networks.length > 0 && (
        <span className="flex gap-1">
          {networks.map((n) => (
            <span
              key={n}
              aria-label={netMeta[n].label}
              className="inline-block rounded-full"
              style={{ width: 8, height: 8, background: netMeta[n].color }}
            />
          ))}
        </span>
      )}
      {archived ? (
        <button
          type="button"
          onClick={restaurar}
          disabled={pending}
          className="text-[13px] underline text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          Restaurar
        </button>
      ) : (
        <button
          type="button"
          onClick={arquivar}
          disabled={pending}
          className="text-[13px] underline text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          Arquivar
        </button>
      )}
    </div>
  );
}
