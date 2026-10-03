"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserPlus } from "@phosphor-icons/react/ssr"
import { toast } from "sonner"

import { formatRelativeTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type PendingInvitation = {
  id: string
  email: string
  role: string
  createdAt: Date
  expiresAt: Date
}

export function InvitationList({
  workspaceId,
  invitations,
  canManage,
}: {
  workspaceId: string
  invitations: PendingInvitation[]
  canManage: boolean
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function onCancel(invitationId: string) {
    setPendingId(invitationId)
    const res = await fetch(
      `/api/workspaces/${workspaceId}/invitations/${invitationId}`,
      { method: "DELETE" }
    )
    setPendingId(null)

    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      toast.error(result.error ?? "Couldn't cancel that invitation.")
      return
    }
    toast.success("Invitation canceled.")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
      <div>
        <h2 className="text-sm font-medium">Pending invitations</h2>
        <p className="text-sm text-muted-foreground">
          Invitation records are visible here until accepted, rejected, or canceled.
        </p>
      </div>

      {invitations.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserPlus />
            </EmptyMedia>
            <EmptyTitle>No invitations</EmptyTitle>
            <EmptyDescription>
              New invitations will appear here until accepted, rejected, or canceled.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead className="w-28">Role</TableHead>
              <TableHead className="w-36">Invited</TableHead>
              <TableHead className="w-24 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell className="font-medium">{invitation.email}</TableCell>
                <TableCell className="text-muted-foreground">{invitation.role}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRelativeTime(invitation.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pendingId === invitation.id}
                      onClick={() => onCancel(invitation.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
