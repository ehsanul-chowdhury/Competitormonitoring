import { createParamDecorator, ExecutionContext } from "@nestjs/common"
import type { Request } from "express"

import type { Membership } from "./membership.guard.js"

export const CurrentMembership = createParamDecorator((_data: unknown, ctx: ExecutionContext): Membership => {
  const request = ctx.switchToHttp().getRequest<Request & { membership: Membership }>()
  return request.membership
})
