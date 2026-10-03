"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PAGE_CATEGORIES, PAGE_CATEGORY_LABELS } from "@/lib/page-categories"

const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories" },
  ...PAGE_CATEGORIES.map((value) => ({ value, label: PAGE_CATEGORY_LABELS[value] })),
]

const PRIORITY_OPTIONS = [
  { value: "all", label: "All priorities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
]

export function ChangeFilters({
  competitors,
}: {
  competitors: { id: string; name: string }[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") ?? "")

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete("page")
    router.push(`/notifications?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search changes…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") updateParam("q", query)
        }}
        onBlur={() => updateParam("q", query)}
        className="max-w-xs"
      />
      <Select
        value={searchParams.get("competitor_id") ?? "all"}
        onValueChange={(value) => updateParam("competitor_id", value)}
      >
        <SelectTrigger>
          <SelectValue>
            {(value: string) =>
              value === "all"
                ? "All competitors"
                : (competitors.find((c) => c.id === value)?.name ?? "All competitors")
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All competitors</SelectItem>
          {competitors.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("category") ?? "all"}
        onValueChange={(value) => updateParam("category", value)}
      >
        <SelectTrigger>
          <SelectValue>
            {(value: string) =>
              CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? "All categories"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("priority") ?? "all"}
        onValueChange={(value) => updateParam("priority", value)}
      >
        <SelectTrigger>
          <SelectValue>
            {(value: string) =>
              PRIORITY_OPTIONS.find((o) => o.value === value)?.label ?? "All priorities"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PRIORITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
