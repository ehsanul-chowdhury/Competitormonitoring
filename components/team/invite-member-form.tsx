"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { EnvelopeSimple } from "@phosphor-icons/react/ssr"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  ASSIGNABLE_ROLES,
  inviteMemberSchema,
  type InviteMemberInput,
} from "@/lib/validations/workspace"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

export function InviteMemberForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", role: "member" },
  })

  async function onSubmit(values: InviteMemberInput) {
    setFormError(null)
    const res = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      setFormError(result.error ?? "Something went wrong.")
      return
    }

    toast.success(`Invitation sent to ${values.email}.`)
    reset({ email: "", role: values.role })
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-foreground/10"
    >
      <div>
        <h2 className="text-sm font-medium">Invite member</h2>
        <p className="text-sm text-muted-foreground">
          Invitations stay in-app and appear in the recipient&apos;s notification center.
        </p>
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field data-invalid={!!errors.email} className="flex-1">
          <FieldLabel htmlFor="invite-email">Email</FieldLabel>
          <Input
            id="invite-email"
            placeholder="person@example.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field className="sm:w-44">
          <FieldLabel htmlFor="invite-role">Role</FieldLabel>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="invite-role">
                  <SelectValue>{(value: string) => value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : <EnvelopeSimple />}
          Invite
        </Button>
      </div>
    </form>
  )
}
