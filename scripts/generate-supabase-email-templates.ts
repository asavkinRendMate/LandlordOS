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

// ── Magic Link ──────────────────────────────────────────────────────────────

const magicLinkHtml = baseEmailTemplate({
  previewText: 'Sign in to LetSorted',
  subtitle: 'Sign In',
  content: `
    <h1 style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 16px;">Sign in to LetSorted</h1>
    ${p('Click the button below to sign in. This link expires in 10 minutes and can only be used once.')}
    ${ctaButton('Sign in to LetSorted', '{{ .ConfirmationURL }}')}
    ${muted("If you didn't request this link, you can safely ignore this email.")}
  `,
  footerExtra: 'This is a transactional email sent because a sign-in was requested for this address.',
})

// ── Confirm Signup ──────────────────────────────────────────────────────────

const confirmSignupHtml = baseEmailTemplate({
  previewText: 'Confirm your LetSorted account',
  subtitle: 'Account Confirmation',
  content: `
    <h1 style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 16px;">Confirm your account</h1>
    ${p('Welcome to LetSorted! Click below to confirm your email address and activate your account.')}
    ${ctaButton('Confirm my account', '{{ .ConfirmationURL }}')}
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
  { name: 'MAGIC LINK', subject: 'Sign in to LetSorted', html: magicLinkHtml },
  { name: 'CONFIRM SIGNUP', subject: 'Confirm your LetSorted account', html: confirmSignupHtml },
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
