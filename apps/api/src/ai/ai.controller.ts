import { BadGatewayException, Body, Controller, Post, UseGuards } from "@nestjs/common"

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js"
import { ZodValidationPipe } from "../common/zod-validation.pipe.js"
import { MembershipGuard } from "../workspaces/membership.guard.js"
import { AiService } from "./ai.service.js"
import { chatBodySchema } from "./ai.validation.js"
import type { ChatMessage } from "./lib/deepseek.js"

@UseGuards(JwtAuthGuard, MembershipGuard)
@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("chat")
  async chat(
    @Body("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(chatBodySchema)) body: { messages: ChatMessage[] }
  ) {
    try {
      return await this.ai.chat(workspaceId, body.messages)
    } catch {
      throw new BadGatewayException("The AI assistant couldn't respond. Try again in a moment.")
    }
  }
}
