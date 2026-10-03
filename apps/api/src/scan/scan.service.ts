import { Injectable } from "@nestjs/common"

import { analyzeChange } from "../ai/lib/analyze-change.js"
import { PrismaService } from "../prisma/prisma.service.js"
import { buildMeaningfulDiff, diffWords, extractText, sha256 } from "./lib/extract.js"
import { isDisallowedByRobots } from "./lib/robots.js"
import { buildStoragePath, readSnapshot, writeSnapshot } from "./lib/storage.js"
import { safeFetch } from "./lib/url-safety.js"

// Direct port of the Next.js app's lib/scan/scan-page.ts, as an injectable
// Nest service instead of a module-level `prisma` singleton. Behavior is
// unchanged. See the original for the full step-by-step rationale.

const REMOVED_CONTENT_HASH = "REMOVED"

export type ScanStatus = "success" | "error" | "skipped_robots" | "skipped_no_change" | "removed"

export type ScanPageResult =
  | { status: "error"; reason?: string; error?: string; httpStatus?: number }
  | { status: "skipped_robots" }
  | { status: "removed"; httpStatus?: number }
  | { status: "skipped_no_change" }
  | { status: "success"; changeEventCreated: boolean }
  | { status: "not_found" }

@Injectable()
export class ScanService {
  constructor(private readonly prisma: PrismaService) {}

  private async finishScan(
    scanId: string,
    status: ScanStatus,
    fields: { httpStatus?: number; errorMessage?: string; durationMs?: number }
  ) {
    await this.prisma.scan.update({
      where: { id: scanId },
      data: { status, finishedAt: new Date(), ...fields },
    })
  }

  private async advanceSchedule(
    page: { id: string; scanIntervalMinutes: number },
    lastScanStatus: "ok" | "error" | "skipped_robots" | "removed"
  ) {
    const nextScanAt = new Date(Date.now() + page.scanIntervalMinutes * 60_000)
    await this.prisma.trackedPage.update({
      where: { id: page.id },
      data: { nextScanAt, lastScanStatus, lastScannedAt: new Date() },
    })
  }

