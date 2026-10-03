import { z } from "zod"

// Ported from the Next.js app's lib/validations/competitor.ts (competitor half).

export function domainFromInput(input: string): string {
  const trimmed = input.trim().toLowerCase()
  try {
    return new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`).hostname
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
