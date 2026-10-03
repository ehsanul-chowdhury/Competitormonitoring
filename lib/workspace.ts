import "server-only"
import { cookies, headers } from "next/headers"

import { auth } from "@/lib/auth"
import { apiFetch } from "@/lib/backend-client"

export const ACTIVE_WORKSPACE_COOKIE = "active_workspace"

type CurrentWorkspace = {
  id: string
  name: string
  slug: string
  productProfile: string | null
  plan: string
  createdAt: string
  role: "owner" | "admin" | "member"
  userId: string
  userEmail: string
}

type WorkspaceSummary = { id: string; name: string; slug: string; role: "owner" | "admin" | "member" }

/** Resolves the active workspace via the Nest API's /workspaces/current,
 * which does the actual verification (the cookie is only ever a preference;
 * see WorkspacesService.resolveCurrent on the Nest side). */
export async function getCurrentWorkspace(): Promise<CurrentWorkspace | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const preferredId = (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value
  const query = preferredId ? `?preferred=${encodeURIComponent(preferredId)}` : ""
  return apiFetch<CurrentWorkspace | null>(session.user, `/workspaces/current${query}`)
}

export async function getUserWorkspaces(): Promise<WorkspaceSummary[]> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return []
  return apiFetch<WorkspaceSummary[]>(session.user, "/workspaces")
}
