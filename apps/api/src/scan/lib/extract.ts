// HTML to text extraction and word-level diffing. Dependency-free by design:
// pricing and product pages need plain text, not full document parsing.
// Ported verbatim from the Next.js app's lib/scan/extract.ts.

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&rsquo;": "'",
  "&lsquo;": "'",
  "&rdquo;": '"',
  "&ldquo;": '"',
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&[a-z]+;/gi, (match) => HTML_ENTITIES[match] ?? match)
}

const MAX_EXTRACTED_LENGTH = 200_000

export function extractText(html: string): string {
  const withoutNoise = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|nav|footer|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")

  const decoded = decodeEntities(withoutNoise)

  const normalized = decoded
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")

  return normalized.slice(0, MAX_EXTRACTED_LENGTH)
}

export async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

type DiffOp = { type: "equal" | "added" | "removed"; value: string }

const MAX_DIFF_WORDS = 4000

/** Word-level LCS diff, capped to keep worst-case O(n*m) bounded. */
export function diffWords(before: string, after: string): DiffOp[] {
  const a = before.split(/\s+/).filter(Boolean).slice(0, MAX_DIFF_WORDS)
  const b = after.split(/\s+/).filter(Boolean).slice(0, MAX_DIFF_WORDS)

  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const ops: DiffOp[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "equal", value: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "removed", value: a[i] })
      i++
    } else {
      ops.push({ type: "added", value: b[j] })
      j++
    }
  }
  while (i < n) ops.push({ type: "removed", value: a[i++] })
  while (j < m) ops.push({ type: "added", value: b[j++] })

  return mergeConsecutive(ops)
}

function mergeConsecutive(ops: DiffOp[]): DiffOp[] {
  const merged: DiffOp[] = []
  for (const op of ops) {
    const last = merged[merged.length - 1]
    if (last && last.type === op.type) {
      last.value += " " + op.value
    } else {
      merged.push({ ...op })
    }
  }
  return merged
}

// Noise filter

// Patterns recognised from the surrounding phrase, e.g. "Posted 2 days ago".
// The diff often isolates just the changed digit, so these are tested against a
// small context window rather than the changed value alone.
const CONTEXTUAL_NOISE_PATTERNS: RegExp[] = [
  /\d+\s*(second|minute|hour|day|week|month|year)s?\s*ago/i,
  /©\s*\d{4}/,
  /\b\d{4}-\d{2}-\d{2}\b/,
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i,
]

// Patterns tested against the isolated token. Matching these with surrounding
// context would both miss real hex/base64 tokens and false-positive on prose.
const TOKEN_NOISE_PATTERNS: RegExp[] = [
  /^[a-f0-9]{16,}$/i, // hex session/nonce-looking token
  /^[A-Za-z0-9+/]{20,}={0,2}$/, // base64-looking token
]

function lastWords(text: string, n: number): string {
  return text.trim().split(/\s+/).slice(-n).join(" ")
}

function firstWords(text: string, n: number): string {
  return text.trim().split(/\s+/).slice(0, n).join(" ")
}

const CONTEXT_WORDS = 3

type ChangeGroup = { start: number; end: number; ops: DiffOp[] }

/**
 * Groups adjacent non-equal ops. A substitution diffs as a "removed" op
 * followed by an "added" one, and the pair must be judged as a unit: in
 * "© 2025" -> "© 2026" only the removed op sits next to the "©", so judging
 * them separately loses that context.
 */
function groupChanges(ops: DiffOp[]): ChangeGroup[] {
  const groups: ChangeGroup[] = []
  let i = 0
  while (i < ops.length) {
    if (ops[i].type === "equal") {
      i++
      continue
    }
    const start = i
    while (i < ops.length && ops[i].type !== "equal") i++
    groups.push({ start, end: i - 1, ops: ops.slice(start, i) })
  }
  return groups
}

function isNoiseGroup(ops: DiffOp[], group: ChangeGroup): boolean {
  const trimmedValues = group.ops.map((op) => op.value.trim()).filter(Boolean)
  if (trimmedValues.length === 0) return true

  if (
    trimmedValues.some((value) =>
      TOKEN_NOISE_PATTERNS.some((pattern) => pattern.test(value))
    )
  ) {
    return true
  }

  const prev = ops[group.start - 1]
  const next = ops[group.end + 1]
  const context = [
    prev?.type === "equal" ? lastWords(prev.value, CONTEXT_WORDS) : "",
    ...trimmedValues,
    next?.type === "equal" ? firstWords(next.value, CONTEXT_WORDS) : "",
  ]
    .filter(Boolean)
    .join(" ")

  if (CONTEXTUAL_NOISE_PATTERNS.some((pattern) => pattern.test(context))) {
    return true
  }

  // Short changes are noise unless they contain a digit, which preserves real
  // price moves like "$29" -> "$39".
  const combined = trimmedValues.join(" ")
  if (combined.length < 4 && !/\d/.test(combined)) return true
  return false
}

export type MeaningfulDiff = {
  before: string
  after: string
  excerpt: string
}

const MAX_EXCERPT_LENGTH = 1500

/**
 * Filters noise out of a word diff and returns capped before/after/excerpt
 * strings when anything meaningful survives. The result is used both as stored
 * evidence and as the analysis prompt input.
 */
export function buildMeaningfulDiff(ops: DiffOp[]): MeaningfulDiff | null {
  const meaningfulGroups = groupChanges(ops).filter(
    (group) => !isNoiseGroup(ops, group)
  )

  if (meaningfulGroups.length === 0) return null

  const beforeParts: string[] = []
  const afterParts: string[] = []
  const excerptParts: string[] = []

  for (const group of meaningfulGroups) {
    const start = Math.max(0, group.start - 1)
    const end = Math.min(ops.length, group.end + 2)
    const context = ops.slice(start, end)

    for (const op of context) {
      if (op.type !== "removed") afterParts.push(op.value)
      if (op.type !== "added") beforeParts.push(op.value)
    }

    const before = group.ops
      .filter((op) => op.type !== "added")
      .map((op) => op.value)
      .join(" ")
    const after = group.ops
      .filter((op) => op.type !== "removed")
      .map((op) => op.value)
      .join(" ")
    excerptParts.push(`${before ? `- ${before}` : ""}${before && after ? " " : ""}${after ? `+ ${after}` : ""}`)
  }

  return {
    before: beforeParts.join(" ").slice(0, MAX_EXCERPT_LENGTH),
    after: afterParts.join(" ").slice(0, MAX_EXCERPT_LENGTH),
    excerpt: excerptParts.join("\n").slice(0, MAX_EXCERPT_LENGTH),
  }
}
