"use client"

import { useEffect, useRef, useState } from "react"
import { PaperPlaneTilt, Target } from "@phosphor-icons/react/ssr"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

type ChatMessage = { role: "user" | "assistant"; content: string }

export function AiAssistantDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  async function sendMessage() {
    const content = input.trim()
    if (!content || isSending) return

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }]
    setMessages(nextMessages)
    setInput("")
    setIsSending(true)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      })
      const result = await res.json().catch(() => ({}))
      const reply =
        result.reply ?? result.error ?? "Something went wrong. Please try again."
      setMessages((prev) => [...prev, { role: "assistant", content: reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Couldn't reach the assistant. Please try again." },
      ])
    } finally {
      setIsSending(false)
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[32rem] flex-col gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="flex-row items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-primary" />
            <DialogTitle className="text-base">What do you want me to do?</DialogTitle>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mr-6"
              onClick={() => setMessages([])}
            >
              New chat
            </Button>
          )}
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Hi! I&apos;m ready to help you understand competitor moves and market
              trends.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] whitespace-pre-wrap text-sm",
                      message.role === "user"
                        ? "rounded-2xl bg-muted px-3 py-2"
                        : "px-0 py-1"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner />
                  Thinking…
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-end gap-2 border-t p-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about competitor changes…"
            rows={1}
            className="max-h-32 min-h-9 flex-1 resize-none"
          />
          <Button
            size="icon"
            disabled={!input.trim() || isSending}
            onClick={sendMessage}
            aria-label="Send"
          >
            <PaperPlaneTilt />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
