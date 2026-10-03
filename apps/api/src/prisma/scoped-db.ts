import type { PrismaService } from "./prisma.service.js"

// Direct port of the Next.js app's lib/scoped-db.ts. Takes the injected
// PrismaService instead of a module-level singleton, since Nest provides it
// via DI. Same tenant-isolation behavior otherwise.

const TENANT_MODELS = new Set([
  "Competitor",
  "TrackedPage",
  "Scan",
  "PageSnapshot",
  "ChangeEvent",
  "NotificationPreference",
  "NotificationDelivery",
])

const SINGULAR_OPS = new Set(["findUnique", "findUniqueOrThrow", "update", "delete", "upsert"])

export function scopedDb(prisma: PrismaService, workspaceId: string) {
  return prisma.$extends({
    name: "workspace-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_MODELS.has(model)) return query(args)

          if (SINGULAR_OPS.has(operation)) {
            throw new Error(
              `${operation} is not workspace-safe on ${model}; use the plural form with { id, workspaceId } in \`where\` instead`
            )
          }

          const scopedArgs = args as { data?: unknown; where?: unknown }
          if (operation === "create") {
            scopedArgs.data = { ...(scopedArgs.data as object), workspaceId }
          } else if (operation === "createMany") {
            scopedArgs.data = (scopedArgs.data as Record<string, unknown>[]).map((row) => ({
              ...row,
              workspaceId,
            }))
          } else {
            scopedArgs.where = { ...(scopedArgs.where as object), workspaceId }
          }
          return query(args)
        },
      },
    },
  })
}
