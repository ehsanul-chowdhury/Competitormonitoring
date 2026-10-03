import { headers } from "next/headers"
import { redirect } from "next/navigation"
import type { ChangePriority } from "@prisma/client"

import { auth } from "@/lib/auth"
import { apiFetch } from "@/lib/backend-client"
import { getCurrentWorkspace, getUserWorkspaces } from "@/lib/workspace"
import { AppSidebar } from "@/components/app-shell/app-sidebar"
import { NotificationsBell } from "@/components/app-shell/notifications-bell"
import { ThemeToggle } from "@/components/app-shell/theme-toggle"
import { TopbarSearch } from "@/components/app-shell/topbar-search"
import { TopbarUserMenu } from "@/components/app-shell/topbar-user-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000

function isRecentChange(createdAt: Date) {
  return Date.now() - createdAt.getTime() < RECENT_WINDOW_MS
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Checked before touching the workspace/notifications APIs at all: an
  // unverified account has nothing to gate per-feature, so there's no reason
  // to pay for those calls before bouncing to /verify-email.
  const session = await auth.api.getSession({ headers: await headers() })
  if (session && !session.user.emailVerified) {
    redirect("/verify-email")
  }

  const workspace = await getCurrentWorkspace()
  if (!workspace) {
    redirect("/onboarding")
  }

  const workspaces = await getUserWorkspaces()

  const notifications = await apiFetch<{
    changes: {
      id: string
      summary: string
      priority: ChangePriority
      competitorName: string
      createdAt: string
    }[]
  }>({ id: workspace.userId, email: workspace.userEmail }, `/notifications?workspaceId=${workspace.id}`)

  const recentChanges = notifications.changes.slice(0, 5).map((change) => ({
    id: change.id,
    summary: change.summary,
    priority: change.priority,
    competitorName: change.competitorName,
    createdAt: new Date(change.createdAt),
    isRecent: isRecentChange(new Date(change.createdAt)),
  }))

  return (
    <SidebarProvider>
      <AppSidebar workspaces={workspaces} activeWorkspaceId={workspace.id} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4">
          <SidebarTrigger variant="ghost" />
          <Separator orientation="vertical" className="h-6" />
          <TopbarSearch />
          <div className="ml-auto flex items-center gap-1">
            <NotificationsBell changes={recentChanges} />
            <ThemeToggle />
            <Separator orientation="vertical" className="mx-2 h-6" />
            <TopbarUserMenu
              userEmail={workspace.userEmail}
              userName={session?.user.name}
              userImage={session?.user.image}
            />
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
