import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ClockCounterClockwise, Link as LinkIcon } from "@phosphor-icons/react/ssr"
import type { ChangePriority, PageCategory, ScanStatus } from "@prisma/client"

import { apiFetch, ApiError } from "@/lib/backend-client"
import { getCurrentWorkspace } from "@/lib/workspace"
import { AddTrackedPageDialog } from "@/components/competitors/add-tracked-page-dialog"
import { CompetitorSettingsPanel } from "@/components/competitors/competitor-settings-panel"
import { DiscoverPagesDialog } from "@/components/competitors/discover-pages-dialog"
import { PageWatchlist } from "@/components/competitors/page-watchlist"
import { ScanHistory } from "@/components/competitors/scan-history"
import {
  CategoryBadge,
  PriorityBadge,
} from "@/components/changes/change-badges"
import { DiffViewer } from "@/components/changes/diff-viewer"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function CompetitorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const workspace = await getCurrentWorkspace()
  if (!workspace) {
    redirect("/onboarding")
  }

  type DetailResponse = {
    competitor: { id: string; name: string; domain: string; isActive: boolean }
    trackedPages: {
      id: string
      url: string
      label: string | null
      category: PageCategory
      isActive: boolean
      isRemoved: boolean
      lastScanStatus: string | null
      lastScannedAt: string | null
    }[]
    changeEvents: {
      id: string
      trackedPageId: string
      category: PageCategory
      priority: ChangePriority
      summary: string
      whyItMatters: string
      recommendedAction: string
      diffExcerpt: string | null
      createdAt: string
    }[]
    recentScans: {
      id: string
      startedAt: string
      status: ScanStatus
      trackedPage: { label: string | null; url: string }
      _count: { changeEvents: number }
    }[]
  }

  let detail: DetailResponse
  try {
    detail = await apiFetch<DetailResponse>(
      { id: workspace.userId, email: workspace.userEmail },
      `/competitors/${id}?workspaceId=${workspace.id}`
    )
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound()
    }
    throw error
  }

  const { competitor } = detail
  const trackedPages = detail.trackedPages.map((p) => ({
    ...p,
    lastScannedAt: p.lastScannedAt ? new Date(p.lastScannedAt) : null,
  }))
  const changeEvents = detail.changeEvents.map((c) => ({ ...c, createdAt: new Date(c.createdAt) }))
  const recentScans = detail.recentScans.map((s) => ({ ...s, startedAt: new Date(s.startedAt) }))

  const scanHistory = recentScans.map((scan) => ({
    id: scan.id,
    startedAt: scan.startedAt,
    status: scan.status,
    pageLabel: scan.trackedPage.label || scan.trackedPage.url,
    changeCount: scan._count.changeEvents,
  }))

  const pagesById = new Map(trackedPages.map((page) => [page.id, page]))

  // Most recent change per page, taken from the already-fetched feed. A page
  // counts as "changed" only when its last scan surfaced something, not when it
  // changed at any point in its history.
  const latestChangeAtByPage = new Map<string, Date>()
  for (const change of changeEvents) {
    if (!latestChangeAtByPage.has(change.trackedPageId)) {
      latestChangeAtByPage.set(change.trackedPageId, change.createdAt)
    }
  }

  const watchlistPages = trackedPages.map((page) => {
    const latestChangeAt = latestChangeAtByPage.get(page.id)
    const changedAtLastScan =
      !!latestChangeAt &&
      !!page.lastScannedAt &&
      latestChangeAt.getTime() >= page.lastScannedAt.getTime() - 2 * 60_000

    const status: "removed" | "ignored" | "changed" | "watching" = page.isRemoved
      ? "removed"
      : !page.isActive
        ? "ignored"
        : changedAtLastScan
          ? "changed"
          : "watching"

    return { ...page, status }
  })

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium">{competitor.name}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/competitors" className="hover:underline">
              {workspace.name}
            </Link>{" "}
            / {competitor.domain}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DiscoverPagesDialog
            competitorId={competitor.id}
            workspaceId={workspace.id}
          />
          <AddTrackedPageDialog
            competitorId={competitor.id}
            workspaceId={workspace.id}
          />
        </div>
      </header>

      <Tabs defaultValue="timeline">
        <TabsList className="rounded-full">
          <TabsTrigger value="timeline" className="rounded-full">
            Timeline
          </TabsTrigger>
          <TabsTrigger value="pages" className="rounded-full">
            Pages
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-full">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          {!changeEvents?.length ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClockCounterClockwise />
                </EmptyMedia>
                <EmptyTitle>No changes yet</EmptyTitle>
                <EmptyDescription>
                  Once {competitor.name}&apos;s tracked pages are scanned,
                  meaningful changes will show up here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-3">
              {changeEvents.map((change) => {
                const page = pagesById.get(change.trackedPageId)
                return (
                <div
                  key={change.id}
                  className="flex flex-col gap-2 rounded-2xl bg-card p-6 ring-1 ring-foreground/10"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{change.createdAt.toLocaleString()}</span>
                    <PriorityBadge priority={change.priority} />
                    <CategoryBadge category={change.category} />
                  </div>
                  {page && (
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      <LinkIcon className="size-3" />
                      {page.label || page.url}
                    </a>
                  )}
                  <p className="text-sm font-medium">{change.summary}</p>
                  <p className="text-sm text-muted-foreground">
                    {change.whyItMatters}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Recommended:{" "}
                    </span>
                    {change.recommendedAction}
                  </p>
                  <DiffViewer diffExcerpt={change.diffExcerpt} />
                </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pages" className="mt-4">
          {!trackedPages?.length ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <LinkIcon />
                </EmptyMedia>
                <EmptyTitle>No pages tracked yet</EmptyTitle>
                <EmptyDescription>
                  Add {competitor.name}&apos;s pricing, product, or landing
                  pages to start catching what changes, or use
                  &quot;Discover pages&quot; to find them automatically.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-6">
              <PageWatchlist
                workspaceId={workspace.id}
                competitorName={competitor.name}
                pages={watchlistPages}
              />
              <ScanHistory scans={scanHistory} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <CompetitorSettingsPanel
            workspaceId={workspace.id}
            competitorId={competitor.id}
            name={competitor.name}
            domain={competitor.domain}
            isActive={competitor.isActive}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
