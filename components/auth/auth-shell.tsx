import Link from "next/link"

import { ThemeToggle } from "@/components/app-shell/theme-toggle"
import { AuthVisualPanel } from "@/components/auth/auth-visual-panel"
import { LogoMark } from "@/components/brand/logo-mark"

/** Split screen: a single centered column for the form, with the brand
 * gradient filling the other half. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative flex flex-col items-center justify-center px-6 py-16">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <div className="flex w-full max-w-sm flex-col items-center gap-10">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark className="size-6" />
            <span className="text-lg font-bold tracking-tight">IntelFlock</span>
          </Link>

          <div className="w-full">{children}</div>
        </div>
      </div>

      <AuthVisualPanel />
    </div>
  )
}
