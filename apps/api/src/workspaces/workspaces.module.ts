import { Module } from "@nestjs/common"

import { InvitationsController } from "./invitations.controller.js"
import { MembershipGuard, AdminGuard } from "./membership.guard.js"
import { WorkspacesController } from "./workspaces.controller.js"
import { WorkspacesService } from "./workspaces.service.js"

@Module({
  controllers: [WorkspacesController, InvitationsController],
  providers: [WorkspacesService, MembershipGuard, AdminGuard],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
