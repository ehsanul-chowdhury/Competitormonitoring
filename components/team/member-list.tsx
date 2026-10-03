"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash } from "@phosphor-icons/react/ssr"
import { toast } from "sonner"

import { cn, displayNameFromEmail, avatarToneForName } from "@/lib/utils"
import { WORKSPACE_ROLES } from "@/lib/validations/workspace"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type TeamMember = {
  userId: string
  email: string
  name: string | null
  role: string
}

export function MemberList({
  workspaceId,
  members,
  canManage,
  currentUserId,
}: {
  workspaceId: string
  members: TeamMember[]
  canManage: boolean
  currentUserId: string
}) {
  const router = useRouter()
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  async function onRoleChange(userId: string, role: string) {
    setPendingUserId(userId)
    const res = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
    setPendingUserId(null)

    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      toast.error(result.error ?? "Couldn't update the role.")
      return
    }
    toast.success("Role updated.")
    router.refresh()
  }

  async function onRemove(userId: string) {
    setPendingUserId(userId)
    const res = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
      method: "DELETE",
    })
    setPendingUserId(null)

    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      toast.error(result.error ?? "Couldn't remove that member.")
      return
    }
    toast.success("Member removed.")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
      <div>
        <h2 className="text-sm font-medium">Users</h2>
        <p className="text-sm text-muted-foreground">
          {members.length} member{members.length === 1 ? "" : "s"} in this workspace.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead className="w-44">Role</TableHead>
            <TableHead className="w-12 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const displayName = member.name || displayNameFromEmail(member.email)
            const isPending = pendingUserId === member.userId

            return (
              <TableRow key={member.userId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback
                        className={cn(
                          "text-sm font-semibold",
                          avatarToneForName(member.email)
                        )}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{displayName}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {member.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {canManage ? (
                    <Select
                      value={member.role}
                      onValueChange={(v) => onRoleChange(member.userId, v as string)}
                      disabled={isPending}
                    >
                      <SelectTrigger size="sm">
                        <SelectValue>{(value: string) => value}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {WORKSPACE_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-muted-foreground">{member.role}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {(canManage || member.userId === currentUserId) && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
                      onClick={() => onRemove(member.userId)}
                      aria-label={
                        member.userId === currentUserId ? "Leave workspace" : "Remove member"
                      }
                    >
                      <Trash />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
