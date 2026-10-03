"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Gear, SignOut } from "@phosphor-icons/react/ssr"

import { signOut } from "@/lib/auth-client"
import { cn, avatarToneForName, resolveDisplayName } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function TopbarUserMenu({
  userEmail,
  userName,
  userImage,
}: {
  userEmail: string
  userName?: string | null
  userImage?: string | null
}) {
  const router = useRouter()
  const displayName = resolveDisplayName(userName, userEmail)
  const initial = displayName.charAt(0).toUpperCase()
  const tone = avatarToneForName(userEmail)

  async function handleSignOut() {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" className="outline-none" aria-label="Account menu">
            <Avatar className="size-9">
              {userImage && <AvatarImage src={userImage} alt="" />}
              <AvatarFallback
                className={cn("font-semibold", tone)}
              >
                {initial}
              </AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-64 p-1.5">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar className="size-9 shrink-0">
            {userImage && <AvatarImage src={userImage} alt="" />}
            <AvatarFallback
              className={cn("font-semibold", tone)}
            >
              {initial}
            </AvatarFallback>
          </Avatar>
          {/* min-w-0 lets the truncation engage. Without it the flex
              child refuses to shrink and long addresses blow out the menu. */}
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium leading-tight">
              {displayName}
            </span>
            <span className="truncate text-xs leading-tight text-muted-foreground">
              {userEmail}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="gap-2.5 px-2 py-2 text-sm"
          render={<Link href="/account" />}
        >
          <Gear className="size-4" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="gap-2.5 px-2 py-2 text-sm" onClick={handleSignOut}>
          <SignOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
