// Segmented de abas — Redes / Contas / Equipe / Avisos. Fase 1 só implementa Contas;
// as outras redirecionam para Contas ou mostram vazio.

import Link from "next/link";
import { cn } from "@/lib/cn";

const TABS = [
  { slug: "redes", label: "Redes conectadas" },
  { slug: "contas", label: "Contas" },
  { slug: "equipe", label: "Equipe" },
  { slug: "avisos", label: "Avisos" },
];

export default async function ConfigLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  return (
    <div className="p-6 max-w-[860px] mx-auto space-y-4">
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26 }}>Configurações</h1>
      <div className="inline-flex p-[3px] bg-[var(--color-bg)] rounded-full">
        {TABS.map((t) => (
          <TabLink key={t.slug} href={`/${brandId}/configuracoes/${t.slug}`} label={t.label} />
        ))}
      </div>
      {children}
    </div>
  );
}

function TabLink({ href, label }: { href: string; label: string }) {
  // Uso simples: styling ativo aplicado via clases no client-side aria-current
  return (
    <Link
      href={href}
      className={cn(
        "px-[15px] py-[7px] text-[13px] rounded-full text-[var(--color-muted)] font-medium hover:text-[var(--color-ink)]",
      )}
    >
      {label}
    </Link>
  );
}
