import { proxyBody, proxyToApi } from "@/lib/api-proxy"

export async function POST(request: Request) {
  return proxyToApi("/competitors", { method: "POST", body: await proxyBody(request) })
}
