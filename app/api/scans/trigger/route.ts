import { proxyBody, proxyToApi } from "@/lib/api-proxy"

export async function POST(request: Request) {
  return proxyToApi("/scans/trigger", { method: "POST", body: await proxyBody(request) })
}
