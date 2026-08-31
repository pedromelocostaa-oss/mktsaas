"use server";

// Wrapper server action que o form da wizard chama. Cria a brand,
// opcionalmente as conexões placeholder, e redireciona para o calendário.

import { redirect } from "next/navigation";
import { criarBrand, conectarPlaceholder } from "@/server/services/brands";
import type { Network } from "@prisma/client";

export async function submeterWizard(input: {
  name: string;
  kind: "COMPANY" | "PERSON";
  handle?: string;
  defaultApprover?: string;
  networks: Network[];
}) {
  const r = await criarBrand({
    name: input.name,
    kind: input.kind,
    handle: input.handle,
    defaultApprover: input.defaultApprover,
  });
  if (!r.ok) return { ok: false as const, error: r.error };

  for (const n of input.networks) {
    await conectarPlaceholder(r.brandId, n, input.handle ?? "");
  }
  redirect(`/${r.brandId}/calendario?nova=1`);
}
