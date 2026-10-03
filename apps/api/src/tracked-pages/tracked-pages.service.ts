import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common"

import { isUniqueConstraintViolation } from "../common/prisma-errors.js"
import { PrismaService } from "../prisma/prisma.service.js"
import { scopedDb } from "../prisma/scoped-db.js"
import type { Prisma } from "../../generated/prisma/index.js"
import type { BulkTrackedPagesInput, TrackedPageInput } from "./tracked-pages.validation.js"

@Injectable()
export class TrackedPagesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertCompetitorInWorkspace(workspaceId: string, competitorId: string) {
    const competitor = await scopedDb(this.prisma, workspaceId).competitor.findFirst({
      where: { id: competitorId },
      select: { id: true },
    })
    if (!competitor) throw new NotFoundException("Competitor not found")
  }

  async create(workspaceId: string, competitorId: string, input: TrackedPageInput) {
    await this.assertCompetitorInWorkspace(workspaceId, competitorId)
    try {
      return await scopedDb(this.prisma, workspaceId).trackedPage.create({
        data: {
          competitorId,
          url: input.url,
          label: input.label || null,
          category: input.category,
          scanIntervalMinutes: input.scanIntervalMinutes,
        } as Prisma.TrackedPageUncheckedCreateInput,
        select: { id: true, url: true },
      })
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException("You're already tracking that exact URL for this competitor.")
      }
      throw new InternalServerErrorException("Something went wrong.")
    }
  }

  async bulkCreate(workspaceId: string, input: BulkTrackedPagesInput) {
    await this.assertCompetitorInWorkspace(workspaceId, input.competitorId)
    const { count } = await scopedDb(this.prisma, workspaceId).trackedPage.createMany({
      data: input.pages.map((page) => ({
        competitorId: input.competitorId,
        url: page.url,
        label: page.label || null,
        category: page.category,
      })) as Prisma.TrackedPageCreateManyInput[],
      skipDuplicates: true,
    })
    return { count }
  }

  async updateActive(workspaceId: string, trackedPageId: string, isActive: boolean) {
    const { count } = await scopedDb(this.prisma, workspaceId).trackedPage.updateMany({
      where: { id: trackedPageId },
      data: { isActive },
    })
    if (count === 0) throw new NotFoundException("Tracked page not found")
    return { ok: true }
  }

  async delete(workspaceId: string, trackedPageId: string) {
    const { count } = await scopedDb(this.prisma, workspaceId).trackedPage.deleteMany({
      where: { id: trackedPageId },
    })
    if (count === 0) throw new NotFoundException("Tracked page not found")
    return { ok: true }
  }
}
