"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CaretUpDown, Check, Gear, Plus } from "@phosphor-icons/react/ssr"

import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"

export type SwitchableWorkspace = {
  id: string
  name: string
  slug: string
}

function initialsFor(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "W"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function WorkspaceAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-[11px] font-semibold text-background",
        className
      )}
    >
      {initialsFor(name)}
    </span>
  )
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
}: {
  workspaces: SwitchableWorkspace[]
  activeWorkspaceId: string
}) {
  const router = useRouter()
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  const active =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0]

  async function onSelect(workspaceId: string) {
    if (workspaceId === activeWorkspaceId) return
    setSwitchingId(workspaceId)

    const res = await fetch("/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    })

    setSwitchingId(null)
    if (!res.ok) return

    router.push("/dashboard")
    router.refresh()
  }

  if (!active) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl bg-background p-2 text-left ring-1 ring-border transition-colors hover:bg-muted/60 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:ring-0"
          >
            <WorkspaceAvatar name={active.name} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
              {active.name}
            </span>
            <CaretUpDown className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-64 p-0">
        <div className="px-3 pt-3 pb-1.5 text-xs font-medium text-muted-foreground">
          Workspaces
        </div>
        <div className="px-1 pb-1">
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              className="gap-2.5 px-2 py-2"
              onClick={() => onSelect(workspace.id)}
            >
              <WorkspaceAvatar name={workspace.name} className="size-8 rounded-lg text-xs" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{workspace.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {workspace.slug}
                </span>
              </div>
              {switchingId === workspace.id ? (
                <Spinner className="size-4" />
              ) : (
                workspace.id === activeWorkspaceId && (
                  <Check className="size-4 shrink-0 text-muted-foreground" />
                )
              )}
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator className="my-0" />

        <div className="p-1">
          <DropdownMenuItem
            className="gap-2.5 px-2 py-2"
            render={<Link href="/onboarding?new=1" />}
          >
            <Plus className="size-4" />
            New workspace
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2.5 px-2 py-2" render={<Link href="/team" />}>
            <Gear className="size-4" />
            Workspace settings
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
