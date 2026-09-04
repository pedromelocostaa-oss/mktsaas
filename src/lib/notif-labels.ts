// Labels e tipos das preferências de aviso. Fica em lib/ (não é "use server")
// para ser importado pelo server + client sem violar a regra do App Router.

import type { NotificationKind } from "@prisma/client";

export type CanalAviso = "approvals" | "publishing" | "shares" | "connections";

export const KIND_TO_PREF: Record<NotificationKind, CanalAviso> = {
  APPROVAL_APPROVED: "approvals",
  APPROVAL_CHANGES: "approvals",
  APPROVAL_REQUESTED: "approvals",
  POST_PUBLISHED: "publishing",
  METRICS_COLLECTED: "publishing",
  SHARE_OPENED: "shares",
  CONNECTION_EXPIRING: "connections",
  IMPROVEMENT_STATUS: "publishing",
  TEAM_ACCEPTED: "publishing",
};

export const AVISO_LABELS: Record<CanalAviso, { titulo: string; descricao: string }> = {
  approvals: {
    titulo: "Aprovações",
    descricao: "Quando alguém aprova, pede ajuste ou envia um pedido para você.",
  },
  publishing: {
    titulo: "Publicação e produção",
    descricao: "Véspera de publicação, post publicado, atualizações no quadro de melhorias.",
  },
  shares: {
    titulo: "Compartilhamento",
    descricao: "Quando um cliente abre pela primeira vez um link que você compartilhou.",
  },
  connections: {
    titulo: "Conexões de redes",
    descricao: "Aviso quando a conexão de uma rede social está prestes a expirar.",
  },
};
