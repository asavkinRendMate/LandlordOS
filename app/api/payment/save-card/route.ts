import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { saveCard } from '@/lib/payment-service'

const schema = z.object({
  last4: z.string().length(4).regex(/^\d{4}$/),
  brand: z.string().min(1),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/, 'Expected MM/YY format'),
  name: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: unknown = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid card details' }, { status: 400 })
    }

    const { last4, brand, expiry } = result.data
    await saveCard(user.id, { last4, brand, expiry })

    return NextResponse.json({ data: { message: 'Card saved' } })
  } catch (err) {
    console.error('[payment/save-card POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
