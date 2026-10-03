import { Module } from "@nestjs/common"

import { MembershipGuard } from "../workspaces/membership.guard.js"
import { DashboardController } from "./dashboard.controller.js"
import { DashboardService } from "./dashboard.service.js"

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, MembershipGuard],
})
export class DashboardModule {}
