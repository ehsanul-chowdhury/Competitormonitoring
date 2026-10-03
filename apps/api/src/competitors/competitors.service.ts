import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"

import { isUniqueConstraintViolation } from "../common/prisma-errors.js"
import { discoverPages } from "../scan/lib/discover-pages.js"
import { PrismaService } from "../prisma/prisma.service.js"
import { scopedDb } from "../prisma/scoped-db.js"
import type { Prisma } from "../../generated/prisma/index.js"
import type { CreateCompetitorInput, UpdateCompetitorInput } from "./competitors.validation.js"

@Injectable()
export class CompetitorsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string) {
    return scopedDb(this.prisma, workspaceId).competitor.findMany({
      select: {
        id: true,
        name: true,
        domain: true,
        isActive: true,
        trackedPages: { select: { lastScannedAt: true, nextScanAt: true, isActive: true } },
        _count: { select: { trackedPages: true, changeEvents: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async detail(workspaceId: string, competitorId: string) {
    const db = scopedDb(this.prisma, workspaceId)

    const competitor = await db.competitor.findFirst({
      where: { id: competitorId },
      select: { id: true, name: true, domain: true, isActive: true },
    })
    if (!competitor) throw new NotFoundException("Competitor not found")

    const [trackedPages, changeEvents, recentScans] = await Promise.all([
      db.trackedPage.findMany({
        where: { competitorId: competitor.id },
        select: {
          id: true,
          url: true,
          label: true,
          category: true,
          isActive: true,
          isRemoved: true,
          lastScanStatus: true,
          lastScannedAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      db.changeEvent.findMany({
        where: { competitorId: competitor.id },
        select: {
          id: true,
          trackedPageId: true,
          category: true,
          priority: true,
          summary: true,
          whyItMatters: true,
          recommendedAction: true,
          diffExcerpt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.scan.findMany({
        where: { trackedPage: { competitorId: competitor.id } },
        select: {
          id: true,
          startedAt: true,
          status: true,
          trackedPage: { select: { label: true, url: true } },
          _count: { select: { changeEvents: true } },
        },
        orderBy: { startedAt: "desc" },
        take: 20,
      }),
    ])

    return { competitor, trackedPages, changeEvents, recentScans }
  }

  async create(workspaceId: string, input: CreateCompetitorInput) {
    try {
      return await scopedDb(this.prisma, workspaceId).competitor.create({
        data: { name: input.name, domain: input.domain } as Prisma.CompetitorUncheckedCreateInput,
        select: { id: true, name: true },
      })
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException("You're already tracking a competitor with that domain.")
      }
      throw error
    }
  }

  async update(workspaceId: string, competitorId: string, input: UpdateCompetitorInput) {
    const data: { name?: string; domain?: string; isActive?: boolean } = {}
    if (input.name !== undefined) data.name = input.name
    if (input.domain !== undefined) data.domain = input.domain
    if (input.isActive !== undefined) data.isActive = input.isActive

    if (Object.keys(data).length === 0) {
      throw new ConflictException("No changes provided")
    }

    try {
      const { count } = await scopedDb(this.prisma, workspaceId).competitor.updateMany({
        where: { id: competitorId },
        data,
      })
      if (count === 0) throw new NotFoundException("Competitor not found")
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException("You're already tracking a competitor with that domain.")
      }
      throw error
    }
    return { ok: true }
  }

  async delete(workspaceId: string, competitorId: string) {
    const { count } = await scopedDb(this.prisma, workspaceId).competitor.deleteMany({
      where: { id: competitorId },
    })
    if (count === 0) throw new NotFoundException("Competitor not found")
    return { ok: true }
  }

  /** Matches the original route's ad-hoc check: it never receives a
   * workspaceId at all, so authorization is "does this competitor belong to
   * a workspace the caller is a member of" rather than the usual guard. */
  async discover(userId: string, competitorId: string) {
    const competitor = await this.prisma.competitor.findFirst({
      where: { id: competitorId, workspace: { members: { some: { userId } } } },
      select: { id: true, domain: true },
    })
    if (!competitor) throw new NotFoundException("Competitor not found")

    return discoverPages(competitor.domain)
  }
}
