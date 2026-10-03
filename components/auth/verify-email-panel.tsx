"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Envelope } from "@phosphor-icons/react/ssr"
import { toast } from "sonner"

import { sendVerificationEmail, signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function VerifyEmailPanel({ email }: { email: string }) {
  const router = useRouter()
  const [isSending, setIsSending] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleResend() {
    setIsSending(true)
    const { error } = await sendVerificationEmail({ email, callbackURL: "/dashboard" })
    setIsSending(false)

    if (error) {
      toast.error("Couldn't send that. Try again in a moment.")
      return
    }
    toast.success(`Verification link sent to ${email}.`)
  }

  async function handleSignOut() {
    setIsSigningOut(true)
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Envelope className="size-6" />
      </span>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to{" "}
          <span className="font-medium text-foreground">{email}</span>. Click it to
          unlock your dashboard.
        </p>
      </div>

      <Button
        type="button"
        size="lg"
        onClick={handleResend}
        disabled={isSending}
        className="w-full bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
      >
        {isSending && <Spinner />}
        Resend email
      </Button>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
      >
        Sign in with a different account
      </button>
    </div>
  )
}
