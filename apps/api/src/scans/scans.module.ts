import { Module } from "@nestjs/common"

import { ScanQueueModule } from "../scan-queue/scan-queue.module.js"
import { ScansController } from "./scans.controller.js"
import { ScansService } from "./scans.service.js"

@Module({
  imports: [ScanQueueModule],
  controllers: [ScansController],
  providers: [ScansService],
})
export class ScansModule {}
