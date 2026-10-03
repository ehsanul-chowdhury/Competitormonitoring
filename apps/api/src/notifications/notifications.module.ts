import { Module } from "@nestjs/common"

import { MembershipGuard } from "../workspaces/membership.guard.js"
import { NotificationsController } from "./notifications.controller.js"
import { NotificationsService } from "./notifications.service.js"

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, MembershipGuard],
})
export class NotificationsModule {}
