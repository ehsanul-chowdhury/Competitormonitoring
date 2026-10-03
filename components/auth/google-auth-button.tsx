"use client"

import { useState } from "react"
import { toast } from "sonner"

import { signIn } from "@/lib/auth-client"
import { GoogleIcon } from "@/components/auth/google-icon"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function GoogleAuthButton({
  label = "Continue with Google",
}: {
  label?: string
}) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleClick() {
    setIsLoading(true)
    const { error } = await signIn.social({ provider: "google", callbackURL: "/" })
    // A successful call navigates away via redirect, so only the failure
    // path ever reaches this line, reset the spinner and say what happened
    // rather than leaving the button stuck mid-click.
    if (error) {
      setIsLoading(false)
      toast.error("Google sign-in isn't set up yet. Try email instead.")
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      disabled={isLoading}
      onClick={handleClick}
    >
      {isLoading ? <Spinner /> : <GoogleIcon className="size-4" />}
      {label}
    </Button>
  )
}
