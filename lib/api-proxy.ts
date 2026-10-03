import "server-only"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { apiFetch, ApiError } from "@/lib/backend-client"

/**
 * Every app/api/** route (besides auth and the avatar routes, which stay
 * local) is now a thin proxy to the Nest API: check the session exactly as
 * before, forward the request, relay whatever status/body Nest returned.
 * Client components keep calling the same `/api/...` paths with no changes.
 */
export async function proxyToApi(path: string, init?: RequestInit) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await apiFetch(session.user, path, init)
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.body ?? { error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}

export async function proxyBody(request: Request) {
  const body = await request.json().catch(() => ({}))
  return JSON.stringify(body)
}
