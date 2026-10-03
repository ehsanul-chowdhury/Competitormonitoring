import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

// Ported from the Next.js app's lib/scan/storage.ts. STORAGE_DIR is read lazily
// (not at module load) since this module may be imported before main.ts has
// loaded .env.
function storageDir(): string {
  const dir = process.env.STORAGE_DIR
  if (!dir) throw new Error("STORAGE_DIR is not set")
  return dir
}

/**
 * Path a crawled page's extracted text is saved under, relative to STORAGE_DIR:
 * {domain}/{crawl-timestamp}/{page-slug}.txt. One folder per crawl, browsable
 * without the database.
 */
export function buildStoragePath(url: string, fetchedAt: Date): string {
  const parsed = new URL(url)
  const isoTimestamp = fetchedAt.toISOString().replace(/[:.]/g, "-")
  const trimmedPath = parsed.pathname.replace(/^\/|\/$/g, "")
  const slug = trimmedPath === "" ? "homepage" : trimmedPath.replace(/\//g, "_")
  return `${parsed.hostname}/${isoTimestamp}/${slug}.txt`
}

export async function writeSnapshot(relativePath: string, text: string) {
  const fullPath = join(storageDir(), relativePath)
  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, text, "utf-8")
}

export async function readSnapshot(relativePath: string | null): Promise<string | null> {
  if (!relativePath) return null
  try {
    return await readFile(join(storageDir(), relativePath), "utf-8")
  } catch {
    return null
  }
}
