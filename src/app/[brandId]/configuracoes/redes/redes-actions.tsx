"use client";

import { useTransition } from "react";
import { Btn } from "@/components/ui/btn";
import { useToast } from "@/components/ui/toast";
import { iniciarOAuth, desconectar } from "@/server/services/connections";
import type { Network } from "@prisma/client";

export function RedesActions({
  brandId,
  network,
  conectada,
}: {
  brandId: string;
  network: Network;
  conectada: boolean;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function conectar() {
    startTransition(async () => {
      const r = await iniciarOAuth({ brandId, network });
      if (!r.ok) return toast.push({ text: r.error });
      window.location.href = r.url;
    });
  }

  function desconectarNet() {
    startTransition(async () => {
      const r = await desconectar(brandId, network);
      if (!r.ok) return toast.push({ text: "Não deu para desconectar." });
      toast.push({ text: "Desconectado." });
      window.location.reload();
    });
  }

  if (conectada) {
    return (
      <button
        type="button"
        onClick={desconectarNet}
        disabled={pending}
        className="text-[11px] text-[var(--color-muted)] underline hover:text-[var(--color-danger)]"
      >
        Desconectar
      </button>
    );
  }
  return (
    <Btn onClick={conectar} disabled={pending}>
      {pending ? "…" : "Conectar"}
    </Btn>
  );
}
