import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { AuthShell } from "@/components/auth/auth-shell"
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel"

export default async function VerifyEmailPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  if (session.user.emailVerified) redirect("/dashboard")

  return (
    <AuthShell>
      <VerifyEmailPanel email={session.user.email} />
    </AuthShell>
  )
}
