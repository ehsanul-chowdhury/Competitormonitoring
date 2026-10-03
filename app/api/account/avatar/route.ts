import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  MAX_AVATAR_BYTES,
  detectImageKind,
  removeAvatar,
  writeAvatar,
} from "@/lib/avatar-storage"

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get("avatar")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image was uploaded." }, { status: 400 })
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      { error: "Image must be 2MB or smaller." },
      { status: 413 }
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const kind = detectImageKind(bytes)
  if (!kind) {
    return NextResponse.json(
      { error: "Upload a JPEG, PNG, or WebP image." },
      { status: 415 }
    )
  }

  await writeAvatar(session.user.id, bytes, kind)

  // The query string busts caches (ours and the browser's) so a replaced
  // avatar shows up immediately instead of serving the previous image.
  const imageUrl = `/api/avatars/${encodeURIComponent(session.user.id)}?v=${Date.now()}`
  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: imageUrl },
  })

  return NextResponse.json({ image: imageUrl })
}

export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await removeAvatar(session.user.id)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: null },
  })

  return NextResponse.json({ ok: true })
}
