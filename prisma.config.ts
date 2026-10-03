import { defineConfig, env } from "prisma/config"

process.loadEnvFile(".env.local")

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
})
