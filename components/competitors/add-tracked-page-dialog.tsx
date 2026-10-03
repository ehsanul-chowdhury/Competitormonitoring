"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "@phosphor-icons/react/ssr"
import { Controller, useForm } from "react-hook-form"

import {
  PAGE_CATEGORIES,
  SCAN_INTERVAL_OPTIONS,
  trackedPageSchema,
  type TrackedPageInput,
} from "@/lib/validations/competitor"
import { PAGE_CATEGORY_LABELS } from "@/lib/page-categories"
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

export function AddTrackedPageDialog({
  competitorId,
  workspaceId,
}: {
  competitorId: string
  workspaceId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
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
    setFormError(null)
    const res = await fetch("/api/tracked-pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, competitorId, ...values }),
    })

    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      setFormError(result.error ?? "Something went wrong.")
      return
    }

    setOpen(false)
    reset()
    router.refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          reset()
          setFormError(null)
        }
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <Plus />
            Add page
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track a page</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <Field data-invalid={!!errors.url}>
              <FieldLabel htmlFor="page-url">URL</FieldLabel>
              <Input
                id="page-url"
                placeholder="https://acme.com/pricing"
                aria-invalid={!!errors.url}
                {...register("url")}
              />
              <FieldError errors={[errors.url]} />
            </Field>
            <Field data-invalid={!!errors.label}>
              <FieldLabel htmlFor="page-label">Label (optional)</FieldLabel>
              <Input
                id="page-label"
                placeholder="Enterprise pricing"
                aria-invalid={!!errors.label}
                {...register("label")}
              />
              <FieldError errors={[errors.label]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="page-category">Category</FieldLabel>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="page-category" className="w-full">
                      <SelectValue>
                        {(value: TrackedPageInput["category"]) =>
                          PAGE_CATEGORY_LABELS[value]
                        }
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
            </Field>
            <Field>
              <FieldLabel htmlFor="page-interval">Scan frequency</FieldLabel>
              <Controller
                control={control}
                name="scanIntervalMinutes"
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}
                  >
                    <SelectTrigger id="page-interval" className="w-full">
                      <SelectValue>
                        {(value: string) =>
                          SCAN_INTERVAL_OPTIONS.find(
                            (option) => String(option.value) === value
                          )?.label
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SCAN_INTERVAL_OPTIONS.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={String(option.value)}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Add page
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
