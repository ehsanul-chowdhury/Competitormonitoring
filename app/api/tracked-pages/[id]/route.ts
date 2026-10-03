import { proxyBody, proxyToApi } from "@/lib/api-proxy"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToApi(`/tracked-pages/${id}`, { method: "PATCH", body: await proxyBody(request) })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToApi(`/tracked-pages/${id}`, { method: "DELETE", body: await proxyBody(request) })
}
