import {
  CheckCircle,
  Prohibit,
  CircleNotch,
  XCircle,
} from "@phosphor-icons/react/ssr"

import { cn, formatRelativeTime } from "@/lib/utils"
import type { ScanStatus } from "@prisma/client"

export type ScanHistoryEntry = {
  id: string
  startedAt: Date
  status: ScanStatus
  pageLabel: string
  changeCount: number
}

const STATUS_ICON: Record<ScanStatus, typeof CheckCircle> = {
  running: CircleNotch,
  success: CheckCircle,
  error: XCircle,
  skipped_robots: Prohibit,
  skipped_no_change: Prohibit,
  removed: XCircle,
}

const STATUS_ICON_CLASSNAME: Record<ScanStatus, string> = {
  running: "bg-muted text-muted-foreground",
  success: "bg-muted text-foreground",
  error: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
  skipped_robots: "bg-muted text-muted-foreground",
  skipped_no_change: "bg-muted text-muted-foreground",
  removed: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
}

function statusText(status: ScanStatus, changeCount: number) {
  switch (status) {
    case "running":
      return "Scan in progress"
    case "success":
      return changeCount > 0
        ? `${changeCount} change${changeCount === 1 ? "" : "s"} found`
        : "No changes"
    case "error":
      return "Scan failed"
    case "skipped_robots":
      return "Skipped: robots.txt disallowed"
    case "skipped_no_change":
      return "Skipped: content unchanged"
    case "removed":
      return "Page removed"
  }
}

export function ScanHistory({ scans }: { scans: ScanHistoryEntry[] }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
      <div>
        <h2 className="text-sm font-medium">Scan history</h2>
        <p className="text-sm text-muted-foreground">
          Recent runs and the changes they found.
        </p>
      </div>

      {scans.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No scans yet.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {scans.map((scan) => {
            const Icon = STATUS_ICON[scan.status]
            return (
              <li key={scan.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    STATUS_ICON_CLASSNAME[scan.status]
                  )}
                >
                  <Icon className={cn("size-4", scan.status === "running" && "animate-spin")} />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">
                    {formatRelativeTime(scan.startedAt)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {scan.pageLabel} · {statusText(scan.status, scan.changeCount)}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
