import { BullModule } from "@nestjs/bullmq"
import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { ScheduleModule } from "@nestjs/schedule"

import { AiModule } from "./ai/ai.module.js"
import { CompetitorsModule } from "./competitors/competitors.module.js"
import { DashboardModule } from "./dashboard/dashboard.module.js"
import { NotificationsModule } from "./notifications/notifications.module.js"
import { PrismaModule } from "./prisma/prisma.module.js"
import { createRedisConnection } from "./redis/redis-connection.js"
import { ScanQueueModule } from "./scan-queue/scan-queue.module.js"
import { ScansModule } from "./scans/scans.module.js"
import { TrackedPagesModule } from "./tracked-pages/tracked-pages.module.js"
import { WorkspacesModule } from "./workspaces/workspaces.module.js"

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: createRedisConnection(),
    }),
    PrismaModule,
    WorkspacesModule,
    CompetitorsModule,
    TrackedPagesModule,
    ScanQueueModule,
    ScansModule,
    AiModule,
    NotificationsModule,
    DashboardModule,
  ],
})
export class AppModule {}
