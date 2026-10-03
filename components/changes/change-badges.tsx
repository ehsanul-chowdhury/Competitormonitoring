import type { ChangePriority } from "@prisma/client"
import { PAGE_CATEGORY_LABELS, type PageCategory } from "@/lib/page-categories"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

/** Low and medium sit in neutral ink, since they are the common case and
 * colouring every badge means none of them signal anything. Only the two
 * priorities worth interrupting a scan keep a hue, and the word is always
 * present so meaning never rests on colour alone. */
const PRIORITY_STYLES: Record<ChangePriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-muted text-foreground",
  high: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
  critical: "bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-200",
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: ChangePriority
  className?: string
}) {
  return (
    <Badge className={cn("capitalize", PRIORITY_STYLES[priority], className)}>
      {priority}
    </Badge>
  )
}

export function CategoryBadge({
  category,
  className,
}: {
  category: PageCategory
  className?: string
}) {
  // Category is identity rather than urgency, so the label carries it and this
  // stays a plain outline instead of an eight-hue rainbow.
  return (
    <Badge variant="outline" className={cn("text-muted-foreground", className)}>
      {PAGE_CATEGORY_LABELS[category]}
    </Badge>
  )
}
