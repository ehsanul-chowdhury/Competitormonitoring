import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const AVATAR_TONES = [
  "bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900",
  "bg-neutral-700 text-neutral-50 dark:bg-neutral-300 dark:text-neutral-900",
  "bg-neutral-500 text-neutral-50 dark:bg-neutral-500 dark:text-neutral-50",
  "bg-neutral-300 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-50",
]

export function avatarToneForName(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length]
}

export function displayNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? email
  const words = localPart.split(/[._-]+/).filter(Boolean)
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Some providers default `name` to the email address; treat that as unset so
// the UI doesn't print the same string twice.
export function resolveDisplayName(
  name: string | null | undefined,
  email: string
): string {
  const trimmed = name?.trim()
  if (trimmed && !trimmed.includes("@")) return trimmed
  return displayNameFromEmail(email)
}

const RELATIVE_TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
]

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

const COMPACT_UNITS: [string, number][] = [
  ["y", 31536000],
  ["mo", 2592000],
  ["d", 86400],
  ["h", 3600],
  ["m", 60],
]

/** Terse form for dense rows: "5h ago", "in 6h". */
export function formatCompactRelativeTime(date: Date, now: Date = new Date()): string {
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000)
  const absSeconds = Math.abs(diffSeconds)
  const isPast = diffSeconds < 0

  if (absSeconds < 60) return isPast ? "just now" : "in <1m"

  for (const [unit, secondsInUnit] of COMPACT_UNITS) {
    if (absSeconds >= secondsInUnit) {
      const amount = Math.round(absSeconds / secondsInUnit)
      return isPast ? `${amount}${unit} ago` : `in ${amount}${unit}`
    }
  }
  return isPast ? "just now" : "in <1m"
}

export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000)
  const absSeconds = Math.abs(diffSeconds)

  for (const [unit, secondsInUnit] of RELATIVE_TIME_UNITS) {
    if (absSeconds >= secondsInUnit) {
      return relativeTimeFormatter.format(Math.round(diffSeconds / secondsInUnit), unit)
    }
  }
  return relativeTimeFormatter.format(diffSeconds, "second")
}
