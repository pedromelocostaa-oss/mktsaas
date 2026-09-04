"use client";

import { useState, useTransition } from "react";
import { salvarPreferencias } from "@/server/services/notifications";
import { useToast } from "@/components/ui/toast";

type Prefs = { approvals: boolean; publishing: boolean; shares: boolean; connections: boolean };

export function AvisosForm({
  inicial,
  labels,
}: {
  inicial: Prefs;
  labels: Record<keyof Prefs, { titulo: string; descricao: string }>;
}) {
  const toast = useToast();
  const [prefs, setPrefs] = useState<Prefs>(inicial);
  const [pending, startTransition] = useTransition();

  function toggle(k: keyof Prefs) {
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    startTransition(async () => {
      const r = await salvarPreferencias(next);
      if (!r.ok) {
        setPrefs(prefs);
        toast.push({ text: "Não deu para salvar." });
      }
    });
  }

  const chaves = Object.keys(labels) as (keyof Prefs)[];

  return (
    <ul>
      {chaves.map((k, i) => (
        <li
          key={k}
          className="px-6 py-4"
          style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}
        >
          <label className="flex gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs[k]}
              onChange={() => toggle(k)}
              disabled={pending}
              className="mt-1"
              style={{ accentColor: "var(--color-accent)" }}
            />
            <div className="flex-1">
              <div className="text-[13px] font-medium">{labels[k].titulo}</div>
              <div className="text-[12px] text-[var(--color-muted)] leading-relaxed">
                {labels[k].descricao}
              </div>
            </div>
          </label>
        </li>
      ))}
    </ul>
  );
}
