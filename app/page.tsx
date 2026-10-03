import { redirect } from "next/navigation"

import { getCurrentWorkspace } from "@/lib/workspace"

export default async function RootPage() {
  const workspace = await getCurrentWorkspace()
  redirect(workspace ? "/dashboard" : "/onboarding")
}
