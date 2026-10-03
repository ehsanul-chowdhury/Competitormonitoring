import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.service.js"
import { ScanProducerService } from "../scan-queue/scan-producer.service.js"

const PER_PAGE_COOLDOWN_MS = 2 * 60 * 1000
const PER_WORKSPACE_HOURLY_LIMIT = 20

@Injectable()
export class ScansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly producer: ScanProducerService
  ) {}

  /** Direct port of the Next.js app's POST /api/scans/trigger: same ad-hoc
   * membership check (not the usual guard, since the route never carried a
   * workspaceId, only a tracked_page_id) and the same rate limits. The only
   * change is that the scan itself now runs through the BullMQ queue instead
   * of inline, awaited so the response contract is unchanged. */
  async trigger(userId: string, trackedPageId: string) {
    const page = await this.prisma.trackedPage.findFirst({
      where: {
        id: trackedPageId,
        workspace: { members: { some: { userId } } },
      },
      select: { id: true, workspaceId: true, isActive: true },
    })
    if (!page) throw new NotFoundException("Tracked page not found")
    if (!page.isActive) throw new BadRequestException("This page is paused")

    const [recentPageScans, recentWorkspaceScans] = await Promise.all([
      this.prisma.scan.count({
        where: {
          trackedPageId,
          startedAt: { gte: new Date(Date.now() - PER_PAGE_COOLDOWN_MS) },
        },
      }),
      this.prisma.scan.count({
        where: {
          workspaceId: page.workspaceId,
          trigger: "manual",
          startedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      }),
    ])

    if (recentPageScans > 0) {
      throw new HttpException(
        "This page was just scanned. Try again in a couple of minutes.",
        HttpStatus.TOO_MANY_REQUESTS
      )
    }
    if (recentWorkspaceScans >= PER_WORKSPACE_HOURLY_LIMIT) {
      throw new HttpException(
        "Manual scan limit reached for this workspace. Try again later.",
        HttpStatus.TOO_MANY_REQUESTS
      )
    }

    return this.producer.enqueueAndWait({ trackedPageId, trigger: "manual" })
  }
}
