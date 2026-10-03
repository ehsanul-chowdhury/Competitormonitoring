import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // Tests run as trusted server-side code, matching how Next.js resolves
    // this package on the server, where it aliases to a no-op. Outside that
    // build pipeline it throws unconditionally. The package's "exports" map
    // doesn't expose this subpath, so it is aliased by resolved file path
    // rather than by specifier.
    alias: {
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url)
      ),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    // apps/* are separate workspace packages with their own vitest config —
    // without this, globbing picks up dependencies' own bundled test files
    // too (e.g. zod's), which fail on missing optional dev dependencies.
    exclude: ["node_modules/**", ".next/**", "apps/**"],
  },
})
