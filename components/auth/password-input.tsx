"use client"

import { useState } from "react"
import { Eye, EyeSlash } from "@phosphor-icons/react/ssr"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

/** Password field with an inline reveal toggle. The button is
 * `tabIndex={-1}` so tabbing runs straight from the field to the submit
 * button rather than detouring through a visual affordance. */
export function PasswordInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      >
        {visible ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
