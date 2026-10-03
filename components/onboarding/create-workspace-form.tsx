"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { createWorkspaceSchema, type CreateWorkspaceInput } from "@/lib/validations/auth"
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
import { Spinner } from "@/components/ui/spinner"

export function CreateWorkspaceForm() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(createWorkspaceSchema),
  })

  // React Hook Form's isSubmitting only flips after the first re-render,
  // which leaves a synchronous window where a fast double-click fires two
  // submits before the button disables. This ref closes that window
  // immediately instead of waiting on React.
  const submittingRef = useRef(false)

  async function onSubmit(values: CreateWorkspaceInput) {
    if (submittingRef.current) return
    submittingRef.current = true
    setFormError(null)

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (res.status === 401) {
        // The session wasn't recognized for this request. Rather than leave
        // the user stuck on a form they can't get past, send them to
        // re-authenticate, which resolves it whether the session had expired
        // or simply hadn't propagated yet.
        router.push("/login")
        return
      }

      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        setFormError(result.error ?? "Something went wrong.")
        return
      }

      router.push("/dashboard")
      router.refresh()
    } finally {
      submittingRef.current = false
    }
  }

  return (
    // submittingRef.current is only ever read/written inside onSubmit's body,
    // which runs when the form actually fires rather than during this render,
    // the lint rule can't see through handleSubmit's closure to tell the two
    // apart.
    // eslint-disable-next-line react-hooks/refs
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Workspace name</FieldLabel>
          <Input
            id="name"
            placeholder="Acme Inc."
            autoComplete="organization"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          <FieldError errors={[errors.name]} />
          <FieldDescription>
            Usually your company name. You can invite teammates after.
          </FieldDescription>
        </Field>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Create workspace
        </Button>
      </FieldGroup>
    </form>
  )
}
