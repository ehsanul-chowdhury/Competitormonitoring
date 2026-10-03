import { InjectQueue } from "@nestjs/bullmq"
import { Injectable } from "@nestjs/common"
import type { Queue } from "bullmq"
import { QueueEvents } from "bullmq"

import { createRedisConnection } from "../redis/redis-connection.js"
import type { ScanPageResult } from "../scan/scan.service.js"
import { SCAN_QUEUE_NAME } from "./scan-queue.types.js"
import type { ScanJobData } from "./scan-queue.types.js"

/**
 * Fronts the BullMQ "scans" queue. jobId is always the trackedPageId, so a
 * page that's already queued or running can't be double-enqueued. This is
 * the dedup fix the in-process cron-fanout never had (nothing there stopped
 * overlapping ticks from reprocessing the same page while a prior scan of it
 * was still in flight).
 */
@Injectable()
export class ScanProducerService {
  private readonly queueEvents: QueueEvents

  constructor(@InjectQueue(SCAN_QUEUE_NAME) private readonly queue: Queue<ScanJobData>) {
    this.queueEvents = new QueueEvents(SCAN_QUEUE_NAME, {
      connection: createRedisConnection(),
    })
  }

  async enqueue(data: ScanJobData) {
    return this.queue.add("scan-page", data, {
      jobId: data.trackedPageId,
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    })
  }

  /**
   * Used by the manual "Scan now" endpoint: goes through the same queue as
   * every other scan (same retry/backoff, same dedup), but the HTTP handler
   * still awaits the final ScanPageResult so the UI keeps its instant toast.
   */
  async enqueueAndWait(data: ScanJobData, timeoutMs = 30_000): Promise<ScanPageResult> {
    const job = await this.enqueue(data)
    const result = await job.waitUntilFinished(this.queueEvents, timeoutMs)
    return result as ScanPageResult
  }
}
