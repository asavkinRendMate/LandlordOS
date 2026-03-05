import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  name:  z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
})

// PATCH /api/tenants/[id] — property owner only
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: unknown = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid fields' }, { status: 400 })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: { property: true },
    })
    if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (tenant.property.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.tenant.update({
      where: { id: params.id },
      data: result.data,
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[tenants/[id] PATCH]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
