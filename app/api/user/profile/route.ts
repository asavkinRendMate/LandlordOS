import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true, createdAt: true },
    })

    return NextResponse.json({
      data: {
        name: dbUser?.name ?? null,
        email: dbUser?.email ?? user.email,
        createdAt: dbUser?.createdAt ?? null,
      },
    })
  } catch (err) {
    console.error('[user/profile GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

const patchSchema = z.object({
  name: z.string().min(2, { error: 'Name must be at least 2 characters' }).max(100),
})

export async function PATCH(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const updated = await prisma.user.upsert({
      where: { id: user.id },
      update: { name: parsed.data.name.trim() },
      create: { id: user.id, email: user.email!, name: parsed.data.name.trim() },
    })

    return NextResponse.json({ data: { name: updated.name } })
  } catch (err) {
    console.error('[user/profile PATCH]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
