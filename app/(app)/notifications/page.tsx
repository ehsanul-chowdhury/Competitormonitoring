import Link from "next/link"
import { redirect } from "next/navigation"
import { Tray } from "@phosphor-icons/react/ssr"
import type { ChangePriority } from "@prisma/client"

import { apiFetch } from "@/lib/backend-client"
import { getCurrentWorkspace } from "@/lib/workspace"
import type { PageCategory } from "@/lib/page-categories"
import { ChangeCard } from "@/components/changes/change-card"
import { ChangeFilters } from "@/components/changes/change-filters"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Button } from "@/components/ui/button"

const PAGE_SIZE = 20

type ChangeRow = {
  id: string
  category: PageCategory
  priority: ChangePriority
  summary: string
  whyItMatters: string
  recommendedAction: string
  recommendedActions: string[]
  aiModelUsed: string | null
  diffExcerpt: string | null
  createdAt: Date
  competitorName: string
  pageUrl: string
  pageLabel: string | null
}

type NotificationsResponse = {
  competitors: { id: string; name: string }[]
  changes: (Omit<ChangeRow, "createdAt"> & { createdAt: string })[]
  count: number
  page: number
  pageSize: number
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const workspace = await getCurrentWorkspace()
  if (!workspace) {
    redirect("/onboarding")
  }

  const query = new URLSearchParams({ workspaceId: workspace.id })
  for (const key of ["page", "competitor_id", "category", "priority", "q"] as const) {
    if (params[key]) query.set(key, params[key]!)
  }

  const { competitors, changes: rawChanges, count } = await apiFetch<NotificationsResponse>(
    { id: workspace.userId, email: workspace.userEmail },
    `/notifications?${query.toString()}`
  )

  const changes: ChangeRow[] = rawChanges.map((c) => ({ ...c, createdAt: new Date(c.createdAt) }))
  const page = Number(params.page ?? "0")
  const offset = page * PAGE_SIZE

  const hasFilters = Boolean(
    params.q || params.competitor_id || params.category || params.priority
  )

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Everything caught across your tracked competitor pages.
        </p>
      </header>

      <ChangeFilters competitors={competitors} />

      {!changes.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Tray />
            </EmptyMedia>
            <EmptyTitle>
              {hasFilters ? "No changes match these filters" : "No changes yet"}
            </EmptyTitle>
            <EmptyDescription>
              {hasFilters
                ? "Try a different search or clear the filters."
                : "Once your tracked pages are scanned, meaningful updates will show up here."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {changes.map((change) => (
            <ChangeCard key={change.id} change={change} />
          ))}
        </div>
      )}

      {count > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            disabled={page === 0}
            nativeButton={false}
            render={
              <Link
                href={{
                  pathname: "/notifications",
                  query: { ...params, page: String(Math.max(0, page - 1)) },
                }}
              >
                Previous
              </Link>
            }
          />
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {Math.ceil(count / PAGE_SIZE)}
          </span>
          <Button
            variant="outline"
            disabled={offset + PAGE_SIZE >= count}
            nativeButton={false}
            render={
              <Link
                href={{
                  pathname: "/notifications",
                  query: { ...params, page: String(page + 1) },
                }}
              >
                Next
              </Link>
            }
          />
        </div>
      )}
    </div>
  )
}
