import { headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowElbowDownRight, ArrowRight, Plus } from "@phosphor-icons/react/ssr"
import type { ChangePriority, PageCategory } from "@prisma/client"

import { auth } from "@/lib/auth"
import { apiFetch } from "@/lib/backend-client"
import { getCurrentWorkspace } from "@/lib/workspace"
import { formatRelativeTime, resolveDisplayName } from "@/lib/utils"
import {
  CategoryBadge,
  PriorityBadge,
} from "@/components/changes/change-badges"
import { AddCompetitorDialog } from "@/components/competitors/add-competitor-dialog"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

type DashboardSummary = {
  activeCompetitorCount: number
  urgentCount: number
  attentionChanges: {
    id: string
    summary: string
    whyItMatters: string
    recommendedAction: string
    priority: ChangePriority
    category: PageCategory
    createdAt: string
    competitor: { name: string }
  }[]
  topCompetitors: { id: string; name: string; changeCount: number }[]
}

export default async function DashboardPage() {
  const [workspace, session] = await Promise.all([
    getCurrentWorkspace(),
    auth.api.getSession({ headers: await headers() }),
  ])
  if (!workspace) {
    redirect("/onboarding")
  }

  const {
    activeCompetitorCount,
    urgentCount,
    attentionChanges: rawAttentionChanges,
    topCompetitors,
  } = await apiFetch<DashboardSummary>(
    { id: workspace.userId, email: workspace.userEmail },
    `/dashboard?workspaceId=${workspace.id}`
  )

  const attentionChanges = rawAttentionChanges.map((c) => ({
    ...c,
    createdAt: new Date(c.createdAt),
  }))

  const name = resolveDisplayName(session?.user.name, workspace.userEmail)
  const greeting = greetingForHour(new Date().getHours())

  const subtitle = !activeCompetitorCount
    ? "Add your first competitor to start tracking what changes."
    : urgentCount > 0
      ? `${urgentCount} change${urgentCount === 1 ? "" : "s"} this week need${urgentCount === 1 ? "s" : ""} a closer look.`
      : "Nothing urgent this week. Here's how your market moved."

  if (!activeCompetitorCount) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
        <div>
          <h1 className="text-xl font-semibold">
            {greeting}, {name}
          </h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Empty className="flex-1 rounded-2xl bg-card ring-1 ring-foreground/10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Plus />
            </EmptyMedia>
            <EmptyTitle>Track your first competitor</EmptyTitle>
            <EmptyDescription>
              Point IntelFlock at a public website and it will watch the pages
              that matter, from pricing to product to positioning, and tell you
              what changed.
            </EmptyDescription>
          </EmptyHeader>
          <AddCompetitorDialog workspaceId={workspace.id} />
        </Empty>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">
          {greeting}, {name}
        </h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="text-sm font-medium">Needs your attention</h2>
            <p className="text-sm text-muted-foreground">
              High-priority moves this week, newest first.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/notifications" />}
          >
            View all
            <ArrowRight />
          </Button>
        </div>

        {attentionChanges.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No high-priority changes this week.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {attentionChanges.map((change) => (
              <li key={change.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-sm font-semibold text-foreground">
                    {change.competitor.name}
                  </span>
                  <PriorityBadge priority={change.priority} />
                  <CategoryBadge category={change.category} />
                  <span className="ml-auto">{formatRelativeTime(change.createdAt)}</span>
                </div>
                <p className="text-sm font-medium">{change.summary}</p>
                <p className="text-sm text-muted-foreground">{change.whyItMatters}</p>
                <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <ArrowElbowDownRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="font-medium text-foreground">Do next: </span>
                    {change.recommendedAction}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
        <div className="flex flex-col">
          <h2 className="text-sm font-medium">Most active</h2>
          <p className="text-sm text-muted-foreground">Most changes in the last 30 days.</p>
        </div>

        {topCompetitors.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No activity in the last 30 days.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {topCompetitors.map((competitor) => (
              <li key={competitor.id}>
                <Link
                  href={`/competitors/${competitor.id}`}
                  className="flex items-center justify-between gap-3 py-3 text-sm transition-colors first:pt-0 hover:text-primary"
                >
                  <span className="truncate">{competitor.name}</span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {competitor.changeCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
