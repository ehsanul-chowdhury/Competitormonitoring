/** Inline-styled HTML, not a framework: this is the one transactional email
 * the app sends today, and most email clients strip <style> blocks anyway. */
export function verificationEmailHtml({ name, url }: { name: string | null; url: string }) {
  const greeting = name ? `Hi ${name},` : "Hi there,"

  return `
<div style="background:#f4f4f5;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="padding:32px 32px 0;">
      <span style="font-size:18px;font-weight:700;letter-spacing:-0.01em;color:#18181b;">IntelFlock</span>
    </div>
    <div style="padding:24px 32px 32px;">
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#18181b;">Confirm your email address</h1>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#52525b;">
        ${greeting} click the button below to verify your email and finish setting up your IntelFlock account.
      </p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#059669;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
        Verify email
      </a>
      <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#a1a1aa;">
        If the button doesn't work, paste this link into your browser:<br />
        <a href="${url}" style="color:#059669;">${url}</a>
      </p>
      <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#a1a1aa;">
        If you didn't create an IntelFlock account, you can ignore this email.
      </p>
    </div>
  </div>
</div>
`.trim()
}
