// Configurações → Contas. Lista contas ativas e arquivadas. Arquivar oferece Desfazer.

import Link from "next/link";
import { listarBrandsArquivadas, listarBrandsAtivas, pegarOrgAtiva } from "@/server/services/queries";
import { ContaLinha } from "./conta-linha";
import { Btn } from "@/components/ui/btn";

export default async function ContasPage() {
  const [ativas, arquivadas, org] = await Promise.all([
    listarBrandsAtivas(),
    listarBrandsArquivadas(),
    pegarOrgAtiva(),
  ]);

  const total = ativas.length;
  const incluidas = org?.includedBrands ?? 3;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-soft)]">
          <div>
            <div className="text-[15px] font-semibold">Suas contas</div>
            <div className="text-[13px] text-[var(--color-muted)]">
              {total} ativa{total === 1 ? "" : "s"}
              {total > incluidas ? ` · ${total - incluidas} cobrada${total - incluidas === 1 ? "" : "s"} a R$ 29/mês` : ` · dentro das ${incluidas} do plano`}
            </div>
          </div>
          <Link href="/nova-conta">
            <Btn kind="primary">+ Nova conta</Btn>
          </Link>
        </div>
        {ativas.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-[var(--color-muted)]">
            Você ainda não tem contas. <Link href="/nova-conta" className="underline text-[var(--color-ink)]">Criar a primeira</Link>.
          </div>
        ) : (
          <ul>
            {ativas.map((b, i) => (
              <li key={b.id} style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}>
                <ContaLinha
                  id={b.id}
                  name={b.name}
                  handle={b.handle}
                  kind={b.kind}
                  networks={b.connections.map((c) => c.network)}
                  archived={false}
                />
              </li>
            ))}
          </ul>
        )}
        <div className="px-6 py-3 text-[12px] text-[var(--color-muted)] border-t border-[var(--color-border-soft)] bg-[var(--color-surface-sunken)]">
          Arquivar tira a conta do seletor, para a cobrança na virada do ciclo e preserva posts e histórico. Dá para voltar depois.
        </div>
      </div>

      {arquivadas.length > 0 && (
        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-6 py-4 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-soft)]">
            <div className="text-[15px] font-semibold">Arquivadas</div>
          </div>
          <ul>
            {arquivadas.map((b, i) => (
              <li key={b.id} style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}>
                <ContaLinha
                  id={b.id}
                  name={b.name}
                  handle={b.handle}
                  kind={b.kind}
                  networks={[]}
                  archived
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
