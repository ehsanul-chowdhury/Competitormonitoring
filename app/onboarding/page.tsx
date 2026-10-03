import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { apiFetch } from "@/lib/backend-client"
import { getCurrentWorkspace } from "@/lib/workspace"
import { LogoWordmark } from "@/components/brand/logo-mark"
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"
import { PendingInvitations } from "@/components/onboarding/pending-invitations"

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  // `?new=1` is how the workspace switcher reaches this page deliberately.
  // Without it, anyone who already has a workspace is bounced to the dashboard
  // and could never create a second one.
  const isCreatingAdditional = (await searchParams).new === "1"
  const workspace = await getCurrentWorkspace()
  if (workspace && !isCreatingAdditional) {
    redirect("/dashboard")
  }

  const session = await auth.api.getSession({ headers: await headers() })
  const invitationRows = session
    ? await apiFetch<{ id: string; role: "owner" | "admin" | "member"; workspace: { name: string } }[]>(
        session.user,
        "/invitations/pending"
      )
    : []

  const invitations = invitationRows.map((row) => ({
    id: row.id,
    role: row.role,
    workspaceName: row.workspace.name,
  }))

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6">
      <LogoWordmark className="text-lg" />

      {invitations.length > 0 && (
        <div className="flex w-full max-w-xl flex-col gap-3">
          <div>
            <h1 className="text-lg font-semibold">You&apos;ve been invited</h1>
            <p className="text-sm text-muted-foreground">
              Join an existing workspace, or set up your own below.
            </p>
          </div>
          <PendingInvitations invitations={invitations} />
        </div>
      )}

      <OnboardingWizard isAdditional={isCreatingAdditional} />
    </div>
  )
}
