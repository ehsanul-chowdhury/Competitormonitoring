import "server-only"
import jwt from "jsonwebtoken"

// Talks to the NestJS API (apps/api) that now owns all business data. Auth
// itself stays here (Better Auth, same cookies, unchanged). This just mints
// a short-lived internal token proving who the caller is, so Nest never has
// to see a session cookie. Nest re-checks workspace membership itself on
// every request; this token only ever carries { id, email }.
function mintInternalToken(userId: string, email: string) {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) throw new Error("INTERNAL_API_SECRET is not set")
  return jwt.sign({ sub: userId, email }, secret, { expiresIn: "60s" })
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown
  ) {
    super(typeof body === "object" && body && "error" in body ? String((body as { error: unknown }).error) : "API error")
  }
}

/**
 * Calls the Nest API as the given user. `path` is relative (e.g. "/competitors").
 * Throws ApiError on a non-2xx response; callers decide how to surface that
 * (redirect, notFound(), or relay the status/body straight through from a
 * proxy route handler).
 */
export async function apiFetch<T = unknown>(
  user: { id: string; email: string },
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = mintInternalToken(user.id, user.email)
  const baseUrl = process.env.NEST_API_URL ?? "http://localhost:4100"

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  })

  const text = await res.text()
  const body = text ? JSON.parse(text) : null

  if (!res.ok) {
    throw new ApiError(res.status, body)
  }
  return body as T
}
