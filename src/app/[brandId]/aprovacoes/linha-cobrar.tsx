"use client";

// Só o botão "Cobrar" precisa ser client (chama server action).
// Copiar link não é possível daqui — o token em claro não fica no banco;
// se quiser gerar link novo, envia a aprovação de novo pelo drawer.

import { useTransition } from "react";
import { Btn } from "@/components/ui/btn";
import { useToast } from "@/components/ui/toast";
import { lembrarAprovador } from "@/server/services/review";

export function LinhaCobrar({ postId }: { postId: string }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  return (
    <Btn
      onClick={() => {
        startTransition(async () => {
          const r = await lembrarAprovador(postId);
          if (!r.ok) toast.push({ text: "Não deu para enviar o lembrete." });
          else toast.push({ text: "Lembrete enviado." });
        });
      }}
      disabled={pending}
    >
      Cobrar
    </Btn>
  );
}
