-- Restores the generated full-text search column that a prior migration
-- (20260801160148_add_competitor_logo_color) incorrectly dropped as drift,
-- since it is intentionally unmodeled in schema.prisma (Prisma has no
-- generated-column type) and queried entirely via $queryRaw.
ALTER TABLE "change_events"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', "summary" || ' ' || "why_it_matters")) STORED;

CREATE INDEX "idx_change_events_search" ON "change_events" USING gin ("search_vector");
