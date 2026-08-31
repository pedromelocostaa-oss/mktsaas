"use client";

// Header 68px. Seletor de conta (dropdown), Segmented período, busca, Compartilhar, Novo post.
// Trocar conta = navegar (docs/08 #3). Busca leva ao Calendário (?q=).

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Btn } from "@/components/ui/btn";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";
import { criarIdeiaRapida } from "@/server/services/posts";
import { useToast } from "@/components/ui/toast";
import { ShareModal } from "@/components/share/share-modal";
import type { Network } from "@prisma/client";
import { netMeta } from "@/lib/network";

interface BrandLite {
  id: string;
  name: string;
  handle: string | null;
  kind: "COMPANY" | "PERSON";
  connections: { network: Network }[];
}

interface PostOpt {
  id: string;
  title: string;
  scheduledAt: string;
  networks: Network[];
}

interface Props {
  currentBrand: BrandLite;
  brands: BrandLite[];
  postsParaShare: PostOpt[];
}

const RANGES = [
  { value: "7", label: "7 dias" },
  { value: "15", label: "15 dias" },
  { value: "30", label: "30 dias" },
] as const;

export function TopBar({ currentBrand, brands, postsParaShare }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [range, setRange] = useState<"7" | "15" | "30">((params.get("r") as "7" | "15" | "30") ?? "30");
  const [criando, startTransition] = useTransition();
  const [shareOpen, setShareOpen] = useState(false);

  // Debounce da busca — atualiza a URL sem re-navegar.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q) next.set("q", q);
      else next.delete("q");
      // Se digitou algo, garante que está no calendário.
      const alvo = q ? `/${currentBrand.id}/calendario` : pathname;
      router.replace(`${alvo}?${next.toString()}`);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function novoPost() {
    startTransition(async () => {
      const r = await criarIdeiaRapida(currentBrand.id);
      if (r.ok) {
        toast.push({ text: "Novo post criado como ideia amanhã às 10:00." });
        router.push(`/${currentBrand.id}/calendario?post=${r.id}`);
      }
    });
  }

  return (
    <header
      className="flex items-center gap-3 px-6 shrink-0"
      style={{ height: 68, background: "var(--color-surface-sunken)", borderBottom: "1px solid var(--color-border-soft)" }}
    >
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 bg-white border border-[var(--color-border)] rounded-full"
        >
          <span
            aria-hidden
            className="flex items-center justify-center rounded-full text-white text-[12px] font-semibold"
            style={{ width: 30, height: 30, background: "var(--color-ink)" }}
          >
            {iniciais(currentBrand.name)}
          </span>
          <span className="text-left leading-tight">
            <span className="block text-[13px] font-semibold">{currentBrand.name}</span>
            <span className="block text-[11px] text-[var(--color-muted)]">
              {currentBrand.kind === "COMPANY" ? "Marca" : "Pessoa"}
            </span>
          </span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {open && (
          <div
            role="menu"
            className="absolute left-0 mt-1.5 z-30 py-1.5 bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-dropdown)]"
            style={{ width: 288 }}
          >
            <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-[var(--color-muted-2)]">
              Trocar conta
            </div>
            {brands.map((b) => (
              <Link
                key={b.id}
                href={pathname.replace(`/${currentBrand.id}`, `/${b.id}`)}
                onClick={() => setOpen(false)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-[12px] hover:bg-[var(--color-surface-sunken)]",
                  b.id === currentBrand.id && "bg-[var(--color-surface-sunken)]",
                )}
              >
                <span className="flex-1">
                  <span className="block text-[13px] font-medium">{b.name}</span>
                  <span className="block text-[11px] text-[var(--color-muted)]">
                    {b.handle ? "@" + b.handle : "sem @"} · {b.kind === "COMPANY" ? "Marca" : "Pessoa"}
                  </span>
                </span>
                <span className="flex gap-1">
                  {b.connections.map((c) => (
                    <span
                      key={c.network}
                      aria-label={netMeta[c.network].label}
                      className="inline-block rounded-full"
                      style={{ width: 7, height: 7, background: netMeta[c.network].color }}
                    />
                  ))}
                </span>
              </Link>
            ))}
            <div className="mt-1 pt-1 border-t border-[var(--color-border-soft)]">
              <Link
                href="/nova-conta"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium hover:bg-[var(--color-surface-sunken)] rounded-[12px]"
              >
                <span className="text-[var(--color-muted)]">+</span> Criar nova conta
              </Link>
            </div>
          </div>
        )}
      </div>

      <Segmented
        value={range}
        onChange={(v) => {
          setRange(v);
          const next = new URLSearchParams(params.toString());
          next.set("r", v);
          router.replace(`${pathname}?${next.toString()}`);
        }}
        options={RANGES.map((r) => ({ value: r.value, label: r.label }))}
        ariaLabel="Período"
      />

      <div className="flex-1 flex justify-center">
        <div
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 w-full max-w-[340px] bg-white rounded-full border",
            q ? "border-[var(--color-ink)]" : "border-[var(--color-border)]",
          )}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted-2)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar post, texto ou rede"
            className="flex-1 text-[13px] bg-transparent outline-none"
            aria-label="Buscar"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Limpar busca">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted-2)" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <Btn data-onboarding="btn-compartilhar" onClick={() => setShareOpen(true)}>
        Compartilhar
      </Btn>
      <Btn data-onboarding="btn-novo-post" kind="primary" onClick={novoPost} disabled={criando}>
        + Novo post
      </Btn>

      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        brandId={currentBrand.id}
        brandName={currentBrand.name}
        posts={postsParaShare}
      />
    </header>
  );
}

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
