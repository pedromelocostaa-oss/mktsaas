"use client";

// Menu lateral fixo 228px. Cores do handoff §1. Ativo carrega peso e fundo.
// Estado nunca é comunicado só por cor (docs/08 #25) — peso do texto muda.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  badge?: number;
  soon?: boolean;
}

interface Props {
  brandId: string;
  pendentes?: number;
  metricasHa?: string;
}

export function Sidebar({ brandId, pendentes = 0, metricasHa }: Props) {
  const pathname = usePathname();

  const main: NavItem[] = [
    { href: `/${brandId}/painel`, label: "Painel" },
    { href: `/${brandId}/calendario`, label: "Calendário" },
    { href: `/${brandId}/aprovacoes`, label: "Aprovações", badge: pendentes },
    { href: `/${brandId}/sugestoes`, label: "Sugestões", soon: true },
  ];
  const secundario: NavItem[] = [
    { href: `/${brandId}/ajuda`, label: "Ajuda" },
    { href: `/${brandId}/configuracoes`, label: "Configurações" },
  ];

  return (
    <nav
      className="flex flex-col shrink-0 h-screen text-white"
      style={{ width: 228, background: "var(--color-ink)" }}
    >
      <div className="px-[22px] pt-5 pb-6">
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 27, lineHeight: 1, letterSpacing: "-0.01em" }}>
          Pauta
        </div>
      </div>
      <div className="flex-1 px-2.5 space-y-0.5">
        {main.map((n) => (
          <NavLink key={n.href} item={n} active={isActive(pathname, n.href)} />
        ))}
      </div>
      <div className="mx-2.5 my-2.5 border-t border-white/10" />
      <div className="px-2.5 pb-2.5 space-y-0.5">
        {secundario.map((n) => (
          <NavLink key={n.href} item={n} active={isActive(pathname, n.href)} />
        ))}
      </div>
      {metricasHa && (
        <div
          className="mx-2.5 mb-2.5 px-3 py-2.5 rounded-[12px] flex items-center gap-2 text-xs"
          style={{ background: "rgba(255,255,255,.06)", color: "var(--color-nav-idle)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15A9 9 0 1 1 5.64 5.64L23 10" />
          </svg>
          Métricas atualizadas há {metricasHa}
        </div>
      )}
    </nav>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 text-[13px] rounded-[12px]",
        active
          ? "bg-white/10 text-white font-semibold"
          : "text-[var(--color-nav-idle)] font-normal hover:bg-white/5 hover:text-white",
      )}
    >
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span
          className="text-[11px] font-bold text-white rounded-full"
          style={{ background: "var(--color-warn)", padding: "2px 7px" }}
        >
          {item.badge}
        </span>
      ) : null}
      {item.soon && <span className="text-[11px] text-[var(--color-muted-2)]">em breve</span>}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}
