import { cookies, headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { apiFetch, ApiError } from "@/lib/backend-client"
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace"

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))

  try {
    const workspace = await apiFetch<{ id: string }>(session.user, "/workspaces", {
      method: "POST",
      body: JSON.stringify(body),
    })

    // A newly created workspace becomes the active one. Nest has no notion of
    // cookies, so Next.js (which still owns the browser session) sets it.
    const store = await cookies()
    store.set(ACTIVE_WORKSPACE_COOKIE, workspace.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })

    return NextResponse.json(workspace)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.body ?? { error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}
