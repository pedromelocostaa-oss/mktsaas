// Calendário — a tela central da Fase 1. Modo Mês e Lista, com busca via ?q=,
// drawer do post via ?post=id, e modal do dia via ?dia=YYYY-MM-DD.

import { pegarBrand, listarPostsDoMes } from "@/server/services/queries";
import { notFound } from "next/navigation";
import { CalendarioShell } from "./calendario-shell";
import { PostDrawer } from "./post-drawer";
import { DiaModal } from "./dia-modal";
import { db } from "@/server/db";
import { requireTenant } from "@/server/tenant";

interface Search {
  q?: string;
  m?: string; // YYYY-MM
  v?: "mes" | "lista";
  post?: string;
  dia?: string; // YYYY-MM-DD
}

export default async function CalendarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ brandId: string }>;
  searchParams: Promise<Search>;
}) {
  const { brandId } = await params;
  const sp = await searchParams;

  const brand = await pegarBrand(brandId);
  if (!brand) notFound();

  const ancora = parseMes(sp.m);
  const posts = await listarPostsDoMes(brandId, ancora, sp.q);

  const modo = sp.v === "lista" ? "lista" : "mes";

  // Se ?post=id, busca o post completo para o drawer.
  const t = await requireTenant();
  const editando = sp.post
    ? await t.post.findUnique({
        where: { id: sp.post },
        include: {
          targets: true,
          review: true,
          campaign: { select: { name: true } },
          brand: { select: { name: true, connections: { select: { network: true } } } },
        },
      })
    : null;

  return (
    <>
      <CalendarioShell
        brand={brand}
        ancora={ancora.toISOString()}
        modo={modo}
        query={sp.q ?? ""}
        posts={posts.map(serializePost)}
        connections={brand.connections.map((c) => c.network)}
      />
      {sp.dia && (
        <DiaModal
          brandId={brandId}
          dia={sp.dia}
          posts={posts
            .filter((p) => sameLocalDay(p.scheduledAt, sp.dia!))
            .map(serializePost)}
        />
      )}
      {editando && <PostDrawer brandId={brandId} post={serializePostFull(editando)} />}
    </>
  );
}

function parseMes(m?: string) {
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const [y, mo] = m.split("-").map(Number);
    return new Date(y, mo - 1, 1);
  }
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameLocalDay(dt: Date, dia: string) {
  const [y, m, d] = dia.split("-").map(Number);
  return dt.getFullYear() === y && dt.getMonth() + 1 === m && dt.getDate() === d;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializePost(p: any) {
  return {
    id: p.id as string,
    title: p.title as string,
    scheduledAt: (p.scheduledAt as Date).toISOString(),
    stage: p.stage as "IDEA" | "PRODUCTION" | "SCHEDULED" | "PUBLISHED",
    networks: (p.targets as { network: string }[]).map((t) => t.network as import("@prisma/client").Network),
    campanha: (p.campaign as { name: string } | null)?.name ?? null,
    review: p.review
      ? {
          state: p.review.state as "PENDING" | "APPROVED" | "CHANGES",
          approverName: p.review.approverName as string,
        }
      : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializePostFull(p: any) {
  return {
    id: p.id as string,
    title: p.title as string,
    scheduledAt: (p.scheduledAt as Date).toISOString(),
    stage: p.stage as "IDEA" | "PRODUCTION" | "SCHEDULED" | "PUBLISHED",
    baseCaption: p.baseCaption as string,
    internalNote: p.internalNote as string,
    targets: (p.targets as { network: string; caption: string | null }[]).map((t) => ({
      network: t.network as import("@prisma/client").Network,
      caption: t.caption,
    })),
    review: p.review
      ? {
          state: p.review.state as "PENDING" | "APPROVED" | "CHANGES",
          approverName: p.review.approverName as string,
          note: p.review.note as string | null,
        }
      : null,
    campanha: (p.campaign as { name: string } | null)?.name ?? null,
    brandName: p.brand.name as string,
    brandConnections: (p.brand.connections as { network: string }[]).map((c) => c.network as import("@prisma/client").Network),
  };
}
