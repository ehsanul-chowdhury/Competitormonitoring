function parseDiffLine(line: string): { removed?: string; added?: string } {
  const plusIdx = line.indexOf(" + ")
  if (line.startsWith("- ") && plusIdx !== -1) {
    return { removed: line.slice(2, plusIdx), added: line.slice(plusIdx + 3) }
  }
  if (line.startsWith("- ")) return { removed: line.slice(2) }
  if (line.startsWith("+ ")) return { added: line.slice(2) }
  return {}
}

export function DiffViewer({ diffExcerpt }: { diffExcerpt: string | null }) {
  if (!diffExcerpt) {
    return (
      <p className="text-sm text-muted-foreground">No diff available for this change.</p>
    )
  }

  const lines = diffExcerpt.split("\n").filter(Boolean)

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3 font-mono text-xs leading-relaxed">
      {lines.map((line, index) => {
        const { removed, added } = parseDiffLine(line)
        return (
          <div key={index} className="flex flex-wrap gap-x-1">
            {removed && (
              <span className="rounded bg-red-100 px-1 text-red-800 line-through dark:bg-red-500/20 dark:text-red-300">
                {removed}
              </span>
            )}
            {added && (
              <span className="rounded bg-green-100 px-1 text-green-800 dark:bg-green-500/20 dark:text-green-300">
                {added}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
