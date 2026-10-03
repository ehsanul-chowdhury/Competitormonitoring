import { Module } from "@nestjs/common"

import { AdminGuard, MembershipGuard } from "../workspaces/membership.guard.js"
import { CompetitorDiscoveryController, CompetitorsController } from "./competitors.controller.js"
import { CompetitorsService } from "./competitors.service.js"

@Module({
  controllers: [CompetitorsController, CompetitorDiscoveryController],
  providers: [CompetitorsService, MembershipGuard, AdminGuard],
  exports: [CompetitorsService],
})
export class CompetitorsModule {}
