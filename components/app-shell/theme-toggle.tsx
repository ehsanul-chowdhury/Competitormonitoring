"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { MoonStars, SunDim } from "@phosphor-icons/react/ssr"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Hydration guard: resolvedTheme is undefined on the server, so the icon
  // must stay stable through the first client render and only switch once
  // mounted, or React warns about a hydration mismatch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? <SunDim /> : <MoonStars />}
    </Button>
  )
}
