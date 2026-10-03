import { Module } from "@nestjs/common"

import { MembershipGuard } from "../workspaces/membership.guard.js"
import { AiController } from "./ai.controller.js"
import { AiService } from "./ai.service.js"

@Module({
  controllers: [AiController],
  providers: [AiService, MembershipGuard],
})
export class AiModule {}
