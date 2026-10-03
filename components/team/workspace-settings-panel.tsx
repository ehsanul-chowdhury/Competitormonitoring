"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { FloppyDisk, Trash } from "@phosphor-icons/react/ssr"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  updateWorkspaceSchema,
  type UpdateWorkspaceInput,
} from "@/lib/validations/workspace"
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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"

export function WorkspaceSettingsPanel({
  workspaceId,
  name,
  slug,
  productProfile,
  canManage,
  canDelete,
}: {
  workspaceId: string
  name: string
  slug: string
  productProfile: string
  canManage: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateWorkspaceInput>({
    resolver: zodResolver(updateWorkspaceSchema),
    values: { name, slug, productProfile },
  })

  async function onSave(values: UpdateWorkspaceInput) {
    const res = await fetch(`/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      toast.error(result.error ?? "Couldn't save changes.")
      return
    }

    toast.success("Workspace updated.")
    router.refresh()
  }

  async function onDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    const res = await fetch(`/api/workspaces/${workspaceId}`, { method: "DELETE" })
    setIsDeleting(false)

    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      setDeleteError(result.error ?? "Something went wrong.")
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSubmit(onSave)}
        noValidate
        className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-foreground/10"
      >
        <div>
          <h2 className="text-sm font-medium">Workspace details</h2>
          <p className="text-sm text-muted-foreground">
            Update the workspace name and slug shown across the app.
          </p>
        </div>

        <FieldGroup>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="workspace-name">Name</FieldLabel>
            <Input
              id="workspace-name"
              disabled={!canManage}
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.slug}>
            <FieldLabel htmlFor="workspace-slug">Slug</FieldLabel>
            <Input
              id="workspace-slug"
              disabled={!canManage}
              aria-invalid={!!errors.slug}
              {...register("slug")}
            />
            <FieldError errors={[errors.slug]} />
            <FieldDescription>
              Slugs are normalized to lowercase letters, numbers, and hyphens.
            </FieldDescription>
          </Field>

          <Field data-invalid={!!errors.productProfile}>
            <FieldLabel htmlFor="workspace-product">Your product</FieldLabel>
            <Textarea
              id="workspace-product"
              rows={5}
              disabled={!canManage}
              placeholder="What you sell, who it's for, roughly what you charge, and how you position against alternatives."
              aria-invalid={!!errors.productProfile}
              {...register("productProfile")}
            />
            <FieldError errors={[errors.productProfile]} />
            <FieldDescription>
              Used to judge competitor moves against you. It&apos;s what lets a
              change read as &ldquo;40% cheaper than your comparable plan&rdquo;
              instead of just describing their page.
            </FieldDescription>
          </Field>
        </FieldGroup>

        {canManage && (
          <div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : <FloppyDisk />}
              Save changes
            </Button>
          </div>
        )}
      </form>

      {canDelete && (
        <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-destructive/30">
          <div>
            <h2 className="text-sm font-medium">Danger zone</h2>
            <p className="text-sm text-muted-foreground">
              You can delete this workspace only if you belong to another one.
            </p>
          </div>
          {deleteError && (
            <Alert variant="destructive">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash />
              Delete workspace
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes all competitors, tracked pages, scans, and
              change history in this workspace. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Spinner />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
