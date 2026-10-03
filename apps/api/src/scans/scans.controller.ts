import { Body, Controller, Post, UseGuards } from "@nestjs/common"

import { CurrentUser } from "../auth/current-user.decorator.js"
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js"
import type { AuthenticatedUser } from "../auth/jwt-auth.guard.js"
import { ZodValidationPipe } from "../common/zod-validation.pipe.js"
import { ScansService } from "./scans.service.js"
import { triggerScanSchema } from "./scans.validation.js"

@UseGuards(JwtAuthGuard)
@Controller("scans")
export class ScansController {
  constructor(private readonly scans: ScansService) {}

  @Post("trigger")
  trigger(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(triggerScanSchema)) body: { tracked_page_id: string }
  ) {
    return this.scans.trigger(user.id, body.tracked_page_id)
  }
}
