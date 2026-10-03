import { BullModule } from "@nestjs/bullmq"
import { Module } from "@nestjs/common"

import { ScanModule } from "../scan/scan.module.js"
import { ScanProcessor } from "./scan.processor.js"
import { ScanProducerService } from "./scan-producer.service.js"
import { ScanSchedulerService } from "./scan-scheduler.service.js"
import { SCAN_QUEUE_NAME } from "./scan-queue.types.js"

@Module({
  imports: [BullModule.registerQueue({ name: SCAN_QUEUE_NAME }), ScanModule],
  providers: [ScanProducerService, ScanProcessor, ScanSchedulerService],
  exports: [ScanProducerService],
})
export class ScanQueueModule {}
