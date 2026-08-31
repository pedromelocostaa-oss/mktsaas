-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "pauta";

-- CreateEnum
CREATE TYPE "pauta"."Plan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "pauta"."BrandKind" AS ENUM ('COMPANY', 'PERSON');

-- CreateEnum
CREATE TYPE "pauta"."Network" AS ENUM ('INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'YOUTUBE', 'LINKEDIN', 'X');

-- CreateEnum
CREATE TYPE "pauta"."ConnStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'ERROR');

-- CreateEnum
CREATE TYPE "pauta"."Stage" AS ENUM ('IDEA', 'PRODUCTION', 'SCHEDULED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "pauta"."MetricSource" AS ENUM ('API', 'MANUAL');

-- CreateEnum
CREATE TYPE "pauta"."MediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "pauta"."ReviewState" AS ENUM ('PENDING', 'APPROVED', 'CHANGES');

-- CreateEnum
CREATE TYPE "pauta"."ShareKind" AS ENUM ('DASHBOARD', 'POSTS');

-- CreateEnum
CREATE TYPE "pauta"."Baseline" AS ENUM ('PREVIOUS', 'AVG12W', 'LAST_YEAR');

-- CreateEnum
CREATE TYPE "pauta"."RoadmapStatus" AS ENUM ('RECEIVED', 'REVIEWING', 'PLANNED', 'BUILDING', 'SHIPPED', 'WONT_DO');

-- CreateTable
CREATE TABLE "pauta"."user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "productUpdates" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "activeOrganizationId" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "plan" "pauta"."Plan" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "includedBrands" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."member" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."brand" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT,
    "kind" "pauta"."BrandKind" NOT NULL,
    "defaultApprover" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."social_connection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "network" "pauta"."Network" NOT NULL,
    "externalId" TEXT NOT NULL,
    "displayName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scopes" TEXT[],
    "status" "pauta"."ConnStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,

    CONSTRAINT "social_connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."campaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "partnerName" TEXT,
    "startsOn" TIMESTAMP(3),
    "endsOn" TIMESTAMP(3),
    "contractedPosts" INTEGER,

    CONSTRAINT "campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."post" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "campaignId" TEXT,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "stage" "pauta"."Stage" NOT NULL DEFAULT 'IDEA',
    "baseCaption" TEXT NOT NULL DEFAULT '',
    "internalNote" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."post_target" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "network" "pauta"."Network" NOT NULL,
    "caption" TEXT,
    "externalId" TEXT,
    "permalink" TEXT,
    "metricSource" "pauta"."MetricSource" NOT NULL DEFAULT 'API',

    CONSTRAINT "post_target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."post_media" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "kind" "pauta"."MediaKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "thumbnailKey" TEXT,
    "altText" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "post_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."post_collaborator" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "post_collaborator_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateTable
CREATE TABLE "pauta"."review" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "state" "pauta"."ReviewState" NOT NULL DEFAULT 'PENDING',
    "approverName" TEXT NOT NULL,
    "approverEmail" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "note" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "remindedAt" TIMESTAMP(3),

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."brand_daily_metric" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "network" "pauta"."Network" NOT NULL,
    "date" DATE NOT NULL,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "engagement" INTEGER NOT NULL DEFAULT 0,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "followersDelta" INTEGER NOT NULL DEFAULT 0,
    "source" "pauta"."MetricSource" NOT NULL DEFAULT 'API',

    CONSTRAINT "brand_daily_metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."post_metric_snapshot" (
    "id" TEXT NOT NULL,
    "postTargetId" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reach" INTEGER,
    "views" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "saves" INTEGER,
    "raw" JSONB,
    "source" "pauta"."MetricSource" NOT NULL DEFAULT 'API',

    CONSTRAINT "post_metric_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."share_link" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "kind" "pauta"."ShareKind" NOT NULL,
    "postIds" TEXT[],
    "baseline" "pauta"."Baseline" NOT NULL DEFAULT 'PREVIOUS',
    "rangeDays" INTEGER NOT NULL DEFAULT 30,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."improvement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "screen" TEXT,
    "context" JSONB,
    "roadmapItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "improvement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."roadmap_item" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" "pauta"."RoadmapStatus" NOT NULL DEFAULT 'RECEIVED',
    "teamNote" TEXT,
    "shippedAt" TIMESTAMP(3),
    "shippedNote" TEXT,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."roadmap_vote" (
    "roadmapItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roadmap_vote_pkey" PRIMARY KEY ("roadmapItemId","userId")
);

-- CreateTable
CREATE TABLE "pauta"."roadmap_update" (
    "id" TEXT NOT NULL,
    "roadmapItemId" TEXT NOT NULL,
    "status" "pauta"."RoadmapStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roadmap_update_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta"."audit_log" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "pauta"."user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "pauta"."session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "pauta"."account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "pauta"."organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organization_stripeCustomerId_key" ON "pauta"."organization"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_stripeSubscriptionId_key" ON "pauta"."organization"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "member_organizationId_idx" ON "pauta"."member"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "member_userId_organizationId_key" ON "pauta"."member"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "invitation_organizationId_idx" ON "pauta"."invitation"("organizationId");

-- CreateIndex
CREATE INDEX "invitation_email_idx" ON "pauta"."invitation"("email");

-- CreateIndex
CREATE INDEX "brand_organizationId_archivedAt_idx" ON "pauta"."brand"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "social_connection_expiresAt_idx" ON "pauta"."social_connection"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "social_connection_brandId_network_key" ON "pauta"."social_connection"("brandId", "network");

-- CreateIndex
CREATE INDEX "post_brandId_scheduledAt_idx" ON "pauta"."post"("brandId", "scheduledAt");

-- CreateIndex
CREATE INDEX "post_organizationId_stage_idx" ON "pauta"."post"("organizationId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "post_target_postId_network_key" ON "pauta"."post_target"("postId", "network");

-- CreateIndex
CREATE INDEX "post_media_postId_position_idx" ON "pauta"."post_media"("postId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "review_postId_key" ON "pauta"."review"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "review_token_key" ON "pauta"."review"("token");

-- CreateIndex
CREATE INDEX "brand_daily_metric_brandId_date_idx" ON "pauta"."brand_daily_metric"("brandId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "brand_daily_metric_brandId_network_date_key" ON "pauta"."brand_daily_metric"("brandId", "network", "date");

-- CreateIndex
CREATE INDEX "post_metric_snapshot_postTargetId_collectedAt_idx" ON "pauta"."post_metric_snapshot"("postTargetId", "collectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "share_link_token_key" ON "pauta"."share_link"("token");

-- CreateIndex
CREATE INDEX "share_link_brandId_revokedAt_idx" ON "pauta"."share_link"("brandId", "revokedAt");

-- CreateIndex
CREATE INDEX "improvement_authorId_createdAt_idx" ON "pauta"."improvement"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "improvement_roadmapItemId_idx" ON "pauta"."improvement"("roadmapItemId");

-- CreateIndex
CREATE INDEX "roadmap_item_status_voteCount_idx" ON "pauta"."roadmap_item"("status", "voteCount");

-- CreateIndex
CREATE INDEX "audit_log_organizationId_createdAt_idx" ON "pauta"."audit_log"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "pauta"."session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "pauta"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "pauta"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "pauta"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "pauta"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "pauta"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "pauta"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."brand" ADD CONSTRAINT "brand_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "pauta"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."social_connection" ADD CONSTRAINT "social_connection_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "pauta"."brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."campaign" ADD CONSTRAINT "campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "pauta"."brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."post" ADD CONSTRAINT "post_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "pauta"."brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."post" ADD CONSTRAINT "post_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "pauta"."campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."post_target" ADD CONSTRAINT "post_target_postId_fkey" FOREIGN KEY ("postId") REFERENCES "pauta"."post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."post_media" ADD CONSTRAINT "post_media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "pauta"."post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."post_collaborator" ADD CONSTRAINT "post_collaborator_postId_fkey" FOREIGN KEY ("postId") REFERENCES "pauta"."post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."post_collaborator" ADD CONSTRAINT "post_collaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "pauta"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."review" ADD CONSTRAINT "review_postId_fkey" FOREIGN KEY ("postId") REFERENCES "pauta"."post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."brand_daily_metric" ADD CONSTRAINT "brand_daily_metric_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "pauta"."brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."post_metric_snapshot" ADD CONSTRAINT "post_metric_snapshot_postTargetId_fkey" FOREIGN KEY ("postTargetId") REFERENCES "pauta"."post_target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."share_link" ADD CONSTRAINT "share_link_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "pauta"."brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."improvement" ADD CONSTRAINT "improvement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "pauta"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."improvement" ADD CONSTRAINT "improvement_roadmapItemId_fkey" FOREIGN KEY ("roadmapItemId") REFERENCES "pauta"."roadmap_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."roadmap_vote" ADD CONSTRAINT "roadmap_vote_roadmapItemId_fkey" FOREIGN KEY ("roadmapItemId") REFERENCES "pauta"."roadmap_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."roadmap_vote" ADD CONSTRAINT "roadmap_vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "pauta"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta"."roadmap_update" ADD CONSTRAINT "roadmap_update_roadmapItemId_fkey" FOREIGN KEY ("roadmapItemId") REFERENCES "pauta"."roadmap_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

