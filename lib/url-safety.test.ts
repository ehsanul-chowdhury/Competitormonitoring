import { describe, expect, it } from "vitest"

import { checkUrlSyntax } from "@/lib/url-safety"

describe("checkUrlSyntax", () => {
  it("allows a normal public https URL", () => {
    expect(checkUrlSyntax("https://acme.com/pricing")).toEqual({ safe: true })
  })

  it("allows a normal public http URL", () => {
    expect(checkUrlSyntax("http://acme.com")).toEqual({ safe: true })
  })

  it("rejects an invalid URL string", () => {
    const result = checkUrlSyntax("not a url")
    expect(result.safe).toBe(false)
  })

  it("rejects non-http(s) schemes", () => {
    for (const url of [
      "file:///etc/passwd",
      "ftp://acme.com",
      "gopher://acme.com",
      "javascript:alert(1)",
    ]) {
      expect(checkUrlSyntax(url).safe, url).toBe(false)
    }
  })

  it("rejects localhost and 0.0.0.0", () => {
    expect(checkUrlSyntax("http://localhost:3000").safe).toBe(false)
    expect(checkUrlSyntax("http://0.0.0.0").safe).toBe(false)
    expect(checkUrlSyntax("http://LOCALHOST").safe).toBe(false)
  })

  it("rejects the cloud metadata IP literal", () => {
    expect(checkUrlSyntax("http://169.254.169.254/latest/meta-data/").safe).toBe(
      false
    )
  })

  it("rejects private IPv4 ranges (RFC1918)", () => {
    for (const host of [
      "10.0.0.1",
      "10.255.255.255",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "127.0.0.1",
    ]) {
      expect(checkUrlSyntax(`http://${host}`).safe, host).toBe(false)
    }
  })

  it("rejects CGNAT range", () => {
    expect(checkUrlSyntax("http://100.64.0.1").safe).toBe(false)
  })

  it("does not reject public IP-range-adjacent addresses", () => {
    // 172.32.x.x is outside the 172.16-31 private range and should be allowed
    expect(checkUrlSyntax("http://172.32.0.1").safe).toBe(true)
    // 11.0.0.1 is outside the 10.x private range
    expect(checkUrlSyntax("http://11.0.0.1").safe).toBe(true)
  })

  it("rejects private/loopback IPv6 literals", () => {
    expect(checkUrlSyntax("http://[::1]").safe).toBe(false)
    expect(checkUrlSyntax("http://[fe80::1]").safe).toBe(false)
    expect(checkUrlSyntax("http://[fd00::1]").safe).toBe(false)
  })
})
