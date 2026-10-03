import "server-only"
import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM ?? "IntelFlock <onboarding@resend.dev>"

/** No-op-but-visible when RESEND_API_KEY isn't set, same as Google sign-in
 * going unlisted without its credentials: local dev never silently drops a
 * verification link, it just lands in the server log instead of an inbox. */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  if (!resend) {
    console.log(`\n[email:dev] RESEND_API_KEY not set, would send to ${to}`)
    console.log(`[email:dev] Subject: ${subject}`)
    console.log(`[email:dev] ${html}\n`)
    return
  }

  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) {
    throw new Error(`Failed to send email to ${to}: ${error.message}`)
  }
}
