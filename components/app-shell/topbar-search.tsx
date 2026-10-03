"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BellSimple,
  Buildings,
  Link as LinkIcon,
  MagnifyingGlass,
  Plug,
  SquaresFour,
  UsersThree,
  Warning,
} from "@phosphor-icons/react/ssr"

import type { SearchHit } from "@/app/api/search/route"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

const NAV_TARGETS = [
  { href: "/dashboard", label: "Overview", keywords: "dashboard home", icon: SquaresFour },
  { href: "/competitors", label: "Competitors", keywords: "companies tracked", icon: Buildings },
  { href: "/notifications", label: "Notifications", keywords: "changes alerts feed", icon: BellSimple },
  { href: "/team", label: "Team", keywords: "workspace members invite roles settings", icon: UsersThree },
  { href: "/integrations", label: "Integrations", keywords: "connect apps tools", icon: Plug },
]

const HIT_ICON = {
  competitor: Buildings,
  page: LinkIcon,
  change: Warning,
} as const

const HIT_GROUP_LABEL = {
  competitor: "Competitors",
  page: "Tracked pages",
  change: "Changes",
} as const

export function TopbarSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<SearchHit[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    // An empty query needs no request and no state write. The visible list is
    // derived below, so clearing the input clears results without an effect.
    if (!trimmed) return

    // Debounced so typing doesn't fire a request per keystroke; the abort
    // controller drops responses from stale queries that resolve late.
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error("search failed")
        const data = await res.json()
        setHits(data.hits ?? [])
      } catch {
        // An aborted request is the expected path when the query moved on.
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }, 180)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query])

  function go(href: string) {
    setOpen(false)
    setQuery("")
    router.push(href)
  }

  const trimmedQuery = query.trim()
  // Derived rather than stored, so an empty input shows nothing without the
  // effect having to clear state.
  const visibleHits = trimmedQuery ? hits : []
  const isSearching = Boolean(trimmedQuery) && isLoading

  const navMatches = NAV_TARGETS.filter((target) => {
    const needle = trimmedQuery.toLowerCase()
    if (!needle) return true
    return (
      target.label.toLowerCase().includes(needle) ||
      target.keywords.includes(needle)
    )
  })

  const groupedHits = (["competitor", "page", "change"] as const)
    .map((type) => ({ type, items: visibleHits.filter((hit) => hit.type === type) }))
    .filter((group) => group.items.length > 0)

  const hasResults = navMatches.length > 0 || groupedHits.length > 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full max-w-sm items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/60"
      >
        <MagnifyingGlass className="size-4 shrink-0" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="flex h-6 items-center rounded-md bg-muted px-1.5 text-xs font-medium">
          ⌘ k
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Find competitors, pages, and changes"
      >
        {/* The server already filters, so cmdk's own fuzzy pass would only
            re-filter (and hide) legitimate matches. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search competitors, pages, changes…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {!hasResults && !isSearching && (
              <CommandEmpty>No results for “{query}”.</CommandEmpty>
            )}

            {navMatches.length > 0 && (
              <CommandGroup heading="Go to">
                {navMatches.map((target) => (
                  <CommandItem
                    key={target.href}
                    value={target.href}
                    onSelect={() => go(target.href)}
                  >
                    <target.icon className="size-4 text-muted-foreground" />
                    {target.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {groupedHits.map((group) => {
              const Icon = HIT_ICON[group.type]
              return (
                <CommandGroup key={group.type} heading={HIT_GROUP_LABEL[group.type]}>
                  {group.items.map((hit) => (
                    <CommandItem
                      key={`${hit.type}-${hit.id}`}
                      value={`${hit.type}-${hit.id}`}
                      onSelect={() => go(hit.href)}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{hit.title}</span>
                      <span className="shrink-0 truncate text-xs text-muted-foreground">
                        {hit.subtitle}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
