import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { tenancyId: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify ownership via tenancy → property → userId
    const tenancy = await prisma.tenancy.findFirst({
      where: { id: params.tenancyId, property: { userId: user.id } },
      select: { id: true },
    })
    if (!tenancy) return NextResponse.json({ error: 'Tenancy not found' }, { status: 404 })

    const contract = await prisma.tenancyContract.findUnique({
      where: { tenancyId: params.tenancyId },
    })

    return NextResponse.json({ data: contract })
  } catch (err) {
    console.error('[contracts/[tenancyId] GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
