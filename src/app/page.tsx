// Home. Sem sessão → /entrar. Sem org → cria uma automaticamente com nome do user.
// Sem brand ativo → /nova-conta. Caso contrário → /[brandId]/calendario.

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getServerSession } from "@/server/auth-session";

export default async function Home() {
  const session = await getServerSession();
  if (!session?.user) redirect("/entrar");

  let membership = await db.member.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  // Sem organização — cria uma automaticamente. O usuário edita o nome
  // depois em Configurações → Equipe.
  if (!membership) {
    const nome = session.user.name || session.user.email.split("@")[0];
    const slug = slugify(nome) + "-" + Math.random().toString(36).slice(2, 6);
    const org = await auth.api.createOrganization({
      body: { name: nome, slug, keepCurrentActiveOrganization: false },
      headers: await headers(),
    });
    if (org) {
      await db.member.updateMany({
        where: { userId: session.user.id, organizationId: org.id },
        data: { role: "OWNER" },
      });
      membership = { organizationId: org.id } as unknown as typeof membership;
    }
  }

  if (!membership) redirect("/entrar");

  const brand = await db.brand.findFirst({
    where: { organizationId: membership.organizationId, archivedAt: null },
    orderBy: { createdAt: "asc" },
  });

  if (!brand) redirect("/nova-conta");
  redirect(`/${brand.id}/calendario`);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32) || "conta";
}
