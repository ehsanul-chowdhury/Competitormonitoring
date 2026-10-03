import { Injectable, Logger, type OnModuleInit } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.service.js"
import { ScanProducerService } from "./scan-producer.service.js"

const BATCH_LIMIT = 25
const LOCK_KEY = 727271

/**
 * Replaces the Next.js app's lib/scan/cron-fanout.ts + scheduler.ts. Same
 * due-page query and the same Postgres advisory lock (kept as a safety net
 * if this service ever runs as more than one instance), but each due page is
 * now enqueued onto BullMQ instead of run inline with a fixed worker-pool.
 * Retries, backoff and per-page dedup (jobId = trackedPageId) come from the
 * queue itself.
 */
@Injectable()
export class ScanSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ScanSchedulerService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly producer: ScanProducerService
  ) {}

  onModuleInit() {
    const intervalMs = Number(process.env.SCAN_FANOUT_INTERVAL_MS ?? 5 * 60_000)
    setInterval(() => {
      this.tick().catch((err) => this.logger.error("scan fanout tick failed", err))
    }, intervalMs)
  }

  private async tick() {
    const [{ locked }] = await this.prisma.$queryRaw<{ locked: boolean }[]>`
      select pg_try_advisory_lock(${LOCK_KEY}) as locked
    `
    if (!locked) return

    try {
      const { due, enqueued } = await this.runFanout()
      if (due > 0) {
        this.logger.log(`scan fanout: ${due} due, ${enqueued} enqueued`)
      }
    } finally {
      await this.prisma.$queryRaw`select pg_advisory_unlock(${LOCK_KEY})`
    }
  }

  async runFanout() {
    const duePages = await this.prisma.trackedPage.findMany({
      where: {
        isActive: true,
        robotsDisallowed: false,
        nextScanAt: { lte: new Date() },
        competitor: { isActive: true },
      },
      select: { id: true },
      take: BATCH_LIMIT,
    })

    for (const page of duePages) {
      await this.producer.enqueue({ trackedPageId: page.id, trigger: "cron" })
    }

    return { due: duePages.length, enqueued: duePages.length }
  }
}
