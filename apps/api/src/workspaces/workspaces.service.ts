import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common"

import { isUniqueConstraintViolation } from "../common/prisma-errors.js"
import { PrismaService } from "../prisma/prisma.service.js"
import type { WorkspaceRole } from "../../generated/prisma/index.js"
import { isAdmin } from "./membership.guard.js"
import { INVITATION_TTL_DAYS, slugify } from "./workspaces.validation.js"
import type {
  InviteMemberInput,
  UpdateMemberRoleInput,
  UpdateWorkspaceInput,
} from "./workspaces.validation.js"

function randomSuffix() {
  return Math.random().toString(36).slice(2, 6)
}

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: "asc" },
    })
    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
    }))
  }

  /** Direct port of getCurrentWorkspace(): the preferred id is only a
   * preference, verified membership is the source of truth, falling back to
   * the user's oldest membership. */
  async resolveCurrent(userId: string, userEmail: string, preferredId?: string) {
    const membership =
      (preferredId
        ? await this.prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: preferredId, userId } },
            include: { workspace: true },
          })
        : null) ??
      (await this.prisma.workspaceMember.findFirst({
        where: { userId },
        include: { workspace: true },
        orderBy: { createdAt: "asc" },
      }))

    if (!membership) return null

    return {
      ...membership.workspace,
      role: membership.role,
      userId,
      userEmail,
    }
  }

  private async createWorkspace(name: string, slug: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({ data: { name, slug } })
      await tx.workspaceMember.create({
        data: { workspaceId: workspace.id, userId, role: "owner" },
      })
      return workspace
    })
  }

  async create(name: string, userId: string) {
    const baseSlug = slugify(name)
    try {
      return await this.createWorkspace(name, baseSlug, userId)
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        return await this.createWorkspace(name, `${baseSlug}-${randomSuffix()}`, userId)
      }
      throw error
    }
  }

  async update(workspaceId: string, input: UpdateWorkspaceInput) {
    const data: { name?: string; slug?: string; productProfile?: string | null } = {}
    if (input.name !== undefined) data.name = input.name
    if (input.slug !== undefined) data.slug = input.slug
    if (input.productProfile !== undefined) data.productProfile = input.productProfile || null

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("No changes provided")
    }

    try {
      await this.prisma.workspace.update({ where: { id: workspaceId }, data })
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException("That slug is already taken.")
      }
      throw error
    }
    return { ok: true }
  }

  async delete(workspaceId: string, requestingUserId: string) {
    const otherWorkspaces = await this.prisma.workspaceMember.count({
      where: { userId: requestingUserId, workspaceId: { not: workspaceId } },
    })
    if (otherWorkspaces === 0) {
      throw new BadRequestException("You can only delete this workspace if you belong to another one.")
    }
    await this.prisma.workspace.delete({ where: { id: workspaceId } })
    return { ok: true }
  }

  async listMembers(workspaceId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    })
  }

  private async wouldOrphanWorkspace(workspaceId: string, targetUserId: string) {
    const target = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      select: { role: true },
    })
    if (target?.role !== "owner") return false

    const ownerCount = await this.prisma.workspaceMember.count({
      where: { workspaceId, role: "owner" },
    })
    return ownerCount <= 1
  }

  async updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    requestingRole: WorkspaceRole,
    input: UpdateMemberRoleInput
  ) {
    if (input.role === "owner" && requestingRole !== "owner") {
      throw new BadRequestException("Only an owner can grant ownership.")
    }
    if (input.role !== "owner" && (await this.wouldOrphanWorkspace(workspaceId, targetUserId))) {
      throw new BadRequestException("Promote another owner before changing this role.")
    }

    const { count } = await this.prisma.workspaceMember.updateMany({
      where: { workspaceId, userId: targetUserId },
      data: { role: input.role },
    })
    if (count === 0) throw new NotFoundException("Member not found")
    return { ok: true }
  }

  async removeMember(workspaceId: string, targetUserId: string, requestingMembership: { userId: string; role: WorkspaceRole }) {
    const isSelf = requestingMembership.userId === targetUserId
    if (!isSelf && !isAdmin(requestingMembership.role)) {
      throw new BadRequestException("Only workspace owners and admins can remove members.")
    }
    if (await this.wouldOrphanWorkspace(workspaceId, targetUserId)) {
      throw new BadRequestException("Promote another owner before removing this member.")
    }

    const { count } = await this.prisma.workspaceMember.deleteMany({
      where: { workspaceId, userId: targetUserId },
    })
    if (count === 0) throw new NotFoundException("Member not found")
    return { ok: true }
  }

  async listInvitations(workspaceId: string) {
    return this.prisma.workspaceInvitation.findMany({
      where: { workspaceId, status: "pending", expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    })
  }

  async createInvitation(workspaceId: string, invitedBy: string, input: InviteMemberInput) {
    const existingMember = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, user: { email: input.email } },
      select: { userId: true },
    })
    if (existingMember) {
      throw new ConflictException("That person is already a member of this workspace.")
    }

    const existingInvite = await this.prisma.workspaceInvitation.findFirst({
      where: { workspaceId, email: input.email, status: "pending", expiresAt: { gt: new Date() } },
      select: { id: true },
    })
    if (existingInvite) {
      throw new ConflictException("There's already a pending invitation for that email.")
    }

    return this.prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email: input.email,
        role: input.role,
        invitedBy,
        expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
      select: { id: true, email: true, role: true },
    })
  }

  async cancelInvitation(workspaceId: string, invitationId: string) {
    const { count } = await this.prisma.workspaceInvitation.updateMany({
      where: { id: invitationId, workspaceId, status: "pending" },
      data: { status: "canceled" },
    })
    if (count === 0) throw new NotFoundException("Invitation not found")
    return { ok: true }
  }

  async pendingInvitationsForEmail(email: string) {
    return this.prisma.workspaceInvitation.findMany({
      where: { email: email.toLowerCase(), status: "pending", expiresAt: { gt: new Date() } },
      include: { workspace: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    })
  }

  async respondToInvitation(invitationId: string, userId: string, userEmail: string, action: "accept" | "reject") {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { id: invitationId },
      select: { id: true, workspaceId: true, email: true, role: true, status: true, expiresAt: true },
    })

    if (!invitation || invitation.email !== userEmail.toLowerCase()) {
      throw new NotFoundException("Invitation not found")
    }
    if (invitation.status !== "pending") {
      throw new BadRequestException("This invitation is no longer pending.")
    }
    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException("This invitation has expired.")
    }

    if (action === "reject") {
      await this.prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: "rejected" },
      })
      return { ok: true }
    }

    await this.prisma.$transaction([
      this.prisma.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
        create: { workspaceId: invitation.workspaceId, userId, role: invitation.role },
        update: {},
      }),
      this.prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      }),
    ])

    return { ok: true, workspaceId: invitation.workspaceId }
  }
}
