import { NextResponse } from "next/server"

import { readAvatar } from "@/lib/avatar-storage"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const avatar = await readAvatar(userId)
  if (!avatar) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(avatar.bytes), {
    headers: {
      "Content-Type": avatar.contentType,
      // Serving user-uploaded bytes from our own origin is an XSS vector if the
      // browser is allowed to guess the type or run anything in it. The upload
      // path already verifies magic bytes; these headers close the rest:
      // no sniffing, no script/plugin execution, never treated as a download.
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  })
}
