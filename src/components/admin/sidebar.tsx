"use client";

// Sidebar do painel admin — deliberadamente vermelha na faixa superior
// para deixar claro que o operador não está no app normal do usuário.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

interface Nav {
  href: string;
  label: string;
}

const NAV: Nav[] = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/orgs", label: "Organizações" },
  { href: "/admin/users", label: "Usuários" },
  { href: "/admin/atividade", label: "Atividade" },
  { href: "/admin/saude", label: "Saúde" },
  { href: "/admin/melhorias", label: "Melhorias" },
];

export function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();
  return (
    <nav
      className="flex flex-col shrink-0 h-screen text-white"
      style={{ width: 228, background: "var(--color-ink)" }}
    >
      <div className="px-[22px] pt-5 pb-2">
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 27, lineHeight: 1 }}>Pauta</div>
        <div className="mt-1 inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ background: "var(--color-danger)", color: "white" }}>
          admin
        </div>
      </div>
      <div className="flex-1 px-2.5 space-y-0.5 mt-4">
        {NAV.map((n) => {
          const active = pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "block px-3 py-2.5 text-[13px] rounded-[12px]",
                active
                  ? "bg-white/10 text-white font-semibold"
                  : "text-[var(--color-nav-idle)] font-normal hover:bg-white/5 hover:text-white",
              )}
            >
              {n.label}
            </Link>
          );
        })}
      </div>
      <div className="mx-2.5 my-2.5 border-t border-white/10" />
      <div className="px-2.5 pb-2.5 space-y-0.5">
        <Link
          href="/"
          className="block px-3 py-2.5 text-[13px] rounded-[12px] text-[var(--color-nav-idle)] hover:bg-white/5 hover:text-white"
        >
          ← Voltar ao app
        </Link>
      </div>
      <div className="px-[22px] pb-4 text-[11px] text-[var(--color-nav-idle)]">
        Conectado como {adminName}
      </div>
    </nav>
  );
}
