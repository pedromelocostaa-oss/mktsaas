// Wizard de nova conta — Fase 1. Ver docs/08 #13, #14 e handoff §11.
// Renderiza como página; para o "Nova conta" a partir do app é a mesma URL
// (navegação normal).

import { redirect } from "next/navigation";
import { getServerSession } from "@/server/auth-session";
import { NovaContaWizard } from "./wizard";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { db } from "@/server/db";

export default async function NovaContaPage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/entrar");

  // Pega ou cria a organização pelo membership do próprio user — não usa
  // requireTenant() aqui porque a sessão pode ainda não ter activeOrganizationId
  // (típico logo depois do primeiro login).
  let member = await db.member.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  if (!member) {
    const nome = session.user.name || session.user.email.split("@")[0];
    const slug =
      nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 32) +
      "-" +
      Math.random().toString(36).slice(2, 6);
    try {
      const created = await auth.api.createOrganization({
        body: { name: nome, slug, keepCurrentActiveOrganization: false },
        headers: await headers(),
      });
      if (created) {
        await db.member.updateMany({
          where: { userId: session.user.id, organizationId: created.id },
          data: { role: "OWNER" },
        });
      }
    } catch (e) {
      console.error("nova-conta: createOrganization falhou", e);
    }
    member = await db.member.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!member) {
    // Sem membership de fato — mostra erro em vez de redirecionar em loop.
    return (
      <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--color-bg)" }}>
        <div className="max-w-[420px] bg-white p-8 rounded-[var(--radius-card)] shadow-[var(--shadow-card)] text-center">
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 27 }} className="mb-2">Pauta</div>
          <p className="text-[13px] text-[var(--color-muted)]">
            Não deu para criar sua organização. Recarregue a página em alguns segundos.
          </p>
        </div>
      </main>
    );
  }

  const org = await db.organization.findUnique({ where: { id: member.organizationId } });
  if (!org) redirect("/entrar");

  const nContas = await db.brand.count({
    where: { organizationId: member.organizationId, archivedAt: null },
  });

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
