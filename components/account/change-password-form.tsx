"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeSlash } from "@phosphor-icons/react/ssr"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { changePassword } from "@/lib/auth-client"
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validations/account"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"

export function ChangePasswordForm() {
  const [formError, setFormError] = useState<string | null>(null)
  const [showPasswords, setShowPasswords] = useState(false)
  const [signOutOthers, setSignOutOthers] = useState(true)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  })

  async function onSubmit(values: ChangePasswordInput) {
    setFormError(null)

    const { error } = await changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: signOutOthers,
    })

    if (error) {
      // Better Auth returns a generic failure for a wrong current password;
      // say so plainly rather than surfacing the raw code.
      setFormError(
        error.code === "INVALID_PASSWORD"
          ? "That current password isn't right."
          : (error.message ?? "Couldn't change your password.")
      )
      return
    }

    reset()
    toast.success(
      signOutOthers
        ? "Password changed. Other devices were signed out."
        : "Password changed."
    )
  }

  const inputType = showPasswords ? "text" : "password"

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6 rounded-2xl bg-card p-6 ring-1 ring-foreground/10"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">Password</h2>
          <p className="text-sm text-muted-foreground">
            Use at least 8 characters you don&apos;t reuse anywhere else.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPasswords((value) => !value)}
        >
          {showPasswords ? <EyeSlash /> : <Eye />}
          {showPasswords ? "Hide" : "Show"}
        </Button>
      </div>

      <FieldGroup>
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Field data-invalid={!!errors.currentPassword}>
          <FieldLabel htmlFor="current-password">Current password</FieldLabel>
          <Input
            id="current-password"
            type={inputType}
            autoComplete="current-password"
            aria-invalid={!!errors.currentPassword}
            {...register("currentPassword")}
          />
          <FieldError errors={[errors.currentPassword]} />
        </Field>

        <Field data-invalid={!!errors.newPassword}>
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <Input
            id="new-password"
            type={inputType}
            autoComplete="new-password"
            aria-invalid={!!errors.newPassword}
            {...register("newPassword")}
          />
          <FieldError errors={[errors.newPassword]} />
        </Field>

        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
          <Input
            id="confirm-password"
            type={inputType}
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>
      </FieldGroup>

      <label className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 p-3">
        <span className="flex flex-col">
          <span className="text-sm font-medium">Sign out other devices</span>
          <span className="text-xs text-muted-foreground">
            Recommended if you think someone else knows your password.
          </span>
        </span>
        <Switch checked={signOutOthers} onCheckedChange={setSignOutOthers} />
      </label>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Update password
        </Button>
      </div>
    </form>
  )
}
