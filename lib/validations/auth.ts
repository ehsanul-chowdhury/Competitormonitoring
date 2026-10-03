import { z } from "zod"

export const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter your name")
      .max(80, "Name must be at most 80 characters"),
    email: z.email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
export type SignUpInput = z.infer<typeof signUpSchema>

export const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})
export type SignInInput = z.infer<typeof signInSchema>

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters")
    .max(60, "Workspace name must be at most 60 characters"),
})
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>

export function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "workspace"
  )
}
