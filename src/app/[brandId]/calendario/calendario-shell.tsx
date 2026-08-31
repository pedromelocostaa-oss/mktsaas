"use client";

// Cabeçalho do calendário (título mês, setas, modo Mês/Lista) + o corpo.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Segmented } from "@/components/ui/segmented";
import { CalendarioMes } from "./calendario-mes";
import { CalendarioLista } from "./calendario-lista";
import { Empty } from "@/components/ui/empty";
import { Btn } from "@/components/ui/btn";
import type { Network } from "@prisma/client";

export interface PostChip {
  id: string;
  title: string;
  scheduledAt: string;
  stage: "IDEA" | "PRODUCTION" | "SCHEDULED" | "PUBLISHED";
  networks: Network[];
  campanha: string | null;
  review: { state: "PENDING" | "APPROVED" | "CHANGES"; approverName: string } | null;
}

interface Props {
  brand: { id: string; name: string };
  ancora: string;
  modo: "mes" | "lista";
  query: string;
  posts: PostChip[];
  connections: Network[];
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function CalendarioShell({ brand, ancora, modo, query, posts }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const dt = new Date(ancora);
  const titulo = `${MESES[dt.getMonth()]} de ${dt.getFullYear()}`;

  function irPara(offset: number) {
    const proximo = new Date(dt);
    proximo.setMonth(proximo.getMonth() + offset);
    const next = new URLSearchParams(sp.toString());
    next.set("m", `${proximo.getFullYear()}-${String(proximo.getMonth() + 1).padStart(2, "0")}`);
    router.push(`?${next.toString()}`);
  }

  function setModo(v: "mes" | "lista") {
    const next = new URLSearchParams(sp.toString());
    next.set("v", v);
    router.push(`?${next.toString()}`);
  }

  return (
    <div data-onboarding="calendario-area" className="p-6 max-w-[1240px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26 }}>{titulo}</h1>
          <div className="flex items-center bg-white border border-[var(--color-border)] rounded-full overflow-hidden">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => irPara(-1)}
              className="px-2.5 py-1.5 hover:bg-[var(--color-surface-sunken)]"
            >
              ‹
            </button>
            <div className="w-px h-4 bg-[var(--color-border)]" />
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => irPara(1)}
              className="px-2.5 py-1.5 hover:bg-[var(--color-surface-sunken)]"
            >
              ›
            </button>
          </div>
          {query && (
            <span className="text-[13px] text-[var(--color-muted)]">
              {posts.length} resultado{posts.length === 1 ? "" : "s"} para “{query}”
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Segmented
            value={modo}
            onChange={setModo}
            options={[
              { value: "mes", label: "Mês" },
              { value: "lista", label: "Lista" },
            ]}
            ariaLabel="Modo de visualização"
          />
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
          {query ? (
            <Empty
              title="Nenhum post encontrado"
              detail={`Não há nada em ${brand.name} que combine com “${query}”. Tente o nome da campanha, um trecho da legenda ou o nome da rede.`}
            />
          ) : (
            <Empty
              title={`O calendário de ${brand.name} está vazio`}
              detail="Os posts que você criar aparecem aqui, na data e hora que marcar. Cada um mostra a rede, o estágio de produção e, se você pedir, quem precisa aprovar."
              action={
                <Link href={`/${brand.id}/calendario?post=novo`}>
                  <Btn kind="primary">Criar o primeiro post</Btn>
                </Link>
              }
            />
          )}
        </div>
      ) : modo === "mes" ? (
        <CalendarioMes brandId={brand.id} ancora={ancora} posts={posts} />
      ) : (
        <CalendarioLista brandId={brand.id} posts={posts} />
      )}
    </div>
  );
}
