import { z } from "zod"

import { PAGE_CATEGORY_LABELS, type PageCategory } from "../../common/page-categories.js"
import type { ChangePriority } from "../../../generated/prisma/index.js"
import { askDeepSeek, isDeepSeekConfigured } from "./deepseek.js"

// Ported verbatim from the Next.js app's lib/ai/analyze-change.ts.

export type ChangeAnalysisInput = {
  competitorName: string
  pageUrl: string
  pageLabel: string | null
  category: PageCategory
  diffExcerpt: string
  /** What the reader's own team sells, so impact is expressed relative to them. */
  productProfile: string | null
}

export type ChangeAnalysis = {
  summary: string
  whyItMatters: string
  priority: ChangePriority
  recommendedActions: string[]
  /** Which model produced this, or "deterministic" when analysis is unavailable. */
  modelUsed: string
}

const MODEL = "deepseek-chat"

/** The model is asked for exactly this shape. Malformed output is rejected
 * rather than partially trusted, since a half-parsed analysis looks
 * authoritative while the fallback is honest about being unanalysed. */
export const responseSchema = z.object({
  summary: z.string().trim().min(1).max(200),
  why_it_matters: z.string().trim().min(1).max(600),
  impact: z.enum(["low", "medium", "high", "critical"]),
  recommended_actions: z.array(z.string().trim().min(1).max(200)).min(1).max(5),
})

const SYSTEM_PROMPT = `You are a competitive intelligence analyst for a B2B SaaS team.
You are given a diff of a competitor's public web page. Explain the change the way a
product marketing manager would brief their founder.

Rules:
- "summary" states concretely what changed. Include specific numbers, plan names, or
  feature names when the diff contains them. Never write "the page changed".
- "why_it_matters" explains the commercial consequence for the reader's company. If you
  are told what the reader sells, compare against it explicitly.
- "impact" is your honest severity rating. Most changes are low or medium. Reserve
  "critical" for pricing shifts, positioning pivots, or launches that directly threaten
  the reader's core offering.
- "recommended_actions" are 2-4 concrete next steps someone can do this week. No filler
  like "keep monitoring" unless genuinely the right call. Avoid recommending a knee-jerk
  price cut.
- If the diff is trivial (typos, dates, cosmetic copy), say so plainly and rate it "low".

Respond with ONLY a JSON object, no markdown fences:
{"summary":"...","why_it_matters":"...","impact":"low|medium|high|critical","recommended_actions":["...","..."]}`

function buildUserPrompt(input: ChangeAnalysisInput) {
  const parts = [
    `Competitor: ${input.competitorName}`,
    `Page: ${input.pageLabel || input.pageUrl}`,
    `Page type: ${PAGE_CATEGORY_LABELS[input.category]}`,
  ]

  if (input.productProfile?.trim()) {
    parts.push(`\nThe reader's own product (compare against this):\n${input.productProfile.trim()}`)
  } else {
    parts.push(
      `\nThe reader has not described their own product, so keep "why_it_matters" about the competitor's likely intent rather than inventing a comparison.`
    )
  }

  parts.push(`\nDiff of what changed on the page:\n${input.diffExcerpt}`)
  return parts.join("\n")
}

/** Models sometimes wrap JSON in prose or fences despite instructions. */
export function extractJson(reply: string): unknown {
  const fenced = reply.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = (fenced ? fenced[1] : reply).trim()
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model reply")
  }
  return JSON.parse(candidate.slice(start, end + 1))
}

/** Used when no model is configured or a call fails. States plainly that the
 * change is unanalysed rather than guessing at impact. */
export function deterministicAnalysis(): ChangeAnalysis {
  return {
    summary: "The page content changed.",
    whyItMatters:
      "Automated analysis isn't enabled yet. Review the diff below to see what changed.",
    priority: "medium",
    recommendedActions: ["Review the highlighted diff."],
    modelUsed: "deterministic",
  }
}

export function isChangeAnalysisEnabled() {
  return isDeepSeekConfigured()
}

/**
 * Turns a raw page diff into "what changed / why it matters / what to do".
 * Never throws: analysis failing must not lose the change event itself, so any
 * error degrades to the deterministic description.
 */
export async function analyzeChange(
  input: ChangeAnalysisInput
): Promise<ChangeAnalysis> {
  if (!isDeepSeekConfigured()) return deterministicAnalysis()

  try {
    const reply = await askDeepSeek([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ])

    const parsed = responseSchema.parse(extractJson(reply))

    return {
      summary: parsed.summary,
      whyItMatters: parsed.why_it_matters,
      priority: parsed.impact,
      recommendedActions: parsed.recommended_actions,
      modelUsed: MODEL,
    }
  } catch (error) {
    console.error("[analyze-change] falling back to deterministic:", error)
    return deterministicAnalysis()
  }
}
