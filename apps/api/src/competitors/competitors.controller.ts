import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common"

import { CurrentUser } from "../auth/current-user.decorator.js"
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js"
import type { AuthenticatedUser } from "../auth/jwt-auth.guard.js"
import { ZodValidationPipe } from "../common/zod-validation.pipe.js"
import { AdminGuard, MembershipGuard } from "../workspaces/membership.guard.js"
import { CompetitorsService } from "./competitors.service.js"
import { createCompetitorSchema, updateCompetitorSchema } from "./competitors.validation.js"

// New GET endpoints (list/detail) take workspaceId as a query param. There
// was no prior API-route contract for them to match, since the Next.js app
// read them via a Server Component querying Prisma directly. Mutations keep
// workspaceId in the body, matching the original app/api routes exactly.
@UseGuards(JwtAuthGuard, MembershipGuard)
@Controller("competitors")
export class CompetitorsController {
  constructor(private readonly competitors: CompetitorsService) {}

  @Get()
  list(@Query("workspaceId") workspaceId: string) {
    return this.competitors.list(workspaceId)
  }

  @Post()
  create(
    @Body("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(createCompetitorSchema)) body: ReturnType<typeof createCompetitorSchema.parse>
  ) {
    return this.competitors.create(workspaceId, body)
  }

  @Get(":competitorId")
  detail(@Param("competitorId") competitorId: string, @Query("workspaceId") workspaceId: string) {
    return this.competitors.detail(workspaceId, competitorId)
  }

  @Patch(":competitorId")
  update(
    @Param("competitorId") competitorId: string,
    @Body("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(updateCompetitorSchema)) body: ReturnType<typeof updateCompetitorSchema.parse>
  ) {
    return this.competitors.update(workspaceId, competitorId, body)
  }

  @UseGuards(AdminGuard)
  @Delete(":competitorId")
  delete(@Param("competitorId") competitorId: string, @Body("workspaceId") workspaceId: string) {
    return this.competitors.delete(workspaceId, competitorId)
  }
}

/** Separate controller: discover has no workspaceId at all in its contract
 * (the original route authorized purely via "is this competitor's workspace
 * one the caller belongs to"), so it skips MembershipGuard entirely. */
@UseGuards(JwtAuthGuard)
@Controller("competitors")
export class CompetitorDiscoveryController {
  constructor(private readonly competitors: CompetitorsService) {}

  @Post(":competitorId/discover")
  discover(@Param("competitorId") competitorId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.competitors.discover(user.id, competitorId)
  }
}
