import {
  Envelope,
  ChatCircle,
  Notebook,
  PaperPlaneTilt,
  WebhooksLogo,
  Lightning,
} from "@phosphor-icons/react/ssr"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

const PLANNED_INTEGRATIONS = [
  {
    icon: ChatCircle,
    name: "Slack",
    description: "Post meaningful competitor changes straight into a channel.",
    tint: "bg-[#4A154B]/10 text-[#4A154B] dark:bg-[#4A154B]/20 dark:text-[#ECB5EC]",
  },
  {
    icon: Lightning,
    name: "Zapier",
    description: "Trigger any of your existing zaps when something changes.",
    tint: "bg-[#FF4A00]/10 text-[#FF4A00] dark:bg-[#FF4A00]/20 dark:text-[#FF8F5E]",
  },
  {
    icon: Notebook,
    name: "Notion",
    description: "Log every change to a Notion database automatically.",
    tint: "bg-foreground/10 text-foreground",
  },
  {
    icon: WebhooksLogo,
    name: "Webhooks",
    description: "Send raw change events to any endpoint you control.",
    tint: "bg-[#3E63DD]/10 text-[#3E63DD] dark:bg-[#3E63DD]/20 dark:text-[#9DB4F5]",
  },
  {
    icon: PaperPlaneTilt,
    name: "Telegram",
    description: "Get pinged in a group or DM the moment something moves.",
    tint: "bg-[#229ED9]/10 text-[#229ED9] dark:bg-[#229ED9]/20 dark:text-[#7FCCEE]",
  },
  {
    icon: Envelope,
    name: "Weekly digest",
    description: "A summarized email recap instead of a live feed.",
    tint: "bg-primary/10 text-primary",
  },
]

export default function IntegrationsPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect IntelFlock to the tools your team already uses.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {PLANNED_INTEGRATIONS.map((integration) => (
          <Card key={integration.name} className="gap-3">
            <CardHeader className="flex-row items-center justify-between">
              <div
                className={`flex size-10 items-center justify-center rounded-lg ${integration.tint}`}
              >
                <integration.icon className="size-5" />
              </div>
              <Badge variant="outline">Coming soon</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <span className="font-medium">{integration.name}</span>
              <span className="text-sm text-muted-foreground">
                {integration.description}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
