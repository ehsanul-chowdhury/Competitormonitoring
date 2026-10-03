import { proxyBody, proxyToApi } from "@/lib/api-proxy"

export async function POST(request: Request) {
  return proxyToApi("/tracked-pages/bulk", { method: "POST", body: await proxyBody(request) })
}
