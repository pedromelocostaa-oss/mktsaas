# Pauta — Backlog

Prioridades: **P0** trava lançamento · **P1** trava usuário real · **P2** trava cobrar · **P3** polimento.
Tamanhos: **S** ≤ 1h · **M** 1-4h · **L** > 4h (código).

---

## Grupo 1 — Painel de Administrador

- [ ] **1.1** `User.isSuperAdmin` + `/admin` protegido — P1, S
- [ ] **1.2** Overview: herói + gráficos + funil + saúde — P1, M — dep 1.1
- [ ] **1.3** Lista + detalhe de Orgs — P1, M — dep 1.1
- [ ] **1.4** Lista + detalhe de Users — P1, S — dep 1.1
- [ ] **1.5** Stream de Atividade (AuditLog) — P2, S — dep 1.1
- [ ] **1.6** Saúde: crons, R2, DB, conexões — P2, S — dep 1.1
- [ ] **1.7** Página de Melhorias no admin — P2, S — dep 1.1 + Grupo 4

## Grupo 2 — Comunicações (e-mails)

- [ ] **2.1** Boas-vindas — pós-cadastro — P1, S
- [ ] **2.2** Verificar e-mail — cadastro — P1, S
- [ ] **2.3** Esqueci senha — template real (BA hoje só loga) — P1, S
- [x] **2.4** Pedido de aprovação — ✅
- [ ] **2.5** Aprovado — aprovador respondeu OK — P2, S
- [ ] **2.6** Ajuste pedido — aprovador respondeu ajuste — P2, S
- [x] **2.7** Lembrete aprovador — ✅ cron + template
- [x] **2.8** Conexão vencendo — ✅
- [ ] **2.9** Véspera de publicação — cron diário -1d — P2, S
- [ ] **2.10** Convite de equipe — depende da feature Team — P2, S
- [ ] **2.11** Melhoria no ar — depende de Grupo 4 — P2, S
- [ ] **2.12** Falha de pagamento — depende de Fase 8 — P2, S
- [ ] **2.13** SPF + DKIM + DMARC no domínio — P1, S (config DNS)

## Grupo 3 — Notificações in-app

- [ ] **3.1** Model `Notification` + service + hook + bell UI — P1, M
- [ ] **3.2** Aprovado / ajuste pedido — P1, S
- [ ] **3.3** Coleta de métricas completa — P2, S
- [ ] **3.4** Link compartilhado aberto pela 1ª vez — P2, S
- [ ] **3.5** Post publicado com sucesso — P2, S
- [ ] **3.6** Conexão vai vencer (espelho do e-mail) — P2, S
- [ ] **3.7** Melhoria mudou de status — dep Grupo 4 — P2, S
- [ ] **3.8** Convite de equipe aceito — P3, S
- [ ] **3.9** Preferências de aviso (desligar) — P2, S

## Grupo 4 — Fase 7 (Pedir melhorias)

- [ ] **4.1** Página `/[brandId]/melhorias` (form privado + quadro público) — P1, M
- [ ] **4.2** Server actions `improvements.create`, `roadmap.vote` — P1, S
- [ ] **4.3** Admin de triagem (Improvement → RoadmapItem) — P1, S — dep 1.7

## Grupo 5 — Meta App real

- [ ] **5.1** Criar App em developers.facebook.com — P0, — (teu lado)
- [ ] **5.2** `META_APP_ID` + `META_APP_SECRET` no Vercel — P0 (teu lado)
- [ ] **5.3** Testar conexão IG em Development mode — P0
- [ ] **5.4** Submeter App Review — P2, M — dep 5.3 + Domínio + vídeo

## Grupo 6 — Polimento crítico

- [ ] **6.1** `/r/[token]` com números reais — P1, S
- [ ] **6.2** Domínio custom (`app.pauta.app`) — **P0**, S (teu lado)
- [ ] **6.3** `BETTER_AUTH_URL` + trustedOrigins pro custom domain — P0, S

## Grupo 7 — Fase 8 (Cobrança Stripe)

- [ ] **7.1** Decidir preço real — P2
- [ ] **7.2** Setup Stripe: produto, preços, webhooks — P2, S
- [ ] **7.3** Actions: assinar, cancelar, quantity=brands — P2, M
- [ ] **7.4** UI Configurações → Faturamento — P2, M
- [ ] **7.5** Webhook `/api/webhooks/stripe` — P2, S
- [ ] **7.6** Bloqueio suave em falha (preserva leitura) — P2, S

## Grupo 8 — Débitos técnicos

- [ ] **8.1** Cron 6/6h (upgrade Pro OU Inngest) — P3, S
- [ ] **8.2** "Cobrar" gera link novo real — P3, S
- [ ] **8.3** Facebook adapter próprio (Page insights) — P3, M
- [ ] **8.4** Rate-limit em `/r`, `/p` (60/min por token) — P3, S
- [ ] **8.5** Job `review.remind` automático (3d sem resposta) — P3, S
- [ ] **8.6** Job `post.reminder` (1d antes de publicar) — P3, S — **inclui 2.9**
- [ ] **8.7** Refresh proativo token Meta antes de vencer — P3, S

---

## Roadmap sugerido

**Sprint 1 — Jogável de verdade** — 6.2, 6.3, 5.1-5.3, 6.1, 1.1-1.2
**Sprint 2 — Convida amigos** — 4.1-4.3, 1.3-1.4, 2.1-2.3, 3.1
**Sprint 3 — Aprovação completa** — 2.5-2.6, 2.9, 3.2-3.5, 3.9
**Sprint 4 — Cobrança** — 7.1-7.6, 2.12
**Sprint 5 — Escala** — 5.4, 8.*
