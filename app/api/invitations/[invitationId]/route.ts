import { proxyBody, proxyToApi } from "@/lib/api-proxy"

export async function POST(request: Request, { params }: { params: Promise<{ invitationId: string }> }) {
  const { invitationId } = await params
  return proxyToApi(`/invitations/${invitationId}`, { method: "POST", body: await proxyBody(request) })
}
