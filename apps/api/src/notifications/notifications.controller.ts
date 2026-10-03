import { Controller, Get, Query, UseGuards } from "@nestjs/common"

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js"
import { MembershipGuard } from "../workspaces/membership.guard.js"
import { NotificationsService } from "./notifications.service.js"
import type { NotificationsQuery } from "./notifications.service.js"

@UseGuards(JwtAuthGuard, MembershipGuard)
@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("notifications")
  list(@Query("workspaceId") workspaceId: string, @Query() query: NotificationsQuery) {
    return this.notifications.list(workspaceId, query)
  }

  @Get("search")
  search(@Query("workspaceId") workspaceId: string, @Query("q") q = "") {
    return this.notifications.search(workspaceId, q)
  }
}
