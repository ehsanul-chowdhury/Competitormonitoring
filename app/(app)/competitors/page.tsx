import Link from "next/link"
import { redirect } from "next/navigation"
import { Buildings, Link as LinkIcon, Scan } from "@phosphor-icons/react/ssr"

import { apiFetch } from "@/lib/backend-client"
import { getCurrentWorkspace } from "@/lib/workspace"
import { cn, formatCompactRelativeTime } from "@/lib/utils"
import { AddCompetitorDialog } from "@/components/competitors/add-competitor-dialog"
import { CompetitorLogo } from "@/components/competitors/competitor-logo"
import { CompetitorRowActions } from "@/components/competitors/competitor-row-actions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

function statLine(pages: { lastScannedAt: Date | null; nextScanAt: Date; isActive: boolean }[]) {
  const scannedAt = pages
    .map((p) => p.lastScannedAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0]

  const upcoming = pages
    .filter((p) => p.isActive)
    .map((p) => p.nextScanAt)
    .sort((a, b) => a.getTime() - b.getTime())[0]

  return {
    lastScan: scannedAt ? `Scanned ${formatCompactRelativeTime(scannedAt)}` : "Not scanned yet",
    nextScan: upcoming ? `next ${formatCompactRelativeTime(upcoming)}` : null,
  }
}

export default async function CompetitorsPage() {
  const workspace = await getCurrentWorkspace()
  if (!workspace) {
    redirect("/onboarding")
  }

  const rawCompetitors = await apiFetch<
    {
      id: string
      name: string
      domain: string
      isActive: boolean
      trackedPages: { lastScannedAt: string | null; nextScanAt: string; isActive: boolean }[]
      _count: { trackedPages: number; changeEvents: number }
    }[]
  >({ id: workspace.userId, email: workspace.userEmail }, `/competitors?workspaceId=${workspace.id}`)

  const competitors = rawCompetitors.map((c) => ({
    ...c,
    trackedPages: c.trackedPages.map((p) => ({
      ...p,
      lastScannedAt: p.lastScannedAt ? new Date(p.lastScannedAt) : null,
      nextScanAt: new Date(p.nextScanAt),
    })),
  }))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Competitors</h1>
          <p className="text-sm text-muted-foreground">
            Monitor public websites and track what changes.
          </p>
        </div>
        <AddCompetitorDialog workspaceId={workspace.id} />
      </header>

      {!competitors.length ? (
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Buildings />
            </EmptyMedia>
            <EmptyTitle>No competitors yet</EmptyTitle>
            <EmptyDescription>
              Add a competitor to start tracking their pricing, product, and
              landing pages.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {competitors.map((competitor) => {
            const { lastScan, nextScan } = statLine(competitor.trackedPages)
            const pageCount = competitor._count.trackedPages
            const changeCount = competitor._count.changeEvents
            return (
              <Card key={competitor.id} className="flex-row overflow-hidden py-0">
                <div className="relative hidden w-40 shrink-0 self-stretch overflow-hidden sm:block">
                  <CompetitorLogo
                    name={competitor.name}
                    domain={competitor.domain}
                    className="size-full rounded-none"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
                <div className="flex flex-1 flex-col justify-between gap-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-6">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-lg font-semibold">{competitor.name}</h2>
                        {/* The dot is the only colour on this card: live vs
                            paused is the one state worth spotting at a glance,
                            and the word carries it for anyone who can't. */}
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              competitor.isActive ? "bg-emerald-500" : "bg-muted-foreground/40"
                            )}
                          />
                          {competitor.isActive ? "Active" : "Paused"}
                        </span>
                      </div>
                      <a
                        href={`https://${competitor.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
                      >
                        <LinkIcon className="size-3.5" />
                        {competitor.domain}
                      </a>
                    </div>

                    {/* Counts read as a phrase with the scan timing beneath as
                        secondary text. Four equal-weight columns made the short
                        numbers and long time strings fight each other. */}
                    <div className="flex flex-col gap-1 sm:items-end">
                      <p className="text-sm">
                        <span className="font-semibold tabular-nums">{pageCount}</span>
                        <span className="text-muted-foreground">
                          {pageCount === 1 ? " page" : " pages"}
                        </span>
                        <span className="px-2 text-muted-foreground">·</span>
                        <span className="font-semibold tabular-nums">{changeCount}</span>
                        <span className="text-muted-foreground">
                          {changeCount === 1 ? " change" : " changes"}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lastScan}
                        {nextScan && ` · ${nextScan}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/competitors/${competitor.id}`} />}
                    >
                      <Scan />
                      Pages
                    </Button>
                    <CompetitorRowActions
                      workspaceId={workspace.id}
                      competitorId={competitor.id}
                      currentName={competitor.name}
                    />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
