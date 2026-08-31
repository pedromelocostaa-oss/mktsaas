// Wizard de nova conta — Fase 1. Ver docs/08 #13, #14 e handoff §11.
// Renderiza como página; para o "Nova conta" a partir do app é a mesma URL
// (navegação normal).

import { redirect } from "next/navigation";
import { getServerSession } from "@/server/auth-session";
import { contarContasAtivas, pegarOrgAtiva } from "@/server/services/queries";
import { NovaContaWizard } from "./wizard";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { db } from "@/server/db";

export default async function NovaContaPage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/entrar");

  // Garantia: cria a organização default se ainda não existir.
  let org = await pegarOrgAtivaSafe();
  if (!org) {
    const nome = session.user.name || session.user.email.split("@")[0];
    const slug = nome.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) + "-" + Math.random().toString(36).slice(2, 6);
    const created = await auth.api.createOrganization({
      body: { name: nome, slug, keepCurrentActiveOrganization: false },
      headers: await headers(),
    });
    if (created) {
      await db.member.updateMany({
        where: { userId: session.user.id, organizationId: created.id },
        data: { role: "OWNER" },
      });
      org = await pegarOrgAtivaSafe();
    }
  }
  if (!org) redirect("/entrar");

  const nContas = await contarContasAtivas();

  return (
    <main className="min-h-screen flex flex-col items-center px-5" style={{ background: "var(--color-bg)" }}>
      <div className="w-full max-w-[580px] pt-14 pb-14">
        <div className="mb-6" style={{ fontFamily: "var(--font-serif)", fontSize: 27, lineHeight: 1 }}>
          Pauta
        </div>
        <div className="bg-white shadow-[var(--shadow-modal-share)] rounded-[var(--radius-modal)] overflow-hidden">
          <NovaContaWizard contasAtuais={nContas} includedBrands={org.includedBrands} />
        </div>
      </div>
    </main>
  );
}

async function pegarOrgAtivaSafe() {
  try {
    return await pegarOrgAtiva();
  } catch {
    return null;
  }
}
