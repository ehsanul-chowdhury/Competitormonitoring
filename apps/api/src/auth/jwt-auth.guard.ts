import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common"
import jwt from "jsonwebtoken"
import type { Request } from "express"

export type AuthenticatedUser = { id: string; email: string }

type InternalJwtPayload = { sub: string; email: string }

/**
 * Verifies the short-lived internal JWT the Next.js app mints after checking
 * the user's own Better Auth session. Nest never sees a session cookie:
 * identity arrives as a signed claim, and every route still re-checks
 * workspace membership itself (see MembershipGuard) rather than trusting
 * anything beyond { id, email } from this token.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const header = request.headers["authorization"]
    const token = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null
    if (!token) {
      throw new UnauthorizedException("Missing bearer token")
    }

    const secret = process.env.INTERNAL_API_SECRET
    if (!secret) {
      throw new Error("INTERNAL_API_SECRET is not set")
    }

    try {
      const payload = jwt.verify(token, secret) as InternalJwtPayload
      ;(request as Request & { user: AuthenticatedUser }).user = {
        id: payload.sub,
        email: payload.email,
      }
      return true
    } catch {
      throw new UnauthorizedException("Invalid or expired token")
    }
  }
}
