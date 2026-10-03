import { Injectable } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.service.js"
import { scopedDb } from "../prisma/scoped-db.js"
import { Prisma } from "../../generated/prisma/index.js"
import { PAGE_CATEGORIES } from "../common/page-categories.js"
import type { PageCategory } from "../common/page-categories.js"

const PAGE_SIZE = 20
const CHANGE_PRIORITIES = ["low", "medium", "high", "critical"] as const

type ChangeRow = {
  id: string
  category: PageCategory
  priority: string
  summary: string
  whyItMatters: string
  recommendedAction: string
  recommendedActions: string[]
  aiModelUsed: string | null
  diffExcerpt: string | null
  createdAt: Date
  competitorName: string
  pageUrl: string
  pageLabel: string | null
}

export type NotificationsQuery = {
  page?: string
  competitor_id?: string
  category?: string
  priority?: string
  q?: string
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Direct port of the Next.js app's notifications page query, with the same
   * single raw-SQL join + full-text search, already well-optimized with
   * LIMIT/OFFSET pagination and a parallel count query. */
  async list(workspaceId: string, params: NotificationsQuery) {
    const competitors = await scopedDb(this.prisma, workspaceId).competitor.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })

    const page = Number(params.page ?? "0")
    const offset = page * PAGE_SIZE

    const category = PAGE_CATEGORIES.find((c) => c === params.category)
    const priority = CHANGE_PRIORITIES.find((p) => p === params.priority)

    const conditions = [Prisma.sql`ce.workspace_id = ${workspaceId}::uuid`]
    if (params.competitor_id) {
      conditions.push(Prisma.sql`ce.competitor_id = ${params.competitor_id}::uuid`)
    }
    if (category) conditions.push(Prisma.sql`ce.category = ${category}::page_category`)
    if (priority) conditions.push(Prisma.sql`ce.priority = ${priority}::change_priority`)
    if (params.q) {
      conditions.push(Prisma.sql`ce.search_vector @@ websearch_to_tsquery('english', ${params.q})`)
    }
    const whereClause = Prisma.join(conditions, " AND ")

    const [changes, countResult] = await Promise.all([
      this.prisma.$queryRaw<ChangeRow[]>`
        SELECT
          ce.id, ce.category, ce.priority, ce.summary,
          ce.why_it_matters AS "whyItMatters",
          ce.recommended_action AS "recommendedAction",
          COALESCE(ce.recommended_actions, ARRAY[]::text[]) AS "recommendedActions",
          ce.ai_model_used AS "aiModelUsed",
          ce.diff_excerpt AS "diffExcerpt",
          ce.created_at AS "createdAt",
          c.name AS "competitorName",
          tp.url AS "pageUrl",
          tp.label AS "pageLabel"
        FROM change_events ce
        JOIN competitors c ON c.id = ce.competitor_id
        JOIN tracked_pages tp ON tp.id = ce.tracked_page_id
        WHERE ${whereClause}
        ORDER BY ce.created_at DESC
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT count(*)::bigint AS count
        FROM change_events ce
        WHERE ${whereClause}
      `,
    ])
    const count = Number(countResult[0]?.count ?? 0)

    return { competitors, changes, count, page, pageSize: PAGE_SIZE }
  }

  async search(workspaceId: string, query: string) {
    if (query.trim().length < 1) return { hits: [] }

    const db = scopedDb(this.prisma, workspaceId)

    const [competitors, pages, changes] = await Promise.all([
      db.competitor.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { domain: { contains: query, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, domain: true },
        take: 5,
      }),
      db.trackedPage.findMany({
        where: {
          isRemoved: false,
          OR: [
            { label: { contains: query, mode: "insensitive" } },
            { url: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          url: true,
          label: true,
          competitorId: true,
          competitor: { select: { name: true } },
        },
        take: 5,
      }),
      db.changeEvent.findMany({
        where: { summary: { contains: query, mode: "insensitive" } },
        select: { id: true, summary: true, competitor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
    ])

    const seenChanges = new Set<string>()
    const uniqueChanges = changes
      .filter((change) => {
        const key = `${change.competitor.name}::${change.summary.toLowerCase()}`
        if (seenChanges.has(key)) return false
        seenChanges.add(key)
        return true
      })
      .slice(0, 5)

    const hits = [
      ...competitors.map((c) => ({
        id: c.id,
        type: "competitor" as const,
        title: c.name,
        subtitle: c.domain,
        href: `/competitors/${c.id}`,
      })),
      ...pages.map((p) => ({
        id: p.id,
        type: "page" as const,
        title: p.label || p.url,
        subtitle: p.competitor.name,
        href: `/competitors/${p.competitorId}`,
      })),
      ...uniqueChanges.map((c) => ({
        id: c.id,
        type: "change" as const,
        title: c.summary,
        subtitle: c.competitor.name,
        href: `/notifications?q=${encodeURIComponent(query)}`,
      })),
    ]

    return { hits }
  }
}
