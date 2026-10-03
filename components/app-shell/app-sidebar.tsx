"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowRight,
  Bell,
  SquaresFour,
  Lifebuoy,
  Plug,
  Target,
  UsersThree,
} from "@phosphor-icons/react/ssr"

import { AiAssistantDialog } from "@/components/ai/ai-assistant-dialog"
import {
  WorkspaceSwitcher,
  type SwitchableWorkspace,
} from "@/components/app-shell/workspace-switcher"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type NavItem = {
  href: string
  label: string
  icon: typeof SquaresFour
  badge?: number
}

type NavSection = {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Dashboard",
    items: [
      { href: "/dashboard", label: "Overview", icon: SquaresFour },
      { href: "/competitors", label: "Competitors", icon: Target },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/team", label: "Team", icon: UsersThree },
      { href: "/integrations", label: "Integrations", icon: Plug },
    ],
  },
]

const ACTIVE_ITEM_CLASSNAME =
  "rounded-full data-active:bg-background data-active:text-foreground data-active:shadow-sm data-active:ring-1 data-active:ring-border data-active:hover:bg-background data-active:hover:text-foreground"

function AskAiPromoCard() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl bg-background p-4 group-data-[collapsible=icon]:hidden">
        <svg viewBox="0 0 64 48" className="h-10 w-16" aria-hidden="true">
          <rect x="4" y="6" width="36" height="26" rx="6" className="fill-primary/15" />
          <circle cx="46" cy="30" r="14" className="fill-primary/25" />
          <path
            d="M14 18h20M14 24h14"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="text-primary/60"
          />
          <path
            d="M46 23v14M39 30h14"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="text-primary"
          />
        </svg>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold">Ask the AI assistant</span>
          <span className="text-xs text-muted-foreground">
            Get instant answers about any competitor change.
          </span>
        </div>
        <Button
          size="sm"
          className="w-full rounded-full"
          onClick={() => setOpen(true)}
        >
          Ask now
          <ArrowRight />
        </Button>
      </div>
      <AiAssistantDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

export function AppSidebar({
  workspaces,
  activeWorkspaceId,
}: {
  workspaces: SwitchableWorkspace[]
  activeWorkspaceId: string
}) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
        />
      </SidebarHeader>
      <SidebarContent>
        {NAV_SECTIONS.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="uppercase tracking-wide">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={pathname.startsWith(item.href)}
                      className={ACTIVE_ITEM_CLASSNAME}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {typeof item.badge === "number" && item.badge > 0 && (
                      <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <AskAiPromoCard />
        <SidebarGroupLabel className="uppercase tracking-wide">
          Support
        </SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Help & Support"
              render={<a href="mailto:support@intelflock.com" />}
            >
              <Lifebuoy />
              <span>Help & Support</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
