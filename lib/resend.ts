import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM = 'LetSorted <no-reply@letsorted.co.uk>'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from = FROM }: SendEmailOptions) {
  // Never send real emails to demo accounts
  if (to.endsWith('@demo.letsorted.co.uk')) {
    console.log('[Email — demo skip]', { to, subject })
    return { success: true }
  }

  if (!resend) {
    console.log('[Email — dev fallback]', { to, subject, html })
    return { success: true }
  }
  const { error } = await resend.emails.send({ from, to, subject, html })
  if (error) {
    console.error('[Resend error]', error)
    return { success: false, error }
  }
  return { success: true }
}
