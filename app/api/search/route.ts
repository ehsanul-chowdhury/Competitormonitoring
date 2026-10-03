import { NextResponse } from "next/server"

import { apiFetch, ApiError } from "@/lib/backend-client"
import { getCurrentWorkspace } from "@/lib/workspace"

export type SearchHit = {
  id: string
  type: "competitor" | "page" | "change"
  title: string
  subtitle: string
  href: string
}

export async function GET(request: Request) {
  const workspace = await getCurrentWorkspace()
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? ""

  try {
    const data = await apiFetch(
      { id: workspace.userId, email: workspace.userEmail },
      `/search?workspaceId=${workspace.id}&q=${encodeURIComponent(query)}`
    )
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.body ?? { error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}
