"use client"

import { useMemo, useState } from "react"
import { CaretLeft, CaretRight, LinkSimple, MagnifyingGlass } from "@phosphor-icons/react/ssr"

import { CategoryBadge } from "@/components/changes/change-badges"
import { TrackedPageRowActions } from "@/components/competitors/tracked-page-row-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PAGE_CATEGORIES, PAGE_CATEGORY_LABELS } from "@/lib/page-categories"
import type { PageCategory } from "@prisma/client"

type WatchStatus = "removed" | "ignored" | "changed" | "watching"

export type WatchlistPage = {
  id: string
  url: string
  label: string | null
  category: PageCategory
  isActive: boolean
  lastScannedAt: Date | null
  status: WatchStatus
}

const PAGE_SIZE = 8

const CATEGORY_OPTIONS: { value: "all" | PageCategory; label: string }[] = [
  { value: "all", label: "All types" },
  ...PAGE_CATEGORIES.map((value) => ({ value, label: PAGE_CATEGORY_LABELS[value] })),
]

const STATUS_TABS: { value: "all" | WatchStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "watching", label: "Watching" },
  { value: "ignored", label: "Ignored" },
  { value: "changed", label: "Changed" },
]

function StatusBadge({ status }: { status: WatchStatus }) {
  switch (status) {
    case "removed":
      return (
        <Badge variant="outline" className="rounded-full border-destructive/40 text-destructive">
          Removed
        </Badge>
      )
    case "changed":
      return (
        <Badge variant="outline" className="rounded-full text-foreground">
          Changed
        </Badge>
      )
    case "ignored":
      return (
        <Badge variant="outline" className="rounded-full text-muted-foreground">
          Ignored
        </Badge>
      )
    case "watching":
      return <Badge variant="outline" className="rounded-full">Watching</Badge>
  }
}

export function PageWatchlist({
  workspaceId,
  competitorName,
  pages,
}: {
  workspaceId: string
  competitorName: string
  pages: WatchlistPage[]
}) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<"all" | PageCategory>("all")
  const [status, setStatus] = useState<"all" | WatchStatus>("all")
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return pages.filter((page) => {
      if (category !== "all" && page.category !== category) return false
      // "Changed" also surfaces removed pages. Both mean something happened
      // and is worth review, unlike the steady watching and ignored states.
      if (status !== "all") {
        const matchesStatus =
          status === "changed"
            ? page.status === "changed" || page.status === "removed"
            : page.status === status
        if (!matchesStatus) return false
      }
      if (q) {
        const haystack = `${page.label ?? ""} ${page.url}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [pages, query, category, status])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
      <div>
        <h2 className="text-sm font-medium">Page watchlist</h2>
        <p className="text-sm text-muted-foreground">
          {competitorName}&apos;s tracked pages. Pause any you no longer
          need, and see which ones changed most recently.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="w-56">
            <InputGroupAddon className="pl-3">
              <MagnifyingGlass />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search pages…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
            />
          </InputGroup>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v as typeof category)
              setPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue>
                {(value: typeof category) =>
                  CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? "All types"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs
          value={status}
          onValueChange={(v) => {
            setStatus(v as typeof status)
            setPage(1)
          }}
        >
          <TabsList className="rounded-full">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-full">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No pages match these filters.
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Last scan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((page) => (
                <TableRow key={page.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <LinkSimple className="size-4" />
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-medium">
                          {page.label || page.url}
                        </span>
                        {page.label && (
                          <span className="truncate text-xs text-muted-foreground">
                            {page.url}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={page.category} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {page.lastScannedAt
                      ? page.lastScannedAt.toLocaleString()
                      : "Not scanned yet"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={page.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <TrackedPageRowActions
                      workspaceId={workspaceId}
                      trackedPageId={page.id}
                      isActive={page.isActive}
                      url={page.url}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {pageCount > 1 && (
            <div className="flex items-center justify-between pt-1">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <CaretLeft />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={currentPage === pageCount}
              >
                Next
                <CaretRight />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
