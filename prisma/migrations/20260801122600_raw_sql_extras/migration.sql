-- Partial index: Prisma's schema DSL can't express a WHERE clause on an
-- index, so it created a full index above. Replace it with the intended
-- partial one (only rows actually due for a scan).
DROP INDEX "idx_tracked_pages_due";
CREATE INDEX "idx_tracked_pages_due" ON "tracked_pages" ("next_scan_at")
  WHERE "is_active" AND NOT "robots_disallowed";

-- Generated full-text search column: Prisma has no generated-column type,
-- so this is added and queried entirely outside the Prisma Client API.
ALTER TABLE "change_events"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', "summary" || ' ' || "why_it_matters")) STORED;

CREATE INDEX "idx_change_events_search" ON "change_events" USING gin ("search_vector");
