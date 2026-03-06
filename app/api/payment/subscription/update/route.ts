import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { createOrUpdateSubscription } from '@/lib/payment-service'

export async function POST() {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const propertyCount = await prisma.property.count({
      where: { userId: user.id },
    })

    await createOrUpdateSubscription(user.id, propertyCount)

    return NextResponse.json({ data: { message: 'Subscription updated', propertyCount } })
  } catch (err) {
    console.error('[payment/subscription/update POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
