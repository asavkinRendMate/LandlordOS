import MailerLite from '@mailerlite/mailerlite-nodejs'

const client = new MailerLite({
  api_key: process.env.MAILERLITE_API_KEY ?? '',
})

/**
 * Add a new landlord to MailerLite onboarding group.
 * Called once when user first sets their name (registration complete).
 * MailerLite automation handles all timing and conditions.
 */
export async function addToOnboardingSequence(user: {
  email: string
  name: string | null
  id: string
}): Promise<void> {
  if (!process.env.MAILERLITE_API_KEY) return
  if (!process.env.MAILERLITE_GROUP_ID) return
  if (user.email.includes('@demo.letsorted.co.uk')) return

  try {
    await client.subscribers.createOrUpdate({
      email: user.email,
      fields: {
        name: user.name?.split(' ')[0] ?? '',
        last_name: user.name?.split(' ').slice(1).join(' ') ?? '',
        letsorted_user_id: user.id,
        has_property: false,
        has_tenant: false,
        has_signed_contract: false,
        has_inspection: false,
        property_count: 0,
      },
      groups: [process.env.MAILERLITE_GROUP_ID],
    })
  } catch (error) {
    console.error('[MailerLite] Failed to add subscriber:', error)
    // Never throw — email failure must not break registration
  }
}

/**
 * Update subscriber fields when user takes key actions.
 * MailerLite automation uses these fields to trigger/stop emails.
 */
export async function updateSubscriber(
  email: string,
  fields: Record<string, string | number | boolean>,
): Promise<void> {
  if (!process.env.MAILERLITE_API_KEY) return
  if (email.includes('@demo.letsorted.co.uk')) return

  try {
    await client.subscribers.createOrUpdate({ email, fields })
  } catch (error) {
    console.error('[MailerLite] Failed to update subscriber:', error)
  }
}
