import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { resolveDisplayName } from "@/lib/utils"
import { ChangePasswordForm } from "@/components/account/change-password-form"
import { ProfileForm } from "@/components/account/profile-form"

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect("/login")
  }

  const { user } = session

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <header>
        <h1 className="text-xl font-semibold">Account</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile and how you sign in.
        </p>
      </header>

      <ProfileForm
        name={resolveDisplayName(user.name, user.email)}
        email={user.email}
        image={user.image ?? null}
      />

      <ChangePasswordForm />
    </div>
  )
}
