-- CreateEnum
CREATE TYPE "invitation_status" AS ENUM ('pending', 'accepted', 'rejected', 'canceled');

-- CreateTable
CREATE TABLE "workspace_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "workspace_role" NOT NULL DEFAULT 'member',
    "status" "invitation_status" NOT NULL DEFAULT 'pending',
    "invited_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_workspace_invitations_workspace" ON "workspace_invitations"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_workspace_invitations_email" ON "workspace_invitations"("email");

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
