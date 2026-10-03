"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { FloppyDisk, Trash } from "@phosphor-icons/react/ssr"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  updateCompetitorSchema,
  type UpdateCompetitorInput,
} from "@/lib/validations/competitor"
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

export function CompetitorSettingsPanel({
  workspaceId,
  competitorId,
  name,
  domain,
  isActive,
}: {
  workspaceId: string
  competitorId: string
  name: string
  domain: string
  isActive: boolean
}) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UpdateCompetitorInput>({
    resolver: zodResolver(updateCompetitorSchema),
    values: { name, domain, isActive },
  })

  async function onSave(values: UpdateCompetitorInput) {
    const res = await fetch(`/api/competitors/${competitorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, ...values }),
    })

    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      toast.error(result.error ?? "Couldn't save changes.")
      return
    }

    toast.success("Competitor details saved.")
    router.refresh()
  }

  async function onDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    const res = await fetch(`/api/competitors/${competitorId}`, {
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

    router.push("/competitors")
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSubmit(onSave)}
        noValidate
        className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-foreground/10"
      >
        <div>
          <h2 className="text-sm font-medium">Competitor details</h2>
          <p className="text-sm text-muted-foreground">
            Update the competitor identity and website being monitored.
          </p>
        </div>

        <FieldGroup>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="settings-name">Name</FieldLabel>
            <Input id="settings-name" aria-invalid={!!errors.name} {...register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.domain}>
            <FieldLabel htmlFor="settings-domain">Website URL</FieldLabel>
            <Input id="settings-domain" aria-invalid={!!errors.domain} {...register("domain")} />
            <FieldError errors={[errors.domain]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="settings-active">Automatic monitoring</FieldLabel>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? "active" : "paused"}
                  onValueChange={(v) => field.onChange(v === "active")}
                >
                  <SelectTrigger id="settings-active">
                    <SelectValue>
                      {(value: string) => (value === "active" ? "Active" : "Paused")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldDescription>
              Paused competitors are excluded from automatic scans.
            </FieldDescription>
          </Field>
        </FieldGroup>

        <div>
          <Button type="submit" disabled={isSubmitting} className="rounded-full">
            {isSubmitting ? <Spinner /> : <FloppyDisk />}
            Save changes
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-destructive/30">
        <div>
          <h2 className="text-sm font-medium">Danger zone</h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete this competitor and all monitoring information.
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
            className="rounded-full"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash />
            Delete competitor
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes all tracked pages, scans, and change history for
              this competitor. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete} disabled={isDeleting}>
              {isDeleting && <Spinner />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
