import "server-only"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { verificationEmailHtml } from "@/lib/email-templates"

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 72,
  },
  // Soft verification, not a login gate: the account is usable right away
  // (autoSignIn above), and this just gets a "confirm your email" link into
  // their inbox and a banner into the app until they click it. Blocking sign
  // in on verification is the stricter pattern some SaaS use, but it adds
  // signup friction this product doesn't need.
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email for IntelFlock",
        html: verificationEmailHtml({ name: user.name, url }),
      })
    },
  },
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
  // Without `trustedProviders`, linking a Google sign-in onto an existing
  // email/password account only happens once that account's own email is
  // verified, but verification here is soft (see above), so someone who
  // signed up with a password and hasn't clicked the link yet would hit a
  // dead end trying to sign in with Google using the same address. Google
  // already verifies the email itself, so it's safe to trust it to link
  // straight onto the matching account either way.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
})
