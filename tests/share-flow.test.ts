// Fase 4 aceites:
// - Token DASHBOARD/POSTS armazenado como sha256; incrementa viewCount na leitura.
// - "Nunca expira" só passa com confirmaNunca=true.
// - Revogar mata o link imediatamente (revokedAt).
// - POSTS: postId fora da lista → autorizarPostNoShare devolve null.
// - DASHBOARD: postId que não é do brand OU não publicado → null.
// - serializePublicPost não expõe internalNote/actor/review.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { hashToken, novoToken } from "@/lib/token";
import {
  autorizarPostNoShare,
  registrarVisita,
  resolverShareLink,
  serializePublicPost,
} from "@/server/services/share-public";
import { CHAVES_PROIBIDAS_PUBLICAS } from "@/lib/public-shape";

let orgId = "";
let outraOrgId = "";
let userId = "";
let brandId = "";
let outroBrandId = "";
let postPub1 = "";
let postRasc = "";
let postOutro = "";

beforeAll(async () => {
  const now = Date.now();
  orgId = `t4-org-${now}`;
  outraOrgId = `t4-outra-${now}`;
  userId = `t4-user-${now}`;
  await db.organization.create({ data: { id: orgId, name: "T4", slug: `t4-${now}` } });
  await db.organization.create({ data: { id: outraOrgId, name: "T4b", slug: `t4b-${now}` } });
  await db.user.create({
    data: { id: userId, name: "T4 User", email: `t4-${now}@ex.com`, emailVerified: true },
  });
  await db.member.create({ data: { id: `m-${now}`, userId, organizationId: orgId, role: "OWNER" } });
  const b = await db.brand.create({ data: { organizationId: orgId, name: "T4 Brand", kind: "COMPANY" } });
  brandId = b.id;
  const b2 = await db.brand.create({ data: { organizationId: outraOrgId, name: "T4 Outra Brand", kind: "COMPANY" } });
  outroBrandId = b2.id;

  postPub1 = (await db.post.create({
    data: {
      organizationId: orgId, brandId, title: "Publicado 1",
      scheduledAt: new Date(Date.now() - 3 * 86400_000),
      stage: "PUBLISHED", publishedAt: new Date(Date.now() - 3 * 86400_000),
      createdById: userId,
    },
  })).id;
  postRasc = (await db.post.create({
    data: {
      organizationId: orgId, brandId, title: "Ideia",
      scheduledAt: new Date(), stage: "IDEA", createdById: userId,
    },
  })).id;
  postOutro = (await db.post.create({
    data: {
      organizationId: outraOrgId, brandId: outroBrandId, title: "Outra org",
      scheduledAt: new Date(), createdById: userId,
    },
  })).id;
});

afterAll(async () => {
  await db.organization.deleteMany({ where: { id: { in: [orgId, outraOrgId] } } });
  await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
});

describe("ShareLink DASHBOARD", () => {
  it("resolverShareLink funciona pelo token em claro", async () => {
    const token = novoToken();
    await db.shareLink.create({
      data: {
        organizationId: orgId, brandId, token: hashToken(token),
        kind: "DASHBOARD", createdById: userId,
      },
    });
    const l = await resolverShareLink(token);
    expect(l).not.toBeNull();
    expect(l!.brand.name).toBe("T4 Brand");
  });

  it("token expirado devolve null (neutro)", async () => {
    const token = novoToken();
    await db.shareLink.create({
      data: {
        organizationId: orgId, brandId, token: hashToken(token),
        kind: "DASHBOARD", createdById: userId,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    expect(await resolverShareLink(token)).toBeNull();
  });

  it("token revogado devolve null", async () => {
    const token = novoToken();
    await db.shareLink.create({
      data: {
        organizationId: orgId, brandId, token: hashToken(token),
        kind: "DASHBOARD", createdById: userId, revokedAt: new Date(),
      },
    });
    expect(await resolverShareLink(token)).toBeNull();
  });

  it("registrarVisita incrementa viewCount", async () => {
    const token = novoToken();
    const l = await db.shareLink.create({
      data: {
        organizationId: orgId, brandId, token: hashToken(token),
        kind: "DASHBOARD", createdById: userId,
      },
    });
    await registrarVisita(l.id);
    await registrarVisita(l.id);
    const r = await db.shareLink.findUnique({ where: { id: l.id } });
    expect(r!.viewCount).toBe(2);
    expect(r!.lastViewedAt).not.toBeNull();
  });

  it("autoriza post publicado do mesmo brand", async () => {
    const l = { id: "x", brandId, kind: "DASHBOARD" as const, postIds: [] };
    const ok = await autorizarPostNoShare(l, postPub1);
    expect(ok).not.toBeNull();
  });

  it("nega post não publicado (ideia) num DASHBOARD", async () => {
    const l = { id: "x", brandId, kind: "DASHBOARD" as const, postIds: [] };
    expect(await autorizarPostNoShare(l, postRasc)).toBeNull();
  });

  it("nega post de outro brand/org", async () => {
    const l = { id: "x", brandId, kind: "DASHBOARD" as const, postIds: [] };
    expect(await autorizarPostNoShare(l, postOutro)).toBeNull();
  });
});

describe("ShareLink POSTS", () => {
  it("só aceita id presente em postIds", async () => {
    const l = { id: "x", brandId, kind: "POSTS" as const, postIds: [postPub1] };
    expect(await autorizarPostNoShare(l, postPub1)).not.toBeNull();
    expect(await autorizarPostNoShare(l, postRasc)).toBeNull();
  });
});

describe("Serialização pública", () => {
  it("PublicPostView não carrega chaves proibidas (docs/08 #6)", async () => {
    const post = await db.post.findFirst({
      where: { id: postPub1 },
      include: {
        targets: { select: { network: true, caption: true, permalink: true } },
        campaign: { select: { name: true } },
        media: true,
      },
    });
    const publico = await serializePublicPost(post);
    const chaves = Object.keys(publico);
    for (const proibida of CHAVES_PROIBIDAS_PUBLICAS) {
      expect(chaves).not.toContain(proibida);
    }
    expect(chaves).toContain("title");
    expect(chaves).toContain("baseCaption");
    expect(chaves).toContain("media");
  });
});
