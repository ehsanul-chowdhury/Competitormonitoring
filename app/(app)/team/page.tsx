import { redirect } from "next/navigation"
import type { WorkspaceRole } from "@prisma/client"

import { apiFetch } from "@/lib/backend-client"
import { getCurrentWorkspace, getUserWorkspaces } from "@/lib/workspace"
import { InvitationList } from "@/components/team/invitation-list"
import { InviteMemberForm } from "@/components/team/invite-member-form"
import { MemberList } from "@/components/team/member-list"
import { WorkspaceSettingsPanel } from "@/components/team/workspace-settings-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function TeamPage() {
  const workspace = await getCurrentWorkspace()
  if (!workspace) {
    redirect("/onboarding")
  }

  const canManage = workspace.role === "owner" || workspace.role === "admin"

  const currentUser = { id: workspace.userId, email: workspace.userEmail }

  const [memberRows, invitationRows, userWorkspaces] = await Promise.all([
    apiFetch<{ userId: string; role: WorkspaceRole; user: { email: string; name: string | null } }[]>(
      currentUser,
      `/workspaces/${workspace.id}/members`
    ),
    apiFetch<{ id: string; email: string; role: WorkspaceRole; createdAt: string; expiresAt: string }[]>(
      currentUser,
      `/workspaces/${workspace.id}/invitations`
    ),
    getUserWorkspaces(),
  ])
  const otherWorkspaceCount = userWorkspaces.filter((w) => w.id !== workspace.id).length

  const members = memberRows.map((row) => ({
    userId: row.userId,
    email: row.user.email,
    name: row.user.name,
    role: row.role,
  }))

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">Team</h1>
        <p className="text-sm text-muted-foreground">
          Manage members, invitations, and settings for {workspace.name}.
        </p>
      </header>

      <Tabs defaultValue="members">
        <TabsList className="rounded-full">
          <TabsTrigger value="members" className="rounded-full">
            Members
          </TabsTrigger>
          <TabsTrigger value="invitations" className="rounded-full">
            Invitations
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-full">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <div className="flex flex-col gap-6">
            {canManage && <InviteMemberForm workspaceId={workspace.id} />}
            <MemberList
              workspaceId={workspace.id}
              members={members}
              canManage={canManage}
              currentUserId={workspace.userId}
            />
          </div>
        </TabsContent>

        <TabsContent value="invitations" className="mt-4">
          <InvitationList
            workspaceId={workspace.id}
            invitations={invitationRows.map((row) => ({
              ...row,
              createdAt: new Date(row.createdAt),
              expiresAt: new Date(row.expiresAt),
            }))}
            canManage={canManage}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <WorkspaceSettingsPanel
            workspaceId={workspace.id}
            name={workspace.name}
            slug={workspace.slug}
            productProfile={workspace.productProfile ?? ""}
            canManage={canManage}
            canDelete={workspace.role === "owner" && otherWorkspaceCount > 0}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
