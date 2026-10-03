import { proxyToApi } from "@/lib/api-proxy"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  return proxyToApi(`/workspaces/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToApi(`/workspaces/${id}`, { method: "DELETE" })
}
