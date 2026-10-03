/**
 * Duck-typed check for Prisma's unique-constraint violation, rather than
 * `instanceof Prisma.PrismaClientKnownRequestError`, since the generated client's
 * `Prisma` namespace re-exports that class via `export import`, which this
 * project's isolatedModules setting doesn't narrow `unknown` through
 * reliably. Every PrismaClientKnownRequestError carries a `.code`, which is
 * all P2002 detection actually needs.
 */
export function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  )
}
