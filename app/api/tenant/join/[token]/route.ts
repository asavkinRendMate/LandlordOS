import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuthClient } from '@/lib/supabase/auth'

// ── GET — fetch tenant data by token ─────────────────────────────────────────

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { inviteToken: params.token },
      include: {
        property: { select: { line1: true, line2: true, city: true, postcode: true } },
      },
    })

    if (!tenant) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (tenant.confirmedAt) return NextResponse.json({ error: 'already_confirmed' }, { status: 200 })

    return NextResponse.json({
      data: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        status: tenant.status,
        property: tenant.property,
      },
    })
  } catch (err) {
    console.error('[tenant/join GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// ── POST — confirm details + send magic link ──────────────────────────────────

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
})

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const body: unknown = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const tenant = await prisma.tenant.findUnique({
      where: { inviteToken: params.token },
    })
    if (!tenant) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (tenant.confirmedAt) return NextResponse.json({ error: 'already_confirmed' }, { status: 400 })

    // Update tenant record + set property status to ACTIVE
    await prisma.$transaction([
      prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          name: result.data.name,
          phone: result.data.phone ?? tenant.phone,
          confirmedAt: new Date(),
          status: 'TENANT',
        },
      }),
      prisma.property.update({
        where: { id: tenant.propertyId },
        data: { status: 'ACTIVE' },
      }),
    ])

    // Send magic link via Supabase Auth
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const supabase = createAuthClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: tenant.email,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?next=/tenant/dashboard`,
      },
    })
    if (error) {
      console.error('[tenant/join POST] magic link error', error)
      return NextResponse.json({ error: 'Failed to send sign-in link' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[tenant/join POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
