// Guard de superadmin. Usado em todas as rotas /admin/*.
// Sem sessão OU sem isSuperAdmin → notFound (não vaza a existência do painel).

import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getServerSession } from "@/server/auth-session";

export async function requireSuperAdmin() {
  const session = await getServerSession();
  if (!session?.user) notFound();
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, isSuperAdmin: true },
  });
  if (!user?.isSuperAdmin) notFound();
  return user;
}
