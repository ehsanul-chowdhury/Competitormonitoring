import { Controller, Get, Query, UseGuards } from "@nestjs/common"

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js"
import { MembershipGuard } from "../workspaces/membership.guard.js"
import { DashboardService } from "./dashboard.service.js"

@UseGuards(JwtAuthGuard, MembershipGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  summary(@Query("workspaceId") workspaceId: string) {
    return this.dashboard.summary(workspaceId)
  }
}
