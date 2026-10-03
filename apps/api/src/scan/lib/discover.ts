// Parsing and classification helpers for page discovery. Regex-based and
// dependency-free, matching the rest of the scan pipeline.
// Ported verbatim from the Next.js app's lib/scan/discover.ts.

export type PageCategory =
  | "pricing"
  | "product"
  | "customer_story"
  | "integration"
  | "positioning"
  | "homepage"
  | "blog"
  | "other"

const CATEGORY_KEYWORDS: { category: PageCategory; patterns: RegExp[] }[] = [
  {
    category: "pricing",
    patterns: [/\bpricing\b/, /\bplans?\b/, /\bcost\b/, /\bquote\b/],
  },
  {
    category: "product",
    patterns: [/\bproduct\b/, /\bfeatures?\b/, /\bsolutions?\b/, /\bplatform\b/],
  },
  {
    category: "positioning",
    patterns: [
      /\babout\b/,
      /\bcustomers?\b/,
      /\bcase-?studies\b/,
      /\bcompare\b/,
      /\bvs\b/,
      /\balternatives?\b/,
      /\bwhy-/,
    ],
  },
]

// Sections with no competitive signal: job listings, legal boilerplate,
// generic docs and support. Anything under these prefixes stays "other"
// regardless of keyword matches, so canonical pages are not drowned out.
const NOISE_PATH_PREFIXES = [
  "/docs",
  "/kb",
  "/learn",
  "/guides",
  "/guide",
  "/resources",
  "/help",
  "/support",
  "/careers",
  "/jobs",
  "/legal",
  "/terms",
  "/privacy",
  "/academy",
  "/templates",
]

