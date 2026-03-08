/**
 * Generates branded HTML email templates for Supabase Auth.
 *
 * Paste the output into:
 *   Supabase Dashboard → Authentication → Email Templates
 *
 * Run:  npx tsx scripts/generate-supabase-email-templates.ts
 */

import { baseEmailTemplate, ctaButton, p, muted } from '../lib/email-templates/base'

const DIVIDER = '\n' + '='.repeat(72) + '\n'

// ── Magic Link (OTP Code) ───────────────────────────────────────────────────

const magicLinkHtml = baseEmailTemplate({
  previewText: 'Your LetSorted sign-in code',
  subtitle: 'Sign In',
  content: `
    <h1 style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 16px;">Your sign-in code</h1>
    ${p('Enter this code to sign in to LetSorted. It expires in 10 minutes.')}
    <div style="text-align:center;margin:24px 0;">
      <span style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#1a1a1a;background:#f0fdf4;border:2px solid #16a34a;border-radius:12px;padding:16px 28px;display:inline-block;">{{ .Token }}</span>
    </div>
    ${muted("If you didn't request this code, you can safely ignore this email.")}
  `,
  footerExtra: 'This is a transactional email sent because a sign-in was requested for this address.',
})

// ── Confirm Signup ──────────────────────────────────────────────────────────

const confirmSignupHtml = baseEmailTemplate({
  previewText: 'Your LetSorted sign-in code',
  subtitle: 'Account Confirmation',
  content: `
    <h1 style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 16px;">Your sign-in code</h1>
    ${p('Welcome to LetSorted! Enter this code to confirm your account and sign in.')}
    <div style="text-align:center;margin:24px 0;">
      <span style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#1a1a1a;background:#f0fdf4;border:2px solid #16a34a;border-radius:12px;padding:16px 28px;display:inline-block;">{{ .Token }}</span>
    </div>
  `,
  footerExtra: 'This is a transactional email sent because an account was created with this address.',
})

// ── Change Email ────────────────────────────────────────────────────────────

const changeEmailHtml = baseEmailTemplate({
  previewText: 'Confirm your new email address',
  subtitle: 'Email Change',
  content: `
    <h1 style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 16px;">Confirm your new email</h1>
    ${p('We received a request to change your email address. Click below to confirm this change.')}
    ${ctaButton('Confirm new email', '{{ .ConfirmationURL }}')}
    ${muted("If you didn't request this change, please contact us immediately at hello@letsorted.co.uk")}
  `,
  footerExtra: 'This is a transactional email sent because an email change was requested for your account.',
})

// ── Reset Password ──────────────────────────────────────────────────────────

const resetPasswordHtml = baseEmailTemplate({
  previewText: 'Reset your LetSorted password',
  subtitle: 'Password Reset',
  content: `
    <h1 style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 16px;">Reset your password</h1>
    ${p('Click below to reset your password. This link expires in 1 hour.')}
    ${ctaButton('Reset my password', '{{ .ConfirmationURL }}')}
    ${muted("If you didn't request a password reset, you can safely ignore this email.")}
  `,
  footerExtra: 'This is a transactional email sent because a password reset was requested for this address.',
})

// ── Output ──────────────────────────────────────────────────────────────────

const templates = [
  { name: 'MAGIC LINK', subject: 'Your LetSorted sign-in code', html: magicLinkHtml },
  { name: 'CONFIRM SIGNUP', subject: 'Your LetSorted sign-in code', html: confirmSignupHtml },
  { name: 'CHANGE EMAIL', subject: 'Confirm your new email address', html: changeEmailHtml },
  { name: 'RESET PASSWORD', subject: 'Reset your LetSorted password', html: resetPasswordHtml },
]

for (const t of templates) {
  console.log(DIVIDER)
  console.log(`  TEMPLATE: ${t.name}`)
  console.log(`  SUBJECT:  ${t.subject}`)
  console.log(DIVIDER)
  console.log(t.html)
  console.log()
}

console.log(DIVIDER)
console.log('  Paste each HTML block into Supabase Dashboard:')
console.log('  Authentication -> Email Templates -> [template name]')
console.log(DIVIDER)
