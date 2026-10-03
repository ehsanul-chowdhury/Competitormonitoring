import "server-only"
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises"
import { join } from "node:path"

const AVATAR_DIR = process.env.AVATAR_DIR ?? "./storage/avatars"

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024

type ImageKind = { ext: "jpg" | "png" | "webp"; contentType: string }

/** Sniffs the real format from the file's magic bytes. The browser-supplied
 * MIME type is attacker-controlled, so trusting it would allow a disguised
 * script payload to be stored and later served back from our own origin. */
export function detectImageKind(bytes: Uint8Array): ImageKind | null {
  if (bytes.length < 12) return null

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", contentType: "image/jpeg" }
  }

  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (png.every((byte, index) => bytes[index] === byte)) {
    return { ext: "png", contentType: "image/png" }
  }

  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end))
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return { ext: "webp", contentType: "image/webp" }
  }

  return null
}

const EXTENSIONS: ImageKind[] = [
  { ext: "jpg", contentType: "image/jpeg" },
  { ext: "png", contentType: "image/png" },
  { ext: "webp", contentType: "image/webp" },
]

function fileName(userId: string, ext: string) {
  // The id comes from the verified session, never from user input, so it can't
  // be steered outside the avatar directory.
  return `${encodeURIComponent(userId)}.${ext}`
}

export async function writeAvatar(userId: string, bytes: Uint8Array, kind: ImageKind) {
  await mkdir(AVATAR_DIR, { recursive: true })
  await removeAvatar(userId)
  await writeFile(join(AVATAR_DIR, fileName(userId, kind.ext)), bytes)
}

export async function removeAvatar(userId: string) {
  await Promise.all(
    EXTENSIONS.map(async ({ ext }) => {
      try {
        await unlink(join(AVATAR_DIR, fileName(userId, ext)))
      } catch {
        // Nothing stored in that format, so nothing to clean up.
      }
    })
  )
}

export async function readAvatar(userId: string) {
  let entries: string[]
  try {
    entries = await readdir(AVATAR_DIR)
  } catch {
    return null
  }

  for (const kind of EXTENSIONS) {
    const name = fileName(userId, kind.ext)
    if (!entries.includes(name)) continue
    try {
      const bytes = await readFile(join(AVATAR_DIR, name))
      return { bytes, contentType: kind.contentType }
    } catch {
      return null
    }
  }

  return null
}
