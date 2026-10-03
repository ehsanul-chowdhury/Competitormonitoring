import { looksLikeArticleContent, looksLikePricingContent } from "./content-signals.js"
import {
  extractSameOriginLinks,
  needsContentVerification,
  normalizeUrl,
  parseSitemapDirectives,
  parseSitemapXml,
  rankCandidates,
  type DiscoveredPage,
  type PageCategory,
} from "./discover.js"
import { safeFetch } from "./url-safety.js"

// Ported verbatim from the Next.js app's lib/scan/discover-pages.ts.

// Safety valve for sitemap-index files rather than a normal-case limit: most
// sites declare well under this many child sitemaps.
const MAX_CHILD_SITEMAPS = 25

async function collectFromSitemap(sitemapUrl: string): Promise<string[]> {
  const { body } = await safeFetch(sitemapUrl)
  const parsed = parseSitemapXml(body)

  if (parsed.kind === "urlset") {
    return parsed.urls
  }

  // Sitemap index: follow a bounded number of child sitemaps, one level deep.
  const urls: string[] = []
  for (const childUrl of parsed.sitemapUrls.slice(0, MAX_CHILD_SITEMAPS)) {
    try {
      const { body: childBody } = await safeFetch(childUrl)
      const childParsed = parseSitemapXml(childBody)
      if (childParsed.kind === "urlset") {
        urls.push(...childParsed.urls)
      }
    } catch {
      // skip unreachable child sitemap, keep the rest
    }
  }
  return urls
}

// Bounds how many ambiguous candidates get an extra content fetch. Fetches run
// in parallel, so this caps added latency and cost per request, not
// correctness. Most sites need only a handful of verifications.
const MAX_CONTENT_VERIFICATIONS = 15

function isHomepageUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname
    return pathname === "/" || pathname === ""
  } catch {
    return false
  }
}

/**
 * Fetches content for a bounded set of ambiguous candidates and returns
 * category overrides where the content resolves cleanly:
 *  - the homepage, when it carries pricing content itself, which is common on
 *    single-page sites where the URL path gives no signal
 *  - a keyword-classified page that turns out to be an article, reclassified
 *    as "blog"
 */
async function verifyAmbiguousCandidates(
  urls: string[],
  base: string
): Promise<Map<string, PageCategory>> {
  const seen = new Set<string>()
  const candidates: string[] = []
  for (const url of urls) {
    const normalized = normalizeUrl(url)
    if (seen.has(normalized) || !needsContentVerification(normalized)) continue
    seen.add(normalized)
    candidates.push(normalized)
  }

  // The homepage is the highest-value check and exists even when it was not
  // among the crawled URLs, so consider it first.
  const homepageUrl = normalizeUrl(`${base}/`)
  if (!seen.has(homepageUrl)) {
    candidates.unshift(homepageUrl)
    seen.add(homepageUrl)
  }

  const bounded = candidates.slice(0, MAX_CONTENT_VERIFICATIONS)
  const overrides = new Map<string, PageCategory>()

  const results = await Promise.allSettled(
    bounded.map(async (url) => {
      const { body } = await safeFetch(url)
      return { url, body }
    })
  )

  for (const result of results) {
    if (result.status !== "fulfilled") continue
    const { url, body } = result.value

    if (isHomepageUrl(url)) {
      if (looksLikePricingContent(body)) {
        overrides.set(url, "pricing")
      }
    } else if (looksLikeArticleContent(body)) {
      overrides.set(url, "blog")
    }
  }

  return overrides
}

export type DiscoverPagesResult = {
  source: "sitemap" | "homepage" | "none"
  pages: DiscoveredPage[]
}

export async function discoverPages(domain: string): Promise<DiscoverPagesResult> {
  const base = `https://${domain}`
  let urls: string[] = []
  let source: "sitemap" | "homepage" | "none" = "none"

  try {
    const { body: robotsBody } = await safeFetch(`${base}/robots.txt`)
    const sitemapDirectives = parseSitemapDirectives(robotsBody)

    for (const sitemapUrl of sitemapDirectives.slice(0, MAX_CHILD_SITEMAPS)) {
      try {
        urls.push(...(await collectFromSitemap(sitemapUrl)))
      } catch {
        // try the next declared sitemap
      }
    }
    if (urls.length > 0) source = "sitemap"
  } catch {
    // robots.txt unreachable; fall through to the fallbacks below
  }

  // Many sites serve a sitemap at the conventional path without declaring it
  // in robots.txt, so try that before falling back to homepage link-scraping.
  if (urls.length === 0) {
    try {
      urls.push(...(await collectFromSitemap(`${base}/sitemap.xml`)))
      if (urls.length > 0) source = "sitemap"
    } catch {
      // no sitemap at the conventional path either; fall through
    }
  }

  if (urls.length === 0) {
    const { body: homepageBody } = await safeFetch(`${base}/`)
    urls = extractSameOriginLinks(homepageBody, base)
    if (urls.length > 0) source = "homepage"
  }

  const categoryOverrides = await verifyAmbiguousCandidates(urls, base)
  const pages = rankCandidates(urls, categoryOverrides)
  return { source, pages }
}
