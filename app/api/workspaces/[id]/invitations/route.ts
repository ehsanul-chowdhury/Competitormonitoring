import { proxyToApi } from "@/lib/api-proxy"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  return proxyToApi(`/workspaces/${id}/invitations`, { method: "POST", body: JSON.stringify(body) })
}
