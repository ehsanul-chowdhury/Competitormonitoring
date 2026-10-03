import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common"

import { CurrentUser } from "../auth/current-user.decorator.js"
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js"
import type { AuthenticatedUser } from "../auth/jwt-auth.guard.js"
import { ZodValidationPipe } from "../common/zod-validation.pipe.js"
import { WorkspacesService } from "./workspaces.service.js"
import { respondToInvitationSchema } from "./workspaces.validation.js"

/** Invitee-side endpoints, addressed by the invitation's email rather than
 * workspace membership. Kept separate from WorkspacesController, which is
 * the inviter-side (list/create/cancel). */
@UseGuards(JwtAuthGuard)
@Controller("invitations")
export class InvitationsController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get("pending")
  pending(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaces.pendingInvitationsForEmail(user.email)
  }

  @Post(":invitationId")
  respond(
    @Param("invitationId") invitationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(respondToInvitationSchema)) body: { action: "accept" | "reject" }
  ) {
    return this.workspaces.respondToInvitation(invitationId, user.id, user.email, body.action)
  }
}
