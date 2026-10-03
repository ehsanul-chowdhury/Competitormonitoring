import { cn } from "@/lib/utils"

/** The IntelFlock mark: a signal radiating from a fixed point, standing in
 * for "something is being watched." Pure stroke/fill on `currentColor` so it
 * drops into any surface (light, dark, or the auth panel's permanent dark
 * background) without a separate variant. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="12" cy="12" r="5.75" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path
        d="M12 1.25v2.5M12 20.25v2.5M22.75 12h-2.5M3.75 12h-2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark className="size-5" />
      IntelFlock
    </span>
  )
}
