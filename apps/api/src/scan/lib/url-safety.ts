import type { LookupAddress, LookupOptions } from "node:dns"
import { resolve4, resolve6 } from "node:dns/promises"
import type { LookupFunction } from "node:net"
import { Agent, fetch as undiciFetch, type Dispatcher } from "undici"

// SSRF guard for the scan pipeline.
//
// DNS is validated twice: once as a fast pre-flight check (assertSafeToFetch,
// for a clear error before attempting a connection at all) and again,
// authoritatively, inside pinnedLookup below -- the resolver undici itself
// calls at the moment it opens the TCP/TLS connection. Validating only at
// pre-flight and then calling fetch(hostname) would leave a window for DNS
// rebinding: the hostname can be made to resolve to a different (private)
// address by the time the HTTP client does its own lookup. Pinning the
// validation inside the lookup function closes that window, since whichever
// address it hands back is the exact address connected to.
//
// resolve4/resolve6 issue a real DNS query, unlike dns.lookup(), which
// honours a hosts-file override.
//
// Ported from the Next.js app's lib/scan/url-safety.ts, extended with
// connect-time pinning.

const PRIVATE_IPV4_PATTERNS: RegExp[] = [
  /^127\./,
  /^10\./,
  /^0\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
]

function isPrivateIPv4(ip: string): boolean {
  return PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(ip))
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  return (
    lower === "::1" ||
    lower === "::" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80") ||
    (lower.includes("::ffff:") && isPrivateIPv4(lower.split("::ffff:")[1] ?? ""))
  )
}

const IPV4_LITERAL = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/
const IPV6_LITERAL = /^[0-9a-f:]+$/i

function isIpLiteral(hostname: string): boolean {
  return IPV4_LITERAL.test(hostname) || (hostname.includes(":") && IPV6_LITERAL.test(hostname))
}

export class UnsafeUrlError extends Error {}

/**
 * Resolves the hostname and throws UnsafeUrlError if it is not safe to fetch.
 * A fast pre-flight check for a clear, early error; pinnedLookup below is
 * what actually enforces the guard at connect time.
 */
export async function assertSafeToFetch(rawUrl: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new UnsafeUrlError("Invalid URL")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError(`Unsupported scheme: ${url.protocol}`)
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "")

  if (hostname === "localhost" || hostname === "0.0.0.0" || hostname === "metadata.google.internal") {
    throw new UnsafeUrlError(`Blocked hostname: ${hostname}`)
  }

  if (isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) {
    throw new UnsafeUrlError(`Blocked IP literal: ${hostname}`)
  }

  if (isIpLiteral(hostname)) {
    return url
  }

  const resolvedIps: string[] = []
  try {
    const [a, aaaa] = await Promise.allSettled([resolve4(hostname), resolve6(hostname)])
    if (a.status === "fulfilled") resolvedIps.push(...a.value)
    if (aaaa.status === "fulfilled") resolvedIps.push(...aaaa.value)
  } catch {
    throw new UnsafeUrlError(`DNS resolution failed for ${hostname}`)
  }

  if (resolvedIps.length === 0) {
    throw new UnsafeUrlError(`DNS resolution returned no addresses for ${hostname}`)
  }

  for (const ip of resolvedIps) {
    if (isPrivateIPv4(ip) || isPrivateIPv6(ip)) {
      throw new UnsafeUrlError(`${hostname} resolves to a private address (${ip})`)
    }
  }

  return url
}

async function resolveAll(hostname: string): Promise<LookupAddress[]> {
  const [a, aaaa] = await Promise.allSettled([resolve4(hostname), resolve6(hostname)])
  const addresses: LookupAddress[] = []
  if (a.status === "fulfilled") addresses.push(...a.value.map((address) => ({ address, family: 4 })))
  if (aaaa.status === "fulfilled") addresses.push(...aaaa.value.map((address) => ({ address, family: 6 })))
  return addresses
}

/**
 * The real security boundary: undici calls this at the moment it opens a
 * socket for any request made through pinnedDispatcher, so the address it
 * approves is the exact address connected to. Blocking private addresses
 * here (rather than only in the earlier pre-flight check) is what closes the
 * DNS-rebinding TOCTOU gap.
 */
const pinnedLookup: LookupFunction = (hostname, options, callback) => {
  resolveAll(hostname)
    .then((addresses) => {
      if (addresses.length === 0) {
        callback(Object.assign(new Error(`DNS resolution returned no addresses for ${hostname}`), { code: "ENOTFOUND" }), "")
        return
      }

      const blocked = addresses.find((addr) => isPrivateIPv4(addr.address) || isPrivateIPv6(addr.address))
      if (blocked) {
        callback(Object.assign(new Error(`Blocked IP literal: ${blocked.address}`), { code: "EACCES" }), "")
        return
      }

      if ((options as LookupOptions)?.all) {
        callback(null, addresses)
      } else {
        callback(null, addresses[0].address, addresses[0].family)
      }
    })
    .catch((err: NodeJS.ErrnoException) => callback(err, ""))
}

const pinnedDispatcher: Dispatcher = new Agent({ connect: { lookup: pinnedLookup } })

/**
 * Fetches a URL through the pinned dispatcher, after the fast pre-flight
 * check. Every outbound request driven by a user-supplied URL must go
 * through this (or safeFetch below) -- never the bare global fetch, which
 * would re-resolve DNS itself and bypass the guard.
 */
export async function safeRawFetch(rawUrl: string, init: NonNullable<Parameters<typeof undiciFetch>[1]> = {}) {
  const url = await assertSafeToFetch(rawUrl)
  return undiciFetch(url, { ...init, dispatcher: pinnedDispatcher })
}

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024 // 5MB
const FETCH_TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 3

export type SafeFetchResult = {
  finalUrl: string
  status: number
  body: string
}

/**
 * Fetches a page, applying the guard to the initial URL and every redirect
 * hop. Redirects are followed manually so no hop can skip validation.
 */
export async function safeFetch(rawUrl: string): Promise<SafeFetchResult> {
  let currentUrl = rawUrl
  const userAgent = "CompetitorIntelBot/1.0 (+https://example.com/bot)"

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertSafeToFetch(currentUrl)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    let response: Awaited<ReturnType<typeof undiciFetch>>
    try {
      response = await undiciFetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": userAgent },
        dispatcher: pinnedDispatcher,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location) {
        throw new UnsafeUrlError("Redirect with no Location header")
      }
      currentUrl = new URL(location, url).toString()
      continue
    }

    const reader = response.body?.getReader()
    if (!reader) {
      return { finalUrl: url.toString(), status: response.status, body: "" }
    }

    const chunks: Uint8Array[] = []
    let totalBytes = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel()
        throw new UnsafeUrlError("Response exceeded size limit")
      }
      chunks.push(value)
    }

    const body = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const merged = new Uint8Array(acc.length + chunk.length)
        merged.set(acc)
        merged.set(chunk, acc.length)
        return merged
      }, new Uint8Array())
    )

    return { finalUrl: url.toString(), status: response.status, body }
  }

  throw new UnsafeUrlError("Too many redirects")
}
