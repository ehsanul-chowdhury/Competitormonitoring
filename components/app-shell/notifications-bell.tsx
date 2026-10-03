"use client"

import Link from "next/link"
import { BellSimple, Clock, Tray } from "@phosphor-icons/react/ssr"
import type { ChangePriority } from "@prisma/client"

import { cn, formatRelativeTime, avatarToneForName } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type RecentChange = {
  id: string
  summary: string
  priority: ChangePriority
  competitorName: string
  createdAt: Date
  isRecent: boolean
}

export function NotificationsBell({ changes }: { changes: RecentChange[] }) {
  const unreadCount = changes.filter((change) => change.isRecent).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <BellSimple />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive ring-2 ring-background"
                aria-label={`${unreadCount} unread`}
              />
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-base font-semibold">Notifications</span>
          <Link
            href="/notifications"
            className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            View all
          </Link>
        </div>

        {changes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 border-t px-4 py-10 text-center text-sm text-muted-foreground">
            <Tray className="size-6" />
            No changes yet.
          </div>
        ) : (
          <div className="flex flex-col">
            {changes.map((change) => (
              <Link
                key={change.id}
                href="/notifications"
                className="flex items-start gap-3 border-t px-4 py-3.5 transition-colors hover:bg-muted/60"
              >
                <Avatar className="size-10 shrink-0">
                  <AvatarFallback
                    className={cn(
                      "text-sm font-semibold",
                      avatarToneForName(change.competitorName)
                    )}
                  >
                    {change.competitorName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-semibold">
                    {change.competitorName}
                  </span>
                  <span className="line-clamp-1 text-sm text-muted-foreground">
                    {change.summary}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    {formatRelativeTime(change.createdAt)}
                  </span>
                </div>

                {change.isRecent && (
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-destructive"
                    aria-label="Unread"
                  />
                )}
              </Link>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
