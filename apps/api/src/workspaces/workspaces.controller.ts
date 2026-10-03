import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common"

import { CurrentUser } from "../auth/current-user.decorator.js"
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js"
import type { AuthenticatedUser } from "../auth/jwt-auth.guard.js"
import { ZodValidationPipe } from "../common/zod-validation.pipe.js"
import { AdminGuard, MembershipGuard } from "./membership.guard.js"
import type { Membership } from "./membership.guard.js"
import { CurrentMembership } from "./current-membership.decorator.js"
import { WorkspacesService } from "./workspaces.service.js"
import {
  createWorkspaceSchema,
  inviteMemberSchema,
  switchWorkspaceSchema,
  updateMemberRoleSchema,
  updateWorkspaceSchema,
} from "./workspaces.validation.js"

@UseGuards(JwtAuthGuard)
@Controller("workspaces")
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaces.listForUser(user.id)
  }

  @Get("current")
  current(@CurrentUser() user: AuthenticatedUser, @Query("preferred") preferred?: string) {
    return this.workspaces.resolveCurrent(user.id, user.email, preferred)
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createWorkspaceSchema)) body: { name: string }
  ) {
    return this.workspaces.create(body.name, user.id)
  }

  @UseGuards(MembershipGuard, AdminGuard)
  @Patch(":workspaceId")
  update(
    @Param("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(updateWorkspaceSchema)) body: ReturnType<typeof updateWorkspaceSchema.parse>
  ) {
    return this.workspaces.update(workspaceId, body)
  }

  @UseGuards(MembershipGuard)
  @Delete(":workspaceId")
  delete(@Param("workspaceId") workspaceId: string, @CurrentMembership() membership: Membership) {
    if (membership.role !== "owner") {
      throw new ForbiddenException("Only the workspace owner can delete it.")
    }
    return this.workspaces.delete(workspaceId, membership.userId)
  }

  @UseGuards(MembershipGuard)
  @Post("switch")
  switch(@Body(new ZodValidationPipe(switchWorkspaceSchema)) _body: { workspaceId: string }) {
    // Membership already verified by the guard; Next.js sets the
    // active_workspace cookie itself once this returns ok.
    return { ok: true }
  }

  @UseGuards(MembershipGuard)
  @Get(":workspaceId/members")
  listMembers(@Param("workspaceId") workspaceId: string) {
    return this.workspaces.listMembers(workspaceId)
  }

  @UseGuards(MembershipGuard, AdminGuard)
  @Patch(":workspaceId/members/:userId")
  updateMemberRole(
    @Param("workspaceId") workspaceId: string,
    @Param("userId") userId: string,
    @CurrentMembership() membership: Membership,
    @Body(new ZodValidationPipe(updateMemberRoleSchema)) body: ReturnType<typeof updateMemberRoleSchema.parse>
  ) {
    return this.workspaces.updateMemberRole(workspaceId, userId, membership.role, body)
  }

  @UseGuards(MembershipGuard)
  @Delete(":workspaceId/members/:userId")
  removeMember(
    @Param("workspaceId") workspaceId: string,
    @Param("userId") userId: string,
    @CurrentMembership() membership: Membership
  ) {
    return this.workspaces.removeMember(workspaceId, userId, membership)
  }

  @UseGuards(MembershipGuard)
  @Get(":workspaceId/invitations")
  listInvitations(@Param("workspaceId") workspaceId: string) {
    return this.workspaces.listInvitations(workspaceId)
  }

  @UseGuards(MembershipGuard, AdminGuard)
  @Post(":workspaceId/invitations")
  createInvitation(
    @Param("workspaceId") workspaceId: string,
    @CurrentMembership() membership: Membership,
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: ReturnType<typeof inviteMemberSchema.parse>
  ) {
    return this.workspaces.createInvitation(workspaceId, membership.userId, body)
  }

  @UseGuards(MembershipGuard, AdminGuard)
  @Delete(":workspaceId/invitations/:invitationId")
  cancelInvitation(
    @Param("workspaceId") workspaceId: string,
    @Param("invitationId") invitationId: string
  ) {
    return this.workspaces.cancelInvitation(workspaceId, invitationId)
  }
}
