import { safeRawFetch } from "./url-safety.js"

// Minimal robots.txt check for the "*" user-agent group.
// Ported verbatim from the Next.js app's lib/scan/robots.ts.
export async function isDisallowedByRobots(pageUrl: string): Promise<boolean> {
  const url = new URL(pageUrl)
  const robotsUrl = `${url.protocol}//${url.host}/robots.txt`

  let text: string
  try {
    const res = await safeRawFetch(robotsUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "CompetitorIntelBot/1.0" },
    })
    if (!res.ok) return false
    text = await res.text()
  } catch {
    // A missing or unreachable robots.txt means allowed, per convention.
    return false
  }

  const lines = text.split("\n").map((line) => line.trim())
  let applies = false
  const disallowRules: string[] = []

  for (const line of lines) {
    const [rawKey, ...rest] = line.split(":")
    const key = rawKey?.trim().toLowerCase()
    const value = rest.join(":").trim()
    if (!key) continue

    if (key === "user-agent") {
      applies = value === "*"
    } else if (applies && key === "disallow" && value) {
      disallowRules.push(value)
    }
  }

  return disallowRules.some((rule) => url.pathname.startsWith(rule))
}
