"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Compass } from "@phosphor-icons/react/ssr"
import { toast } from "sonner"

import { CategoryBadge } from "@/components/changes/change-badges"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import type { PageCategory } from "@/lib/page-categories"

type DiscoveredPage = {
  url: string
  category: PageCategory
  label: string
}

/**
 * The discovery flow itself: fetch candidates, review, bulk-add. Carries no
 * Dialog chrome so it can be embedded either in its own standalone dialog (see
 * DiscoverPagesDialog below) or as a step inside the add-competitor wizard.
 */
export function DiscoverPagesPanel({
  competitorId,
  workspaceId,
  onAdded,
}: {
  competitorId: string
  workspaceId: string
  onAdded?: (count: number) => void
}) {
  const router = useRouter()
  // Starts true because a fresh mount always kicks off discovery below, so no
  // synchronous setState is needed when the effect fires. See the comment on
  // the effect for why that matters.
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pages, setPages] = useState<DiscoveredPage[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  async function runDiscovery() {
    try {
      const res = await fetch(`/api/competitors/${competitorId}/discover`, {
        method: "POST",
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error ?? "Discovery failed")
        return
      }
      setError(null)
      const discovered: DiscoveredPage[] = result.pages ?? []
      setPages(discovered)
      // Pre-select every high-signal page, leaving "other" for the user to opt
      // into. When nothing clears that bar, which is common on sites whose
      // pages don't match the generic keywords, select everything instead so
      // the panel isn't a wall of unchecked boxes.
      const highSignal = discovered.filter((p) => p.category !== "other")
      setSelected(
        new Set((highSignal.length > 0 ? highSignal : discovered).map((p) => p.url))
      )
    } catch {
      setError("Couldn't reach the discovery service.")
    } finally {
      setIsLoading(false)
    }
  }

  // Used by "Try again" buttons, which are plain click handlers rather than an
  // effect, so resetting state synchronously here is safe.
  function retryDiscovery() {
    setIsLoading(true)
    setError(null)
    setPages(null)
    setSelected(new Set())
    runDiscovery()
  }

  // Kicks off discovery on mount. This component is always mounted fresh
  // (conditionally rendered, never reused across competitors), so there's
  // no need to react to competitorId changing after the fact.
  useEffect(() => {
    // The lint rule can't see that every setState call inside runDiscovery
    // happens after an `await`, i.e. in a later task, not synchronously
    // within this effect. This is the standard fetch-on-mount pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runDiscovery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  function toggleAll() {
    if (!pages) return
    setSelected((prev) =>
      prev.size === pages.length ? new Set() : new Set(pages.map((p) => p.url))
    )
  }

  async function addSelected() {
    if (!pages || selected.size === 0) return
    setIsSubmitting(true)
    const rows = pages
      .filter((p) => selected.has(p.url))
      .map((p) => ({ url: p.url, label: p.label, category: p.category }))

    const res = await fetch("/api/tracked-pages/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, competitorId, pages: rows }),
    })
    const result = await res.json().catch(() => ({}))

    setIsSubmitting(false)

    if (!res.ok) {
      toast.error(result.error ?? "Something went wrong.")
      return
    }

    const addedCount = result.count ?? rows.length
    toast(`Added ${addedCount} page${addedCount === 1 ? "" : "s"}.`)
    setPages((prev) => prev?.filter((p) => !selected.has(p.url)) ?? null)
    setSelected(new Set())
    router.refresh()
    onAdded?.(addedCount)
  }

  return (
    <div className="flex flex-col gap-4">
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Spinner />
          Crawling the site…
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-2">
            {error}
            <Button type="button" variant="outline" size="sm" onClick={retryDiscovery}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {pages && pages.length === 0 && (
        <Empty>
          <EmptyMedia variant="icon">
            <Compass />
          </EmptyMedia>
          <EmptyTitle>No pages found</EmptyTitle>
          <EmptyDescription>
            Try adding a page manually, or run the crawl again. Sitemap
            fetches can occasionally time out.
          </EmptyDescription>
          <Button type="button" variant="outline" size="sm" onClick={retryDiscovery}>
            Try again
          </Button>
        </Empty>
      )}

      {pages && pages.length > 0 && (
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={selected.size === pages.length}
              indeterminate={selected.size > 0 && selected.size < pages.length}
              onCheckedChange={toggleAll}
            />
            {selected.size === pages.length ? "Deselect all" : "Select all"}
          </label>
          <span className="text-xs text-muted-foreground">
            {pages.length} page{pages.length === 1 ? "" : "s"} found
          </span>
        </div>
      )}

      {pages && pages.length > 0 && (
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {pages.map((page) => (
            <label
              key={page.url}
              className="flex items-center gap-2.5 rounded-md p-1.5 hover:bg-muted"
            >
              <Checkbox
                checked={selected.has(page.url)}
                onCheckedChange={() => toggle(page.url)}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  {page.label}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {page.url}
                </span>
              </div>
              <CategoryBadge category={page.category} className="shrink-0" />
            </label>
          ))}
        </div>
      )}

      {pages && pages.length > 0 && (
        <Button
          type="button"
          className="self-end"
          disabled={selected.size === 0 || isSubmitting}
          onClick={addSelected}
        >
          {isSubmitting && <Spinner />}
          Add {selected.size} page{selected.size === 1 ? "" : "s"}
        </Button>
      )}
    </div>
  )
}

export function DiscoverPagesDialog({
  competitorId,
  workspaceId,
}: {
  competitorId: string
  workspaceId: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Compass />
            Discover pages
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Discover pages</DialogTitle>
          <DialogDescription>
            Found by crawling this competitor&apos;s sitemap or homepage.
            Review and add the ones worth tracking.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <DiscoverPagesPanel
            competitorId={competitorId}
            workspaceId={workspaceId}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
