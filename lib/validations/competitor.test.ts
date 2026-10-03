import { describe, expect, it } from "vitest"

import {
  createCompetitorSchema,
  trackedPageSchema,
} from "@/lib/validations/competitor"

describe("createCompetitorSchema", () => {
  it("normalizes a bare domain", () => {
    const result = createCompetitorSchema.parse({ name: "Acme", domain: "acme.com" })
    expect(result.domain).toBe("acme.com")
  })

  it("normalizes a full URL down to its hostname", () => {
    const result = createCompetitorSchema.parse({
      name: "Acme",
      domain: "https://www.acme.com/pricing",
    })
    expect(result.domain).toBe("www.acme.com")
  })

  it("rejects an empty name", () => {
    expect(() =>
      createCompetitorSchema.parse({ name: "", domain: "acme.com" })
    ).toThrow()
  })

  it("rejects a malformed domain", () => {
    expect(() =>
      createCompetitorSchema.parse({ name: "Acme", domain: "not a domain" })
    ).toThrow()
  })
})

describe("trackedPageSchema", () => {
  const base = {
    url: "https://acme.com/pricing",
    label: "",
    category: "pricing" as const,
    scanIntervalMinutes: 720,
  }

  it("accepts a valid public URL", () => {
    expect(() => trackedPageSchema.parse(base)).not.toThrow()
  })

  it("rejects a private-network URL", () => {
    expect(() =>
      trackedPageSchema.parse({ ...base, url: "http://192.168.1.1" })
    ).toThrow()
  })

  it("rejects the cloud metadata URL", () => {
    expect(() =>
      trackedPageSchema.parse({
        ...base,
        url: "http://169.254.169.254/latest/meta-data/",
      })
    ).toThrow()
  })

  it("rejects a scan interval below the minimum", () => {
    expect(() =>
      trackedPageSchema.parse({ ...base, scanIntervalMinutes: 1 })
    ).toThrow()
  })
})
