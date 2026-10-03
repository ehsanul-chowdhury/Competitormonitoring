import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common"
import type { Request } from "express"

import type { AuthenticatedUser } from "../auth/jwt-auth.guard.js"
import { PrismaService } from "../prisma/prisma.service.js"
import type { WorkspaceRole } from "../../generated/prisma/index.js"

export type Membership = { userId: string; role: WorkspaceRole }

type RequestWithUser = Request & { user: AuthenticatedUser; membership: Membership }

/**
 * Direct port of the Next.js app's requireMembership. Resolves workspaceId
 * from the route param, then the body, then the query string (mirroring how
 * the original API routes pulled it from whichever the endpoint used), and
 * attaches the verified { userId, role } to the request, with the same 401/404
 * behavior as before. Runs after JwtAuthGuard, which has already set
 * request.user.
 */
@Injectable()
export class MembershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>()
    if (!request.user) {
      throw new UnauthorizedException("Unauthorized")
    }

    const workspaceId =
      request.params?.workspaceId ?? request.body?.workspaceId ?? request.query?.workspaceId

    if (!workspaceId || typeof workspaceId !== "string") {
      throw new NotFoundException("Not found")
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: request.user.id } },
    })
    if (!membership) {
      throw new NotFoundException("Not found")
    }

    request.membership = { userId: request.user.id, role: membership.role }
    return true
  }
}

export function isAdmin(role: WorkspaceRole) {
  return role === "owner" || role === "admin"
}

/** Must run after MembershipGuard. Mirrors the 403 the API routes returned
 * for owner/admin-only actions. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>()
    if (!isAdmin(request.membership.role)) {
      throw new ForbiddenException("Only workspace owners and admins can do this.")
    }
    return true
  }
}
