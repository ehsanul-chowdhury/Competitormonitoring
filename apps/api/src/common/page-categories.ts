import type { PageCategory } from "../../generated/prisma/index.js"

export type { PageCategory }

export const PAGE_CATEGORIES = [
  "pricing",
  "product",
  "customer_story",
  "integration",
  "positioning",
  "homepage",
  "blog",
  "other",
] as const satisfies readonly PageCategory[]

export const PAGE_CATEGORY_LABELS: Record<PageCategory, string> = {
  pricing: "Pricing",
  product: "Product",
  customer_story: "Customer story",
  integration: "Integration",
  positioning: "Positioning",
  homepage: "Homepage",
  blog: "Blog",
  other: "Other",
}
