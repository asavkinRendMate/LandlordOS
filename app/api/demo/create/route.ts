import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { seedDemoUser } from '@/prisma/demo-seed'

export const maxDuration = 15

const DEMO_EMAIL_DOMAIN = 'demo.letsorted.co.uk'

export async function POST() {
  try {
    const supabase = createServerClient()
    const suffix = nanoid(10)
    const email = `demo-${suffix}@${DEMO_EMAIL_DOMAIN}`
    const password = nanoid(32) // random password — only used for this session

    // 1. Create Supabase auth user (confirmed, no verification email)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      console.error('[demo/create] auth create error:', authError?.message)
      return NextResponse.json({ error: 'Failed to create demo account' }, { status: 500 })
    }

    const userId = authData.user.id

    // 2. Upsert Prisma User record (Supabase trigger may have already inserted the row)
    await prisma.user.upsert({
      where: { id: userId },
      update: { email, isDemo: true },
      create: { id: userId, email, isDemo: true },
    })

    // 3. Seed demo data
    await seedDemoUser(userId, email)

    // 4. Return credentials for client-side sign-in
    return NextResponse.json({
      data: { email, password },
    })
  } catch (err) {
    console.error('[demo/create] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
