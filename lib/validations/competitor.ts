import { z } from "zod"

import { PAGE_CATEGORIES } from "@/lib/page-categories"
import { checkUrlSyntax } from "@/lib/url-safety"

export { PAGE_CATEGORIES }

export const SCAN_INTERVAL_OPTIONS = [
  { label: "Every 15 minutes", value: 15 },
  { label: "Every hour", value: 60 },
  { label: "Every 6 hours", value: 360 },
  { label: "Every 12 hours", value: 720 },
  { label: "Every day", value: 1440 },
] as const

export function domainFromInput(input: string): string {
  const trimmed = input.trim().toLowerCase()
  try {
    return new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`)
      .hostname
  } catch {
    return trimmed
  }
}

export const createCompetitorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  domain: z
    .string()
    .trim()
    .min(1, "Domain is required")
    .max(253)
    .transform(domainFromInput)
    .refine((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d), {
      message: "Enter a valid domain, e.g. acme.com",
    }),
})
export type CreateCompetitorInput = z.infer<typeof createCompetitorSchema>

export const renameCompetitorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
})
export type RenameCompetitorInput = z.infer<typeof renameCompetitorSchema>

export const updateCompetitorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80).optional(),
  domain: z
    .string()
    .trim()
    .min(1, "Domain is required")
    .max(253)
    .transform(domainFromInput)
    .refine((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d), {
      message: "Enter a valid domain, e.g. acme.com",
    })
    .optional(),
  isActive: z.boolean().optional(),
})
export type UpdateCompetitorInput = z.infer<typeof updateCompetitorSchema>

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
