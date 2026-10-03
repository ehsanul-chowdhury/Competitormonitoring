/*
  Warnings:

  - You are about to drop the column `search_vector` on the `change_events` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "idx_change_events_search";

-- AlterTable
ALTER TABLE "change_events" DROP COLUMN "search_vector";

-- AlterTable
ALTER TABLE "competitors" ADD COLUMN     "logo_color" TEXT;
