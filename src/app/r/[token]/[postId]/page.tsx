// /r/[token]/[postId] — detalhe de uma publicação do relatório.
// Autoriza o postId contra o link (docs/08 #7). Trocar id devolve 404.

import Link from "next/link";
import { notFound } from "next/navigation";
import { Indisponivel, PublicShell } from "@/components/public/shell";
import { PostPublicView } from "@/components/public/post-view";
import {
  autorizarPostNoShare,
  registrarVisita,
  resolverShareLink,
  serializePublicPost,
} from "@/server/services/share-public";

export const dynamic = "force-dynamic";

export default async function PostRelatorioPage({
  params,
}: {
  params: Promise<{ token: string; postId: string }>;
}) {
  const { token, postId } = await params;
  const link = await resolverShareLink(token);
  if (!link || link.kind !== "DASHBOARD") return <Indisponivel motivo="inexistente" />;

  const post = await autorizarPostNoShare(link, postId);
  if (!post) notFound();

  registrarVisita(link.id);
  const publico = await serializePublicPost(post);

  return (
    <PublicShell>
      <div className="mb-4">
        <Link href={`/r/${token}`} className="text-[13px] text-[var(--color-muted)] hover:underline">
          ‹ Voltar ao relatório
        </Link>
      </div>
      <PostPublicView post={publico} />
      <p className="mt-6 text-[11px] text-[var(--color-muted)] text-center">
        Você está vendo apenas essa publicação. O link não dá acesso a nada além do que aparece aqui.
      </p>
    </PublicShell>
  );
}
