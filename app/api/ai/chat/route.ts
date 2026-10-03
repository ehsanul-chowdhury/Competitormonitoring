import { NextResponse } from "next/server"

import { apiFetch, ApiError } from "@/lib/backend-client"
import { getCurrentWorkspace } from "@/lib/workspace"

export async function POST(request: Request) {
  const workspace = await getCurrentWorkspace()
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))

  try {
    const data = await apiFetch(
      { id: workspace.userId, email: workspace.userEmail },
      "/ai/chat",
      { method: "POST", body: JSON.stringify({ ...body, workspaceId: workspace.id }) }
    )
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.body ?? { error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}
