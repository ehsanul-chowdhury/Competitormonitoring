import { z } from "zod"

export const WORKSPACE_ROLES = ["owner", "admin", "member"] as const

export const ASSIGNABLE_ROLES = ["admin", "member"] as const

export const inviteMemberSchema = z.object({
  email: z.email("Enter a valid email address").transform((v) => v.trim().toLowerCase()),
  role: z.enum(ASSIGNABLE_ROLES),
})
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>

export const updateMemberRoleSchema = z.object({
  role: z.enum(WORKSPACE_ROLES),
})
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>

export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters")
    .max(60, "Workspace name must be at most 60 characters")
    .optional(),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(48, "Slug must be at most 48 characters")
    .transform((v) => v.toLowerCase())
    .refine((v) => /^[a-z0-9-]+$/.test(v), {
      message: "Slugs use lowercase letters, numbers, and hyphens only",
    })
    .optional(),
  productProfile: z
    .string()
    .trim()
    .max(2000, "Keep this under 2000 characters")
    .optional(),
})
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>

export const INVITATION_TTL_DAYS = 7
