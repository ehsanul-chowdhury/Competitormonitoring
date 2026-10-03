import { ArrowRight, ArrowSquareOut, Sparkle } from "@phosphor-icons/react/ssr"
import type { ChangePriority, PageCategory } from "@prisma/client"

import { cn, formatRelativeTime } from "@/lib/utils"
import { CategoryBadge, PriorityBadge } from "@/components/changes/change-badges"
import { DiffViewer } from "@/components/changes/diff-viewer"

export type ChangeCardData = {
  id: string
  competitorName: string
  summary: string
  whyItMatters: string
  recommendedAction: string
  recommendedActions: string[]
  priority: ChangePriority
  category: PageCategory
  createdAt: Date
  pageUrl: string
  pageLabel: string | null
  diffExcerpt: string | null
  /** "deterministic" when no model has analysed this change yet. */
  aiModelUsed: string | null
}

/** High-impact moves get a coloured spine so they're findable when skimming a
 * long feed; routine ones stay quiet. */
const ACCENT_BY_PRIORITY: Record<ChangePriority, string> = {
  low: "before:bg-transparent",
  medium: "before:bg-transparent",
  high: "before:bg-amber-500",
  critical: "before:bg-red-500",
}

export function ChangeCard({ change }: { change: ChangeCardData }) {
  // Older rows predate the multi-action column, so fall back to the single one.
  const actions =
    change.recommendedActions.length > 0
      ? change.recommendedActions
      : [change.recommendedAction].filter(Boolean)

  // A missing model is as unanalysed as an explicitly deterministic one: both
  // mean no model produced this text.
  const isUnanalysed = !change.aiModelUsed || change.aiModelUsed === "deterministic"
  const isUrgent = change.priority === "high" || change.priority === "critical"

  return (
    <article
      className={cn(
        "relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-card p-6 ring-1 ring-foreground/10",
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        ACCENT_BY_PRIORITY[change.priority]
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{change.competitorName}</span>
        <PriorityBadge priority={change.priority} />
        <CategoryBadge category={change.category} />
        <span className="ml-auto text-xs text-muted-foreground">
          {formatRelativeTime(change.createdAt)}
        </span>
      </header>

      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          What changed
        </h3>
        <p className={cn("text-base font-medium", isUrgent && "text-pretty")}>
          {change.summary}
        </p>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Why it matters
        </h3>
        <p className="text-sm text-muted-foreground">{change.whyItMatters}</p>
      </section>

      {actions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Recommended actions
          </h3>
          <ul className="flex flex-col gap-1.5">
            {actions.map((action) => (
              <li key={action} className="flex items-start gap-2 text-sm">
                <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Evidence
          </h3>
          <a
            href={change.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {change.pageLabel || change.pageUrl}
            <ArrowSquareOut className="size-3.5" />
          </a>
        </div>
        <DiffViewer diffExcerpt={change.diffExcerpt} />
      </section>

      {isUnanalysed && (
        // Says plainly that the headline text is boilerplate, so nobody mistakes
        // "The page content changed" for a real finding.
        <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <Sparkle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            AI analysis is off, so this change hasn&apos;t been summarised or
            scored. Add an AI key to get what changed, why it matters, and what
            to do.
          </span>
        </p>
      )}
    </article>
  )
}
