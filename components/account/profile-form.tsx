"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Trash } from "@phosphor-icons/react/ssr"
import { toast } from "sonner"

import { updateUser } from "@/lib/auth-client"
import { cn, avatarToneForName } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

export function ProfileForm({
  name,
  email,
  image,
}: {
  name: string
  email: string
  image: string | null
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(name)
  const [avatar, setAvatar] = useState(image)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const initial = (displayName || email).charAt(0).toUpperCase()
  const isDirty = displayName.trim() !== name && displayName.trim().length > 0

  async function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset immediately so re-picking the same file still fires onChange.
    event.target.value = ""
    if (!file) return

    setIsUploading(true)
    const body = new FormData()
    body.append("avatar", file)

    const res = await fetch("/api/account/avatar", { method: "POST", body })
    setIsUploading(false)

    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      toast.error(result.error ?? "Couldn't upload that image.")
      return
    }

    const result = await res.json()
    setAvatar(result.image)
    toast.success("Photo updated.")
    router.refresh()
  }

  async function onRemovePhoto() {
    setIsUploading(true)
    const res = await fetch("/api/account/avatar", { method: "DELETE" })
    setIsUploading(false)

    if (!res.ok) {
      toast.error("Couldn't remove the photo.")
      return
    }

    setAvatar(null)
    toast("Photo removed.")
    router.refresh()
  }

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isDirty) return

    setIsSaving(true)
    const { error } = await updateUser({ name: displayName.trim() })
    setIsSaving(false)

    if (error) {
      toast.error(error.message ?? "Couldn't save your profile.")
      return
    }

    toast.success("Profile saved.")
    router.refresh()
  }

  return (
    <form
      onSubmit={onSave}
      className="flex flex-col gap-6 rounded-2xl bg-card p-6 ring-1 ring-foreground/10"
    >
      <div>
        <h2 className="text-sm font-medium">Profile</h2>
        <p className="text-sm text-muted-foreground">
          How you appear to everyone else in your workspaces.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <Avatar className="size-20">
          {avatar && <AvatarImage src={avatar} alt="" />}
          <AvatarFallback
            className={cn(
              "text-2xl font-semibold",
              avatarToneForName(email)
            )}
          >
            {initial}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onPickFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? <Spinner /> : <Camera />}
              {avatar ? "Change photo" : "Upload photo"}
            </Button>
            {avatar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isUploading}
                onClick={onRemovePhoto}
              >
                <Trash />
                Remove
              </Button>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            JPEG, PNG, or WebP. Up to 2MB.
          </span>
        </div>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="account-name">Name</FieldLabel>
          <Input
            id="account-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="account-email">Email</FieldLabel>
          <Input id="account-email" value={email} readOnly disabled />
          <FieldDescription>
            Your email is used to sign in and can&apos;t be changed here yet.
          </FieldDescription>
        </Field>
      </FieldGroup>

      <div>
        <Button type="submit" disabled={!isDirty || isSaving}>
          {isSaving && <Spinner />}
          Save changes
        </Button>
      </div>
    </form>
  )
}
