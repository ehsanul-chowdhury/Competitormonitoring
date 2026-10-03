"use client"

import { useState } from "react"

import { getScreenshotUrl } from "@/lib/screenshot"
import { cn, avatarToneForName } from "@/lib/utils"

export function CompetitorLogo({
  name,
  domain,
  className,
}: {
  name: string
  domain: string
  className?: string
}) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl p-6",
        avatarToneForName(name),
        className
      )}
    >
      {!imageFailed && (
        // eslint-disable-next-line @next/next/no-img-element -- external, unsized screenshot from a third-party API; next/image can't optimize it.
        <img
          src={getScreenshotUrl(domain)}
          alt={`${name} homepage screenshot`}
          className="absolute inset-0 size-full object-cover object-top"
          onError={() => setImageFailed(true)}
        />
      )}
      {/* The tone class already carries matching ink, so the fallback wordmark
          inherits it rather than assuming a dark tile behind white text. */}
      {imageFailed && (
        <span className="truncate text-2xl font-bold">{name}</span>
      )}
    </div>
  )
}
