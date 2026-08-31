// /configuracoes → /configuracoes/contas por default.

import { redirect } from "next/navigation";

export default async function ConfiguracoesPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  redirect(`/${brandId}/configuracoes/contas`);
}
