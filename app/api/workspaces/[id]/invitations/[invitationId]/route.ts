import { proxyToApi } from "@/lib/api-proxy"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  const { id, invitationId } = await params
  return proxyToApi(`/workspaces/${id}/invitations/${invitationId}`, { method: "DELETE" })
}
