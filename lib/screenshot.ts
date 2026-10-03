/**
 * Direct-embed screenshot URL via microlink.io, which needs no API key.
 * `embed=screenshot.url` returns a redirect to the rendered image, so the
 * result works as a plain <img src> with no server-side fetch.
 */
export function getScreenshotUrl(domain: string): string {
  const params = new URLSearchParams({
    url: `https://${domain}`,
    screenshot: "true",
    meta: "false",
    embed: "screenshot.url",
  })
  return `https://api.microlink.io/?${params.toString()}`
}
