// Content signals used to verify the bounded set of discovery candidates whose
// URL path alone cannot be trusted (see needsContentVerification in
// discover.ts). Cheap regex checks against raw HTML, not a DOM parse.
// Ported verbatim from the Next.js app's lib/scan/content-signals.ts.

const PRICE_PATTERN =
  /[$€£]\s?\d{1,4}(?:[.,]\d{2})?\s*(?:\/|\bper\b)?\s*(?:mo|month|yr|year|user|seat)\b/i

const PLAN_TIER_WORDS = [
  "free",
  "starter",
  "basic",
  "pro",
  "plus",
  "team",
  "growth",
  "business",
  "enterprise",
  "premium",
]

function countPlanTierWords(text: string): number {
  const lower = text.toLowerCase()
  return PLAN_TIER_WORDS.filter((word) => new RegExp(`\\b${word}\\b`).test(lower)).length
}

/**
 * True if the content looks like a pricing page: a price and billing period
 * such as "$29/mo", or two or more distinct plan-tier names clustered together,
 * which a pricing table almost always lists.
 */
export function looksLikePricingContent(html: string): boolean {
  return PRICE_PATTERN.test(html) || countPlanTierWords(html) >= 3
}

const ARTICLE_META_PATTERN =
  /<meta[^>]+property=["']og:type["'][^>]+content=["']article["']/i
const READ_TIME_PATTERN = /\b\d+\s*min(?:ute)?s?\s*read\b/i
const BYLINE_PATTERN = /\b[Bb]y\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/

/**
 * True if the content looks like an article: an `og:type=article` meta tag,
 * which most CMS platforms set regardless of URL structure, a "N min read"
 * marker, or a byline. Catches pages that keyword-matched into pricing or
 * product only because their slug mentions the word.
 */
export function looksLikeArticleContent(html: string): boolean {
  return (
    ARTICLE_META_PATTERN.test(html) ||
    READ_TIME_PATTERN.test(html) ||
    BYLINE_PATTERN.test(html)
  )
}