function isContentNoise(pathname: string): boolean {
  return NOISE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

// The first path segment is a stronger signal than keywords elsewhere in the
// slug: ".../how-zapier-scales-product-partnerships" sits under /customers/ but
// contains "product", which would misfire the keyword match below. Sections are
// checked first, falling through to keywords only when there is no clear one.
const SECTION_CATEGORY: Record<string, PageCategory> = {
  pricing: "pricing",
  plans: "pricing",
  pricing2: "pricing",
  product: "product",
  products: "product",
  features: "product",
  solutions: "product",
  platform: "product",
  about: "positioning",
  compare: "positioning",
  alternatives: "positioning",
  partners: "positioning",
  customers: "customer_story",
  customer: "customer_story",
  "case-studies": "customer_story",
  "case-study": "customer_story",
  testimonials: "customer_story",
  integrations: "integration",
  integration: "integration",
  apps: "integration",
  api: "integration",
  blog: "blog",
  changelog: "blog",
  news: "blog",
  press: "blog",
}

/** Classifies a URL's path into a page category using keyword heuristics. */
export function classifyUrl(url: string): PageCategory {
  let pathname: string
  try {
    pathname = new URL(url).pathname.toLowerCase()
  } catch {
    return "other"
  }

  // No path at all means the homepage, not "other". Whether it also carries
  // pricing content is settled separately by content verification.
  if (pathname === "/" || pathname === "") {
    return "homepage"
  }

  if (isContentNoise(pathname)) {
    return "other"
  }

  const firstSegment = pathname.split("/").filter(Boolean)[0]
  if (firstSegment && SECTION_CATEGORY[firstSegment]) {
    return SECTION_CATEGORY[firstSegment]
  }

  for (const { category, patterns } of CATEGORY_KEYWORDS) {
    if (patterns.some((pattern) => pattern.test(pathname))) {
      return category
    }
  }
  return "other"
}

// classifyUrl only reads the URL string, which misses two cases: a page with
// no path signal (usually the homepage, which on single-page sites is also the
// pricing page), and a page that keyword-matched only because its slug happens
// to contain the word, such as a post at ".../our-new-pricing-model" with no
// /blog prefix to exclude it. Both need the page content to resolve, and this
// flags which candidates are worth that extra fetch.
export function needsContentVerification(url: string): boolean {
  let pathname: string
  try {
    pathname = new URL(url).pathname.toLowerCase()
  } catch {
    return false
  }

  // classifyUrl has nothing to go on, so check whether the homepage itself
  // carries pricing content.
  if (pathname === "/" || pathname === "") return true

  // Noise paths and section matches are trustworthy without a fetch, since the
  // URL structure is itself the strong signal.
  if (isContentNoise(pathname)) return false
  const firstSegment = pathname.split("/").filter(Boolean)[0]
  if (firstSegment && SECTION_CATEGORY[firstSegment]) return false

  // Only a generic keyword match remains. A match on a page with no
  // distinguishing path is the false-positive case, so verify it.
  return classifyUrl(url) !== "other"
}

const CATEGORY_WEIGHT: Record<PageCategory, number> = {
  pricing: 0,
  product: 1,
  customer_story: 2,
  integration: 3,
  positioning: 4,
  homepage: 5,
  blog: 6,
  other: 7,
}

export type DiscoveredPage = {
  url: string
  category: PageCategory
  label: string
}

// A safety valve against sites with thousands of blog or customer pages,
// rather than a normal-case limit: a typical sitemap of tens to a couple
// hundred URLs comes through untruncated.
const MAX_TOTAL_CANDIDATES = 200
// Blog and "other" are the categories that realistically run into the hundreds,
// so they are capped separately. Higher-signal categories are never capped
// below the overall total.
const PER_CATEGORY_CAPS: Partial<Record<PageCategory, number>> = {
  other: 100,
  blog: 30,
}

/** Strips fragments and trailing slashes so the same URL dedupes to one key
 * whether it came from a sitemap, a homepage link, or an override. */
export function normalizeUrl(url: string): string {
  return url.split("#")[0].replace(/\/$/, "")
}

/**
 * Ranks and caps candidate URLs. Pricing, product and positioning are kept in
 * full up to the overall cap; "other" is capped harder as the least likely to
 * be worth tracking. `categoryOverrides`, keyed by normalized URL, lets a
 * caller substitute a content-verified category where the URL was ambiguous.
 */
export function rankCandidates(
  urls: string[],
  categoryOverrides?: Map<string, PageCategory>
): DiscoveredPage[] {
  const seen = new Set<string>()
  const candidates: DiscoveredPage[] = []

  for (const url of urls) {
    const normalized = normalizeUrl(url)
    if (seen.has(normalized)) continue
    seen.add(normalized)

    const category = categoryOverrides?.get(normalized) ?? classifyUrl(normalized)
    candidates.push({ url: normalized, category, label: labelFromUrl(normalized) })
  }

  const pathDepth = (url: string) => {
    try {
      return new URL(url).pathname.split("/").filter(Boolean).length
    } catch {
      return 99
    }
  }

  // Within a category, shorter paths sort first: /pricing is likelier to be
  // canonical than /blog/deep/nested/pricing-announcement.
  candidates.sort(
    (a, b) =>
      CATEGORY_WEIGHT[a.category] - CATEGORY_WEIGHT[b.category] ||
      pathDepth(a.url) - pathDepth(b.url) ||
      a.url.localeCompare(b.url)
  )

  const result: DiscoveredPage[] = []
  const categoryCounts = new Map<PageCategory, number>()
  for (const candidate of candidates) {
    if (result.length >= MAX_TOTAL_CANDIDATES) break
    const cap = PER_CATEGORY_CAPS[candidate.category]
    if (cap !== undefined) {
      const count = categoryCounts.get(candidate.category) ?? 0
      if (count >= cap) continue
      categoryCounts.set(candidate.category, count + 1)
    }
    result.push(candidate)
  }
  return result
}

function labelFromUrl(url: string): string {
  try {
    const { pathname } = new URL(url)
    if (pathname === "/" || pathname === "") return "Homepage"
    const segment = pathname.split("/").filter(Boolean).pop() ?? pathname
    return segment
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  } catch {
    return url
  }
}

const SITEMAP_INDEX_PATTERN = /<sitemapindex[\s>]/i

export type SitemapParseResult =
  | { kind: "urlset"; urls: string[] }
  | { kind: "sitemapindex"; sitemapUrls: string[] }

/** Extracts <loc> entries from a sitemap XML document (urlset or index). */
export function parseSitemapXml(xml: string): SitemapParseResult {
  const locs = Array.from(xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)).map((m) =>
    m[1].trim()
  )

  if (SITEMAP_INDEX_PATTERN.test(xml)) {
    return { kind: "sitemapindex", sitemapUrls: locs }
  }
  return { kind: "urlset", urls: locs }
}

/** Extracts the "Sitemap:" directive(s) from a robots.txt body. */
export function parseSitemapDirectives(robotsTxt: string): string[] {
  return Array.from(robotsTxt.matchAll(/^\s*sitemap:\s*(\S+)/gim)).map((m) => m[1])
}

/** Extracts same-origin <a href> links from an HTML document. */
export function extractSameOriginLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl)
  const links: string[] = []

  for (const match of html.matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)) {
    const href = match[1]
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) {
      continue
    }
    try {
      const resolved = new URL(href, base)
      if (resolved.hostname === base.hostname && (resolved.protocol === "http:" || resolved.protocol === "https:")) {
        links.push(resolved.toString())
      }
    } catch {
      // ignore malformed hrefs
    }
  }

  return links
}
