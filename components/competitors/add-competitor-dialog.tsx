"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Plus } from "@phosphor-icons/react/ssr"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  createCompetitorSchema,
  type CreateCompetitorInput,
} from "@/lib/validations/competitor"
import {
  PAGE_CATEGORIES,
  trackedPageSchema,
  type TrackedPageInput,
} from "@/lib/validations/competitor"
import { PAGE_CATEGORY_LABELS } from "@/lib/page-categories"
import { DiscoverPagesPanel } from "@/components/competitors/discover-pages-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"

/** Compact single-URL form used inline in the "add competitor" wizard's pages
 * step. The full dialog, with label and interval fields, remains available from
 * the competitor's Pages tab. */
function QuickAddPageForm({
  competitorId,
  workspaceId,
}: {
  competitorId: string
  workspaceId: string
}) {
  const router = useRouter()
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrackedPageInput>({
    resolver: zodResolver(trackedPageSchema),
    defaultValues: { category: "other", scanIntervalMinutes: 720, label: "" },
  })

  async function onSubmit(values: TrackedPageInput) {
    const res = await fetch("/api/tracked-pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, competitorId, ...values }),
    })

    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      toast.error(result.error ?? "Something went wrong.")
      return
    }

    toast("Page added.")
    reset({ url: "", category: values.category, scanIntervalMinutes: 720, label: "" })
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex items-start gap-2"
    >
      <Field data-invalid={!!errors.url} className="flex-1">
        <Input
          placeholder="https://acme.com/pricing"
          aria-invalid={!!errors.url}
          {...register("url")}
        />
        <FieldError errors={[errors.url]} />
      </Field>
      <Controller
        control={control}
        name="category"
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className="w-32">
              <SelectValue>
                {(value: TrackedPageInput["category"]) => PAGE_CATEGORY_LABELS[value]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PAGE_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {PAGE_CATEGORY_LABELS[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <Button type="submit" size="icon" disabled={isSubmitting}>
        {isSubmitting ? <Spinner /> : <Plus />}
      </Button>
    </form>
  )
}

export function AddCompetitorDialog({
  workspaceId,
  trigger,
}: {
  workspaceId: string
  trigger?: React.ReactElement
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [createdCompetitor, setCreatedCompetitor] = useState<{
    id: string
    name: string
  } | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCompetitorInput>({
    resolver: zodResolver(createCompetitorSchema),
  })

  function resetAll() {
    reset()
    setFormError(null)
    setCreatedCompetitor(null)
  }

  async function onSubmit(values: CreateCompetitorInput) {
    setFormError(null)
    const res = await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, ...values }),
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setFormError(data.error ?? "Something went wrong.")
      return
    }

    router.refresh()
    setCreatedCompetitor(data)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetAll()
      }}
    >
      <DialogTrigger
        nativeButton={!trigger}
        render={
          trigger ?? (
            <Button className="rounded-full">
              <Plus />
              Add competitor
            </Button>
          )
        }
      />
      <DialogContent className={createdCompetitor ? "sm:max-w-lg" : undefined}>
        {!createdCompetitor ? (
          <>
            <DialogHeader>
              <DialogTitle>Add a competitor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <FieldGroup>
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                <Field data-invalid={!!errors.name}>
                  <FieldLabel htmlFor="competitor-name">Name</FieldLabel>
                  <Input
                    id="competitor-name"
                    placeholder="Acme Corp"
                    aria-invalid={!!errors.name}
                    {...register("name")}
                  />
                  <FieldError errors={[errors.name]} />
                </Field>
                <Field data-invalid={!!errors.domain}>
                  <FieldLabel htmlFor="competitor-domain">Domain</FieldLabel>
                  <Input
                    id="competitor-domain"
                    placeholder="acme.com"
                    aria-invalid={!!errors.domain}
                    {...register("domain")}
                  />
                  <FieldError errors={[errors.domain]} />
                </Field>
              </FieldGroup>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Spinner />}
                  Add competitor
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {createdCompetitor.name} added. Now add pages to track
              </DialogTitle>
            </DialogHeader>

            <QuickAddPageForm
              competitorId={createdCompetitor.id}
              workspaceId={workspaceId}
            />

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Separator className="flex-1" />
              or discover pages automatically
              <Separator className="flex-1" />
            </div>

            <DiscoverPagesPanel
              competitorId={createdCompetitor.id}
              workspaceId={workspaceId}
            />

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  resetAll()
                }}
              >
                <Check />
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
