"use client";

// Form da resposta do aprovador. "Aprovar" direto; "Pedir ajuste" abre textarea
// (obrigatório — docs/08 #20).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/ui/btn";

export function AprovadorForm({ token, approverName }: { token: string; approverName: string }) {
  const router = useRouter();
  const [modo, setModo] = useState<"nenhum" | "ajuste">("nenhum");
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(decision: "approve" | "changes") {
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/public/review/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          ...(decision === "changes" ? { note: nota.trim() } : {}),
        }),
      });
      const json = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        if (json.error === "note_obrigatorio") setErro("Escreva o que precisa mudar para pedir ajuste.");
        else if (json.error === "muitas_tentativas") setErro("Muitas tentativas. Aguarde alguns segundos.");
        else if (json.error === "indisponivel") setErro("Este link não está mais disponível.");
        else setErro(json.error ?? "Não deu para enviar.");
        return;
      }
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-4 bg-white rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)]">
      <div className="text-[13px] text-[var(--color-muted)] mb-3">
        Olá, <strong className="text-[var(--color-ink-2)]">{approverName}</strong>. O que decide?
      </div>

      {modo === "nenhum" ? (
        <div className="flex flex-col gap-2">
          <Btn kind="primary" full onClick={() => enviar("approve")} disabled={enviando}>
            {enviando ? "Enviando…" : "Aprovar"}
          </Btn>
          <Btn full onClick={() => setModo("ajuste")} disabled={enviando}>
            Pedir ajuste
          </Btn>
        </div>
      ) : (
        <div>
          <label className="block text-[13px] font-medium mb-1.5">
            O que precisa mudar? <span className="text-[var(--color-muted)] font-normal">— obrigatório</span>
          </label>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={5}
            autoFocus
            placeholder="Diga com objetividade o que falta."
            className="w-full text-[13px] px-3 py-2.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border)] rounded-[var(--radius-btn)] outline-none focus:outline focus:outline-2 focus:outline-[var(--color-accent-light)] focus:outline-offset-2 resize-none"
          />
          <div className="mt-3 flex gap-2">
            <Btn onClick={() => setModo("nenhum")} disabled={enviando}>
              Voltar
            </Btn>
            <Btn
              kind="primary"
              full
              onClick={() => enviar("changes")}
              disabled={enviando || nota.trim().length === 0}
            >
              {enviando ? "Enviando…" : "Enviar pedido de ajuste"}
            </Btn>
          </div>
        </div>
      )}

      {erro && <div className="mt-3 text-[13px] text-[var(--color-danger)]">{erro}</div>}
    </div>
  );
}
