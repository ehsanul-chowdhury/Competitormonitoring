import { Processor, WorkerHost } from "@nestjs/bullmq"
import type { Job } from "bullmq"

import { ScanService } from "../scan/scan.service.js"
import { SCAN_QUEUE_NAME } from "./scan-queue.types.js"
import type { ScanJobData } from "./scan-queue.types.js"

@Processor(SCAN_QUEUE_NAME, { concurrency: 5 })
export class ScanProcessor extends WorkerHost {
  constructor(private readonly scanService: ScanService) {
    super()
  }

  async process(job: Job<ScanJobData>) {
    const { trackedPageId, scanId, trigger } = job.data
    return this.scanService.runScanPage(trackedPageId, { scanId, trigger })
  }
}