  async runScanPage(
    trackedPageId: string,
    options?: { scanId?: string; trigger?: "manual" | "cron" }
  ): Promise<ScanPageResult> {
    const page = await this.prisma.trackedPage.findUnique({
      where: { id: trackedPageId },
      include: {
        competitor: { select: { name: true } },
        workspace: { select: { productProfile: true } },
      },
    })
    if (!page) return { status: "not_found" }

    let scanId: string
    if (options?.scanId) {
      scanId = options.scanId
    } else {
      const scan = await this.prisma.scan.create({
        data: {
          workspaceId: page.workspaceId,
          trackedPageId: page.id,
          trigger: options?.trigger ?? "manual",
          status: "running",
        },
      })
      scanId = scan.id
    }

    const startedAt = Date.now()

    if (!page.isActive) {
      await this.finishScan(scanId, "error", {
        errorMessage: "tracked page is inactive",
        durationMs: Date.now() - startedAt,
      })
      return { status: "error", reason: "inactive" }
    }

    try {
      if (await isDisallowedByRobots(page.url)) {
        await this.prisma.trackedPage.update({
          where: { id: page.id },
          data: { robotsDisallowed: true },
        })
        await this.advanceSchedule(page, "skipped_robots")
        await this.finishScan(scanId, "skipped_robots", { durationMs: Date.now() - startedAt })
        return { status: "skipped_robots" }
      }

      let fetchResult
      try {
        fetchResult = await safeFetch(page.url)
      } catch (err) {
        await this.advanceSchedule(page, "error")
        await this.finishScan(scanId, "error", {
          errorMessage: String(err),
          durationMs: Date.now() - startedAt,
        })
        return { status: "error", error: String(err) }
      }

      // A page that starts returning 404/410 has been taken down, which is a
      // one-time signal of its own rather than a generic fetch error.
      if (fetchResult.status === 404 || fetchResult.status === 410) {
        if (!page.isRemoved) {
          const lastSnapshot = await this.prisma.pageSnapshot.findFirst({
            where: { trackedPageId: page.id },
            orderBy: { fetchedAt: "desc" },
            select: { id: true, storagePath: true },
          })

          const previousText = await readSnapshot(lastSnapshot?.storagePath ?? null)

          const removedSnapshot = await this.prisma.pageSnapshot.create({
            data: {
              workspaceId: page.workspaceId,
              trackedPageId: page.id,
              scanId,
              contentHash: REMOVED_CONTENT_HASH,
              extractedTextLength: 0,
              storagePath: null,
            },
          })

          await this.prisma.changeEvent.create({
            data: {
              workspaceId: page.workspaceId,
              competitorId: page.competitorId,
              trackedPageId: page.id,
              scanId,
              beforeSnapshotId: lastSnapshot?.id ?? null,
              afterSnapshotId: removedSnapshot.id,
              category: page.category,
              priority: "high",
              summary: `Page removed (HTTP ${fetchResult.status}).`,
              whyItMatters:
                "This page no longer exists. That can signal a discontinued product, a pricing or plan change, or a site restructuring, so it is worth checking directly.",
              recommendedAction:
                "Visit the competitor's site to confirm what happened and whether the content moved elsewhere.",
              recommendedActions: [
                "Visit the competitor's site to confirm what happened and whether the content moved elsewhere.",
                "Check whether the product or plan behind this page was discontinued.",
              ],
              evidenceBefore: previousText?.slice(0, 1500) ?? null,
              evidenceAfter: "(page no longer exists)",
              aiModelUsed: "deterministic",
              aiCacheHit: false,
            },
          })

          await this.prisma.trackedPage.update({
            where: { id: page.id },
            data: { isRemoved: true },
          })
        }

        await this.advanceSchedule(page, "removed")
        await this.finishScan(scanId, "removed", {
          httpStatus: fetchResult.status,
          durationMs: Date.now() - startedAt,
        })
        return { status: "removed", httpStatus: fetchResult.status }
      }

      if (fetchResult.status < 200 || fetchResult.status >= 300) {
        await this.advanceSchedule(page, "error")
        await this.finishScan(scanId, "error", {
          httpStatus: fetchResult.status,
          errorMessage: `Unexpected HTTP status ${fetchResult.status}`,
          durationMs: Date.now() - startedAt,
        })
        return { status: "error", httpStatus: fetchResult.status }
      }

      const extracted = extractText(fetchResult.body)
      const hash = await sha256(extracted)
      const fetchedAt = new Date()
      const storagePath = buildStoragePath(page.url, fetchedAt)

      const wasRemoved = page.isRemoved
      let lastSnapshot: { id: string; contentHash: string; storagePath: string | null } | null = null
      if (!wasRemoved) {
        lastSnapshot = await this.prisma.pageSnapshot.findFirst({
          where: { trackedPageId: page.id },
          orderBy: { fetchedAt: "desc" },
          select: { id: true, contentHash: true, storagePath: true },
        })
      }

      // Hashing first means the common case, nothing changed, costs one fetch
      // and one hash with no storage write.
      if (lastSnapshot?.contentHash === hash) {
        await this.advanceSchedule(page, "ok")
        await this.finishScan(scanId, "skipped_no_change", {
          httpStatus: fetchResult.status,
          durationMs: Date.now() - startedAt,
        })
        return { status: "skipped_no_change" }
      }

      await writeSnapshot(storagePath, extracted)

      const newSnapshot = await this.prisma.pageSnapshot.create({
        data: {
          workspaceId: page.workspaceId,
          trackedPageId: page.id,
          scanId,
          contentHash: hash,
          extractedTextLength: extracted.length,
          storagePath,
          fetchedAt,
        },
      })

      let createdChangeEvent = false

      if (wasRemoved) {
        // The page is back, which is the signal for this scan on its own. The
        // previous snapshot is the "removed" sentinel, so there is nothing to
        // diff against and the whole page would otherwise read as one change.
        const removedSnapshot = await this.prisma.pageSnapshot.findFirst({
          where: { trackedPageId: page.id, contentHash: REMOVED_CONTENT_HASH },
          orderBy: { fetchedAt: "desc" },
          select: { id: true },
        })

        await this.prisma.changeEvent.create({
          data: {
            workspaceId: page.workspaceId,
            competitorId: page.competitorId,
            trackedPageId: page.id,
            scanId,
            beforeSnapshotId: removedSnapshot?.id ?? null,
            afterSnapshotId: newSnapshot.id,
            category: page.category,
            priority: "medium",
            summary: "Page is back online after being removed.",
            whyItMatters:
              "This page was previously taken down and has now returned. Check whether the content changed while it was gone.",
            recommendedAction: "Review the current page content.",
            recommendedActions: [
              "Review the current page content.",
              "Compare it against what the page said before it went down.",
            ],
            evidenceBefore: "(page was previously removed)",
            evidenceAfter: extracted.slice(0, 1500),
            aiModelUsed: "deterministic",
            aiCacheHit: false,
          },
        })
        createdChangeEvent = true

        await this.prisma.trackedPage.update({
          where: { id: page.id },
          data: { isRemoved: false },
        })
      } else if (lastSnapshot) {
        const previousText = await readSnapshot(lastSnapshot.storagePath)
        if (previousText !== null) {
          const ops = diffWords(previousText, extracted)
          const meaningful = buildMeaningfulDiff(ops)

          if (meaningful) {
            const analysis = await analyzeChange({
              competitorName: page.competitor.name,
              pageUrl: page.url,
              pageLabel: page.label,
              category: page.category,
              diffExcerpt: meaningful.excerpt,
              productProfile: page.workspace.productProfile,
            })

            await this.prisma.changeEvent.create({
              data: {
                workspaceId: page.workspaceId,
                competitorId: page.competitorId,
                trackedPageId: page.id,
                scanId,
                beforeSnapshotId: lastSnapshot.id,
                afterSnapshotId: newSnapshot.id,
                category: page.category,
                priority: analysis.priority,
                summary: analysis.summary,
                whyItMatters: analysis.whyItMatters,
                // Singular column stays populated for older readers; the list is
                // what the UI renders.
                recommendedAction: analysis.recommendedActions[0],
                recommendedActions: analysis.recommendedActions,
                evidenceBefore: meaningful.before,
                evidenceAfter: meaningful.after,
                diffExcerpt: meaningful.excerpt,
                aiModelUsed: analysis.modelUsed,
                aiCacheHit: false,
              },
            })
            createdChangeEvent = true
          }
        }
      }

      await this.advanceSchedule(page, "ok")
      await this.finishScan(scanId, "success", {
        httpStatus: fetchResult.status,
        durationMs: Date.now() - startedAt,
      })
      return { status: "success", changeEventCreated: createdChangeEvent }
    } catch (err) {
      await this.finishScan(scanId, "error", {
        errorMessage: String(err),
        durationMs: Date.now() - startedAt,
      })
      return { status: "error", error: String(err) }
    }
  }
}
