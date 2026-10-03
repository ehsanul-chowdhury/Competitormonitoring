"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  Check,
  Crosshair,
  Sparkle,
} from "@phosphor-icons/react/ssr"

import { cn } from "@/lib/utils"
import { domainFromInput } from "@/lib/validations/competitor"
import { DiscoverPagesPanel } from "@/components/competitors/discover-pages-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

const STEPS = [
  { id: "workspace", label: "Workspace", icon: Buildings },
  { id: "competitor", label: "Competitor", icon: Crosshair },
  { id: "pages", label: "Pages", icon: Sparkle },
] as const

type StepId = (typeof STEPS)[number]["id"]

function StepRail({ current }: { current: StepId }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current)

  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex
        const isCurrent = index === currentIndex
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                isDone && "bg-foreground text-background",
                isCurrent && "bg-foreground text-background",
                !isDone && !isCurrent && "bg-muted text-muted-foreground"
              )}
            >
              {isDone ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "hidden text-sm sm:block",
                isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1 transition-colors",
                  index < currentIndex ? "bg-foreground/40" : "bg-border"
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function OnboardingWizard({ isAdditional }: { isAdditional: boolean }) {
  const router = useRouter()
  const [step, setStep] = useState<StepId>("workspace")
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const [workspaceName, setWorkspaceName] = useState("")
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  const [competitorName, setCompetitorName] = useState("")
  const [competitorDomain, setCompetitorDomain] = useState("")
  const [competitorId, setCompetitorId] = useState<string | null>(null)
  const [pagesAdded, setPagesAdded] = useState(0)

  // Guards against a double-submit creating two workspaces before React has
  // re-rendered the disabled button.
  const submittingRef = useRef(false)

  async function createWorkspace(event: React.FormEvent) {
    event.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setIsBusy(true)
    setError(null)

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName.trim() }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error ?? "Couldn't create that workspace.")
        return
      }

      setWorkspaceId(data.id)
      setStep("competitor")
      // Deliberately no router.refresh() here: this page redirects to the
      // dashboard once a workspace exists, so refreshing mid-wizard would
      // re-run that check and eject the user before they add a competitor.
      // The tree is refreshed once, on finish().
    } finally {
      submittingRef.current = false
      setIsBusy(false)
    }
  }

  async function createCompetitor(event: React.FormEvent) {
    event.preventDefault()
    if (!workspaceId || submittingRef.current) return
    submittingRef.current = true
    setIsBusy(true)
    setError(null)

    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: competitorName.trim(),
          domain: domainFromInput(competitorDomain),
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error ?? "Couldn't add that competitor.")
        return
      }

      setCompetitorId(data.id)
      setStep("pages")
    } finally {
      submittingRef.current = false
      setIsBusy(false)
    }
  }

  function finish() {
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <StepRail current={step} />

      <div className="flex flex-col gap-6 rounded-2xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === "workspace" && (
          <form onSubmit={createWorkspace} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-xl font-semibold tracking-tight">
                {isAdditional ? "Create a new workspace" : "Name your workspace"}
              </h1>
              <p className="text-sm text-muted-foreground">
                A workspace holds one set of competitors and its own team. Most
                people use their company name.
              </p>
            </div>

            <Field>
              <FieldLabel htmlFor="workspace-name">Workspace name</FieldLabel>
              <Input
                id="workspace-name"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Acme Inc."
                autoComplete="organization"
                autoFocus
              />
              <FieldDescription>You can rename this later.</FieldDescription>
            </Field>

            <div className="flex justify-end">
              <Button type="submit" disabled={workspaceName.trim().length < 2 || isBusy}>
                {isBusy && <Spinner />}
                Continue
                <ArrowRight />
              </Button>
            </div>
          </form>
        )}

        {step === "competitor" && (
          <form onSubmit={createCompetitor} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-xl font-semibold tracking-tight">
                Add your first competitor
              </h1>
              <p className="text-sm text-muted-foreground">
                Give us a public website and we&apos;ll start watching the pages
                that signal real moves.
              </p>
            </div>

            <Field>
              <FieldLabel htmlFor="competitor-name">Competitor name</FieldLabel>
              <Input
                id="competitor-name"
                value={competitorName}
                onChange={(event) => setCompetitorName(event.target.value)}
                placeholder="Acme Corp"
                autoFocus
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="competitor-domain">Website</FieldLabel>
              <Input
                id="competitor-domain"
                value={competitorDomain}
                onChange={(event) => setCompetitorDomain(event.target.value)}
                placeholder="acme.com"
              />
              <FieldDescription>
                Just the domain. We&apos;ll find the pages worth watching.
              </FieldDescription>
            </Field>

            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep("workspace")}>
                <ArrowLeft />
                Back
              </Button>
              <Button
                type="submit"
                disabled={
                  competitorName.trim().length < 1 ||
                  competitorDomain.trim().length < 3 ||
                  isBusy
                }
              >
                {isBusy && <Spinner />}
                Start monitoring
                <ArrowRight />
              </Button>
            </div>
          </form>
        )}

        {step === "pages" && workspaceId && competitorId && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-xl font-semibold tracking-tight">
                Pick the pages to watch
              </h1>
              <p className="text-sm text-muted-foreground">
                We crawled {competitorDomain} and ranked what usually matters.
                Add what looks right. You can change this anytime.
              </p>
            </div>

            <DiscoverPagesPanel
              competitorId={competitorId}
              workspaceId={workspaceId}
              onAdded={(count) => setPagesAdded((total) => total + count)}
            />

            <div className="flex items-center justify-between gap-3 border-t pt-5">
              <span className="text-sm text-muted-foreground">
                {pagesAdded > 0
                  ? `${pagesAdded} page${pagesAdded === 1 ? "" : "s"} queued for the next scan.`
                  : "You can skip this and add pages later."}
              </span>
              <Button type="button" onClick={finish}>
                Go to dashboard
                <ArrowRight />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
