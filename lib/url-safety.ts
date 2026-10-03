// Syntactic URL check, used for fast feedback at insert and update time. This
// is NOT the security boundary: the Nest API's scan pipeline
// (apps/api/src/scan/lib/url-safety.ts) re-validates by resolving DNS before
// every fetch, since a hostname can be repointed after insert.

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "metadata.google.internal",
])

// Private and reserved IPv4 ranges: RFC 1918, loopback, link-local (including
// cloud metadata) and CGNAT.
const PRIVATE_IPV4_PATTERNS: RegExp[] = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
]

function isPrivateIPv4Literal(hostname: string): boolean {
  return PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(hostname))
}

function isPrivateIPv6Literal(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase()
  return (
    host === "::1" ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host.startsWith("fe80")
  )
}

export type UrlSafetyResult = { safe: true } | { safe: false; reason: string }

/** Syntactic only: scheme and literal localhost/private IPs. Does no DNS, so
 * it is safe to run in the browser. */
export function checkUrlSyntax(rawUrl: string): UrlSafetyResult {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { safe: false, reason: "Enter a valid URL, including https://" }
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { safe: false, reason: "Only http and https URLs are supported" }
  }

  const hostname = url.hostname.toLowerCase()

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { safe: false, reason: "This host cannot be tracked" }
  }

  if (isPrivateIPv4Literal(hostname) || isPrivateIPv6Literal(hostname)) {
    return { safe: false, reason: "Private and internal addresses cannot be tracked" }
  }

  return { safe: true }
}
