"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export type InvitationOffer = {
  id: string
  role: string
  workspaceName: string
}

export function PendingInvitations({ invitations }: { invitations: InvitationOffer[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function respond(invitationId: string, action: "accept" | "reject") {
    setPendingId(invitationId)
    const res = await fetch(`/api/invitations/${invitationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    setPendingId(null)

    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      toast.error(result.error ?? "Something went wrong.")
      return
    }

    if (action === "accept") {
      router.push("/dashboard")
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex flex-col gap-3 rounded-2xl bg-card p-6 ring-1 ring-foreground/10"
        >
          <div>
            <p className="text-sm font-medium">{invitation.workspaceName}</p>
            <p className="text-sm text-muted-foreground">
              You&apos;ve been invited to join as {invitation.role}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={pendingId === invitation.id}
              onClick={() => respond(invitation.id, "accept")}
            >
              {pendingId === invitation.id && <Spinner />}
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pendingId === invitation.id}
              onClick={() => respond(invitation.id, "reject")}
            >
              Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
