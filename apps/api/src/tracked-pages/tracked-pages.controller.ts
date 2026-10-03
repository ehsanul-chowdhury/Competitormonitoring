import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from "@nestjs/common"

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js"
import { ZodValidationPipe } from "../common/zod-validation.pipe.js"
import { AdminGuard, MembershipGuard } from "../workspaces/membership.guard.js"
import { TrackedPagesService } from "./tracked-pages.service.js"
import {
  bulkTrackedPagesSchema,
  trackedPageSchema,
  updateTrackedPageSchema,
} from "./tracked-pages.validation.js"

@UseGuards(JwtAuthGuard, MembershipGuard)
@Controller("tracked-pages")
export class TrackedPagesController {
  constructor(private readonly trackedPages: TrackedPagesService) {}

  @Post()
  create(
    @Body("workspaceId") workspaceId: string,
    @Body("competitorId") competitorId: string,
    @Body(new ZodValidationPipe(trackedPageSchema)) body: ReturnType<typeof trackedPageSchema.parse>
  ) {
    return this.trackedPages.create(workspaceId, competitorId, body)
  }

  @Post("bulk")
  bulkCreate(
    @Body("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(bulkTrackedPagesSchema)) body: ReturnType<typeof bulkTrackedPagesSchema.parse>
  ) {
    return this.trackedPages.bulkCreate(workspaceId, body)
  }

  @Patch(":trackedPageId")
  updateActive(
    @Param("trackedPageId") trackedPageId: string,
    @Body("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(updateTrackedPageSchema)) body: { isActive: boolean }
  ) {
    return this.trackedPages.updateActive(workspaceId, trackedPageId, body.isActive)
  }

  @UseGuards(AdminGuard)
  @Delete(":trackedPageId")
  delete(@Param("trackedPageId") trackedPageId: string, @Body("workspaceId") workspaceId: string) {
    return this.trackedPages.delete(workspaceId, trackedPageId)
  }
}
