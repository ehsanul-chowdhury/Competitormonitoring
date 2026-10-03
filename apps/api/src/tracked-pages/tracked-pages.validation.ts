import { z } from "zod"

import { checkUrlSyntax } from "../common/check-url-syntax.js"
import { PAGE_CATEGORIES } from "../common/page-categories.js"

// Ported from the Next.js app's lib/validations/competitor.ts (tracked-page half).

export const SCAN_INTERVAL_OPTIONS = [
  { label: "Every 15 minutes", value: 15 },
  { label: "Every hour", value: 60 },
  { label: "Every 6 hours", value: 360 },
  { label: "Every 12 hours", value: 720 },
  { label: "Every day", value: 1440 },
] as const

const trackedPageUrlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .superRefine((url, ctx) => {
    const result = checkUrlSyntax(url)
    if (!result.safe) {
      ctx.addIssue({ code: "custom", message: result.reason })
    }
  })

export const trackedPageSchema = z.object({
  url: trackedPageUrlSchema,
  label: z.string().trim().max(80).optional().or(z.literal("")),
  category: z.enum(PAGE_CATEGORIES),
  scanIntervalMinutes: z.number().int().min(5),
})
export type TrackedPageInput = z.infer<typeof trackedPageSchema>

export const bulkTrackedPagesSchema = z.object({
  competitorId: z.string().min(1),
  pages: z
    .array(
      z.object({
        url: trackedPageUrlSchema,
        label: z.string().trim().max(80).optional().or(z.literal("")),
        category: z.enum(PAGE_CATEGORIES),
      })
    )
    .min(1),
})
export type BulkTrackedPagesInput = z.infer<typeof bulkTrackedPagesSchema>

export const updateTrackedPageSchema = z.object({
  isActive: z.boolean(),
})
