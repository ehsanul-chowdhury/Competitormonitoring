import { Module } from "@nestjs/common"

import { AdminGuard, MembershipGuard } from "../workspaces/membership.guard.js"
import { TrackedPagesController } from "./tracked-pages.controller.js"
import { TrackedPagesService } from "./tracked-pages.service.js"

@Module({
  controllers: [TrackedPagesController],
  providers: [TrackedPagesService, MembershipGuard, AdminGuard],
  exports: [TrackedPagesService],
})
export class TrackedPagesModule {}
