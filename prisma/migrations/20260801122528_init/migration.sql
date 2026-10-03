-- CreateEnum
CREATE TYPE "workspace_role" AS ENUM ('owner', 'admin', 'member');

-- CreateEnum
CREATE TYPE "page_category" AS ENUM ('pricing', 'product', 'positioning', 'other', 'homepage', 'blog', 'customer_story', 'integration');

-- CreateEnum
CREATE TYPE "scan_trigger" AS ENUM ('cron', 'manual');

-- CreateEnum
CREATE TYPE "scan_status" AS ENUM ('running', 'success', 'error', 'skipped_robots', 'skipped_no_change', 'removed');

-- CreateEnum
CREATE TYPE "change_priority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "change_feedback" AS ENUM ('useful', 'dismissed');

-- CreateEnum
CREATE TYPE "ai_task_type" AS ENUM ('noise_filter', 'categorize_priority', 'summarize');

-- CreateEnum
CREATE TYPE "delivery_status" AS ENUM ('queued', 'sent', 'failed', 'skipped_muted');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
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
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'trial',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "workspace_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "workspace_role" NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("workspace_id","user_id")
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracked_pages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "competitor_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "category" "page_category" NOT NULL DEFAULT 'other',
    "label" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "scan_interval_minutes" INTEGER NOT NULL DEFAULT 720,
    "next_scan_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_scan_status" TEXT,
    "last_scanned_at" TIMESTAMP(3),
    "robots_disallowed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_removed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tracked_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "tracked_page_id" UUID NOT NULL,
    "trigger" "scan_trigger" NOT NULL,
    "triggered_by" TEXT,
    "status" "scan_status" NOT NULL DEFAULT 'running',
    "http_status" INTEGER,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "tracked_page_id" UUID NOT NULL,
    "scan_id" UUID NOT NULL,
    "content_hash" TEXT NOT NULL,
    "extracted_text_length" INTEGER NOT NULL,
    "storage_path" TEXT,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "competitor_id" UUID NOT NULL,
    "tracked_page_id" UUID NOT NULL,
    "scan_id" UUID NOT NULL,
    "before_snapshot_id" UUID,
    "after_snapshot_id" UUID NOT NULL,
    "category" "page_category" NOT NULL,
    "priority" "change_priority" NOT NULL,
    "summary" TEXT NOT NULL,
    "why_it_matters" TEXT NOT NULL,
    "recommended_action" TEXT NOT NULL,
    "evidence_before" TEXT,
    "evidence_after" TEXT NOT NULL,
    "diff_excerpt" TEXT,
    "ai_model_used" TEXT,
    "ai_cache_hit" BOOLEAN NOT NULL DEFAULT false,
    "feedback" "change_feedback",
    "feedback_by" TEXT,
    "feedback_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_cache" (
    "content_hash" TEXT NOT NULL,
    "task_type" "ai_task_type" NOT NULL,
    "model" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hit_count" INTEGER NOT NULL DEFAULT 1,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_cache_pkey" PRIMARY KEY ("content_hash","task_type","model")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "competitor_id" UUID,
    "min_priority" "change_priority" NOT NULL DEFAULT 'medium',
    "channel" TEXT NOT NULL DEFAULT 'email',
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "change_event_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "status" "delivery_status" NOT NULL DEFAULT 'queued',
    "provider_message_id" TEXT,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "idx_workspace_members_user" ON "workspace_members"("user_id");

-- CreateIndex
CREATE INDEX "idx_competitors_workspace" ON "competitors"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_competitors_created_by" ON "competitors"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "competitors_workspace_id_domain_key" ON "competitors"("workspace_id", "domain");

-- CreateIndex
CREATE INDEX "idx_tracked_pages_workspace_competitor" ON "tracked_pages"("workspace_id", "competitor_id");

-- CreateIndex
CREATE INDEX "idx_tracked_pages_competitor" ON "tracked_pages"("competitor_id");

-- CreateIndex
CREATE INDEX "idx_tracked_pages_due" ON "tracked_pages"("next_scan_at");

-- CreateIndex
CREATE UNIQUE INDEX "tracked_pages_workspace_id_competitor_id_url_key" ON "tracked_pages"("workspace_id", "competitor_id", "url");

-- CreateIndex
CREATE INDEX "idx_scans_page_started" ON "scans"("tracked_page_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "idx_scans_workspace_started" ON "scans"("workspace_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "idx_scans_triggered_by" ON "scans"("triggered_by");

-- CreateIndex
CREATE INDEX "idx_page_snapshots_page_fetched" ON "page_snapshots"("tracked_page_id", "fetched_at" DESC);

-- CreateIndex
CREATE INDEX "idx_page_snapshots_page_hash" ON "page_snapshots"("tracked_page_id", "content_hash");

-- CreateIndex
CREATE INDEX "idx_page_snapshots_scan" ON "page_snapshots"("scan_id");

-- CreateIndex
CREATE INDEX "idx_page_snapshots_workspace" ON "page_snapshots"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_change_events_workspace_created" ON "change_events"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_change_events_competitor_created" ON "change_events"("workspace_id", "competitor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_change_events_priority" ON "change_events"("workspace_id", "priority");

-- CreateIndex
CREATE INDEX "idx_change_events_category" ON "change_events"("workspace_id", "category");

-- CreateIndex
CREATE INDEX "idx_change_events_after_snapshot" ON "change_events"("after_snapshot_id");

-- CreateIndex
CREATE INDEX "idx_change_events_before_snapshot" ON "change_events"("before_snapshot_id");

-- CreateIndex
CREATE INDEX "idx_change_events_competitor" ON "change_events"("competitor_id");

-- CreateIndex
CREATE INDEX "idx_change_events_feedback_by" ON "change_events"("feedback_by");

-- CreateIndex
CREATE INDEX "idx_change_events_scan" ON "change_events"("scan_id");

-- CreateIndex
CREATE INDEX "idx_change_events_tracked_page" ON "change_events"("tracked_page_id");

-- CreateIndex
CREATE INDEX "idx_notification_preferences_workspace_user" ON "notification_preferences"("workspace_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_notification_preferences_competitor" ON "notification_preferences"("competitor_id");

-- CreateIndex
CREATE INDEX "idx_notification_preferences_user" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_workspace_id_user_id_competitor_id_key" ON "notification_preferences"("workspace_id", "user_id", "competitor_id");

-- CreateIndex
CREATE INDEX "idx_notification_deliveries_change_event" ON "notification_deliveries"("change_event_id");

-- CreateIndex
CREATE INDEX "idx_notification_deliveries_workspace_created" ON "notification_deliveries"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notification_deliveries_user" ON "notification_deliveries"("user_id");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_pages" ADD CONSTRAINT "tracked_pages_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_pages" ADD CONSTRAINT "tracked_pages_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_tracked_page_id_fkey" FOREIGN KEY ("tracked_page_id") REFERENCES "tracked_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_snapshots" ADD CONSTRAINT "page_snapshots_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_snapshots" ADD CONSTRAINT "page_snapshots_tracked_page_id_fkey" FOREIGN KEY ("tracked_page_id") REFERENCES "tracked_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_snapshots" ADD CONSTRAINT "page_snapshots_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_tracked_page_id_fkey" FOREIGN KEY ("tracked_page_id") REFERENCES "tracked_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_before_snapshot_id_fkey" FOREIGN KEY ("before_snapshot_id") REFERENCES "page_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_after_snapshot_id_fkey" FOREIGN KEY ("after_snapshot_id") REFERENCES "page_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_feedback_by_fkey" FOREIGN KEY ("feedback_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_change_event_id_fkey" FOREIGN KEY ("change_event_id") REFERENCES "change_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
