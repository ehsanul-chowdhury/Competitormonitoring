import { Injectable } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.service.js"
import { scopedDb } from "../prisma/scoped-db.js"

function daysAgo(count: number) {
  return new Date(Date.now() - count * 24 * 60 * 60 * 1000)
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(workspaceId: string) {
    const db = scopedDb(this.prisma, workspaceId)

    const weekAgo = daysAgo(7)
    const monthAgo = daysAgo(30)

    const [activeCompetitorCount, urgentCount, attentionChanges, topCompetitors] =
      await Promise.all([
        db.competitor.count({ where: { isActive: true } }),
        db.changeEvent.count({
          where: { priority: { in: ["high", "critical"] }, createdAt: { gte: weekAgo } },
        }),
        // Scoped to the same 7-day window as urgentCount above, so the number
        // in the subtitle and the list underneath always tell the same story.
        db.changeEvent.findMany({
          where: { priority: { in: ["high", "critical"] }, createdAt: { gte: weekAgo } },
          select: {
            id: true,
            summary: true,
            whyItMatters: true,
            recommendedAction: true,
            priority: true,
            category: true,
            createdAt: true,
            competitor: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        // Ranked by changes in the last 30 days rather than lifetime total, so
        // a competitor tracked for months doesn't stay "most active" forever
        // on the strength of changes that happened long ago.
        db.changeEvent.groupBy({
          by: ["competitorId"],
          where: { createdAt: { gte: monthAgo } },
          _count: { competitorId: true },
          orderBy: { _count: { competitorId: "desc" } },
          take: 5,
        }),
      ])

    const activeCompetitorsById = new Map(
      (
        await db.competitor.findMany({
          where: {
            isActive: true,
            id: { in: topCompetitors.map((row) => row.competitorId) },
          },
          select: { id: true, name: true },
        })
      ).map((competitor) => [competitor.id, competitor.name])
    )

    const mostActive = topCompetitors
      .filter((row) => activeCompetitorsById.has(row.competitorId))
      .map((row) => ({
        id: row.competitorId,
        name: activeCompetitorsById.get(row.competitorId)!,
        changeCount: row._count.competitorId,
      }))

    return {
      activeCompetitorCount,
      urgentCount,
      attentionChanges,
      topCompetitors: mostActive,
    }
  }
}
