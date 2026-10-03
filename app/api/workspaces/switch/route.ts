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

  const { workspaceId } = await request.json().catch(() => ({}))
  if (typeof workspaceId !== "string" || !workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 })
  }

  try {
    await apiFetch(session.user, "/workspaces/switch", {
      method: "POST",
      body: JSON.stringify({ workspaceId }),
    })

    const store = await cookies()
    store.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.body ?? { error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}
