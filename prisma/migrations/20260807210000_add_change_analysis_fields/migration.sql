-- AlterTable
ALTER TABLE "change_events" ADD COLUMN     "recommended_actions" TEXT[];

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "product_profile" TEXT;
