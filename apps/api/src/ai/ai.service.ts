import { Injectable } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.service.js"
import { scopedDb } from "../prisma/scoped-db.js"
import { askDeepSeek, isDeepSeekConfigured } from "./lib/deepseek.js"
import type { ChatMessage } from "./lib/deepseek.js"

const PLACEHOLDER_REPLY =
  "I'm not connected to an AI model yet. Add a DeepSeek API key to enable real answers here."

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  private async buildSystemPrompt(workspaceId: string, workspaceName: string) {
    const db = scopedDb(this.prisma, workspaceId)

    const [competitors, recentChanges] = await Promise.all([
      db.competitor.findMany({
        select: { name: true, domain: true, isActive: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.changeEvent.findMany({
        select: {
          summary: true,
          whyItMatters: true,
          priority: true,
          category: true,
          createdAt: true,
          competitor: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
    ])

    const competitorLines = competitors.length
      ? competitors.map((c) => `- ${c.name} (${c.domain})${c.isActive ? "" : " [paused]"}`).join("\n")
      : "(no competitors tracked yet)"

    const changeLines = recentChanges.length
      ? recentChanges
          .map(
            (c) =>
              `- [${c.priority}/${c.category}] ${c.competitor.name}: ${c.summary}. ${c.whyItMatters}`
          )
          .join("\n")
      : "(no changes detected yet)"

    return `You are the IntelFlock assistant for the "${workspaceName}" workspace. Answer questions about the competitors this team tracks and the changes detected on their pages. Be concise and specific, and use only the data below. If something isn't in it, say you don't have that information yet.

Tracked competitors:
${competitorLines}

Recent changes:
${changeLines}`
  }

  async chat(workspaceId: string, messages: ChatMessage[]) {
    if (!isDeepSeekConfigured()) {
      return { reply: PLACEHOLDER_REPLY, configured: false }
    }

    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { name: true },
    })

    const systemPrompt = await this.buildSystemPrompt(workspaceId, workspace.name)
    const reply = await askDeepSeek([{ role: "system", content: systemPrompt }, ...messages])
    return { reply, configured: true }
  }
}
