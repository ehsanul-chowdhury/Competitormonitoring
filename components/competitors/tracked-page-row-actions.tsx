"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  DotsThree,
  Pause,
  Play,
  ArrowsClockwise,
  Trash,
} from "@phosphor-icons/react/ssr"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"

export function TrackedPageRowActions({
  workspaceId,
  trackedPageId,
  isActive,
  url,
}: {
  workspaceId: string
  trackedPageId: string
  isActive: boolean
  url: string
}) {
  const router = useRouter()
  const [isToggling, setIsToggling] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function onToggle() {
    setIsToggling(true)
    await fetch(`/api/tracked-pages/${trackedPageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, isActive: !isActive }),
    })
    setIsToggling(false)
    router.refresh()
  }

  async function onScanNow() {
    setIsScanning(true)
    try {
      const res = await fetch("/api/scans/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracked_page_id: trackedPageId }),
      })
      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error ?? "Scan failed")
        return
      }

      const messages: Record<string, string> = {
        success: result.changeEventCreated
          ? "Scan complete. A change was found."
          : "Scan complete. No meaningful change.",
        skipped_no_change: "Scan complete. Content is unchanged.",
        skipped_robots: "This page's robots.txt disallows scanning.",
        error: "Scan failed.",
      }
      toast(messages[result.status] ?? "Scan finished.")
      router.refresh()
    } catch {
      toast.error("Couldn't reach the scan service.")
    } finally {
      setIsScanning(false)
    }
  }

  async function onDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    const res = await fetch(`/api/tracked-pages/${trackedPageId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    })
    setIsDeleting(false)

    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      setDeleteError(result.error ?? "Something went wrong.")
      return
    }

    setDeleteOpen(false)
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" className="rounded-full">
              <DotsThree />
              <span className="sr-only">Actions</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onScanNow} disabled={isScanning || !isActive}>
            {isScanning ? <Spinner /> : <ArrowsClockwise />}
            Scan now
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggle} disabled={isToggling}>
            {isActive ? <Pause /> : <Play />}
            {isActive ? "Pause tracking" : "Resume tracking"}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop tracking this page?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes scan and change history for {url}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Spinner />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
