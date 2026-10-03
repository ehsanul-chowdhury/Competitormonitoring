// Ported verbatim from the Next.js app's lib/ai/deepseek.ts.

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

export function isDeepSeekConfigured() {
  return Boolean(process.env.DEEPSEEK_API_KEY)
}

export async function askDeepSeek(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error("DeepSeek is not configured")
  }

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: 0.3,
      max_tokens: 800,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`DeepSeek request failed (${res.status}): ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  const reply = data.choices?.[0]?.message?.content
  if (typeof reply !== "string") {
    throw new Error("DeepSeek returned an unexpected response shape")
  }
  return reply
}
