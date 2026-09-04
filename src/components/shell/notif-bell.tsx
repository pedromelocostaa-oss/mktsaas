"use client";

// Sino de notificações no header. Client component: busca lista sob demanda
// e marca tudo como lida ao abrir (padrão do Gmail, Slack, Linear).

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { listarMinhas, marcarTodasLidas } from "@/server/services/notifications";

interface Item {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotifBell() {
  const [open, setOpen] = useState(false);
  const [itens, setItens] = useState<Item[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await listarMinhas(20);
      setItens(r.itens);
      setNaoLidas(r.naoLidas);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 60_000);
    return () => clearInterval(t);
  }, [carregar]);

  useEffect(() => {
    if (!open) return;
    if (naoLidas > 0) {
      marcarTodasLidas().then(() => {
        setNaoLidas(0);
        setItens((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
      });
    }
  }, [open, naoLidas]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notificações${naoLidas > 0 ? ` (${naoLidas} não lidas)` : ""}`}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-sunken)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {naoLidas > 0 && (
          <span
            className="absolute top-1 right-1 flex items-center justify-center text-[10px] font-bold text-white rounded-full"
            style={{ background: "var(--color-warn)", minWidth: 16, height: 16, padding: "0 4px" }}
          >
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 z-30 bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-dropdown)] overflow-hidden"
          style={{ width: 360 }}
        >
          <div className="px-4 py-2.5 flex items-center justify-between bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-soft)]">
            <span className="text-[13px] font-semibold">Notificações</span>
            <Link
              href="/configuracoes/avisos"
              onClick={() => setOpen(false)}
              className="text-[11px] text-[var(--color-muted)] underline"
            >
              preferências
            </Link>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {carregando && itens.length === 0 ? (
              <div className="p-6 text-center text-[13px] text-[var(--color-muted)]">Carregando…</div>
            ) : itens.length === 0 ? (
              <div className="p-6 text-center text-[13px] text-[var(--color-muted)]">
                Sem novidades por aqui.
              </div>
            ) : (
              <ul>
                {itens.map((n, i) => (
                  <li
                    key={n.id}
                    style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}
                  >
                    <Wrap href={n.href} onClick={() => setOpen(false)}>
                      <div className="px-4 py-3 hover:bg-[var(--color-surface-sunken)] flex gap-2">
                        <span
                          aria-hidden
                          className={cn(
                            "mt-1 shrink-0 inline-block rounded-full",
                            n.readAt ? "bg-transparent" : "",
                          )}
                          style={{ width: 6, height: 6, background: n.readAt ? "transparent" : "var(--color-accent)" }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium truncate">{n.title}</div>
                          <div className="text-[12px] text-[var(--color-muted)] leading-snug line-clamp-2">
                            {n.body}
                          </div>
                          <div className="text-[11px] text-[var(--color-muted)] mt-1 tabular">
                            {relative(new Date(n.createdAt))}
                          </div>
                        </div>
                      </div>
                    </Wrap>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Wrap({
  href,
  onClick,
  children,
}: {
  href: string | null;
  onClick: () => void;
  children: React.ReactNode;
}) {
  if (!href) return <div>{children}</div>;
  return (
    <Link href={href} onClick={onClick} className="block">
      {children}
    </Link>
  );
}

function relative(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  return `há ${Math.round(s / 86400)} d`;
}
