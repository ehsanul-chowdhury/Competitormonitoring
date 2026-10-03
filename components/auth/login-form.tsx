"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { signInSchema, type SignInInput } from "@/lib/validations/auth"
import { signIn } from "@/lib/auth-client"
import { GoogleAuthButton } from "@/components/auth/google-auth-button"
import { PasswordInput } from "@/components/auth/password-input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

export function LoginForm() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  })

  async function onSubmit(values: SignInInput) {
    setFormError(null)
    const { error } = await signIn.email(values)

    if (error) {
      setFormError(
        error.code === "INVALID_EMAIL_OR_PASSWORD"
          ? "Incorrect email or password."
          : (error.message ?? "Something went wrong.")
      )
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Sign in to IntelFlock
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome back! Please sign in to continue
          </p>
        </div>

        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Field>
          <GoogleAuthButton label="Google" />
        </Field>
        <FieldSeparator>or</FieldSeparator>

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email address</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <PasswordInput
            id="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>

        <Field>
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {isSubmitting && <Spinner />}
            Sign in
          </Button>
        </Field>

        <FieldDescription className="text-center">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="!text-blue-600 hover:!text-blue-700 dark:!text-blue-400 dark:hover:!text-blue-300"
          >
            Sign up
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
