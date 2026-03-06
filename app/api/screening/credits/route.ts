import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthClient } from '@/lib/supabase/auth'

export async function GET() {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const packages = await prisma.screeningPackage.findMany({
      where: {
        userId: user.id,
        paymentStatus: { in: ['MOCK_PAID', 'PAID'] },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        packageType: true,
        totalCredits: true,
        usedCredits: true,
        createdAt: true,
      },
    })

    const totalCredits = packages.reduce((sum, p) => sum + p.totalCredits, 0)
    const usedCredits = packages.reduce((sum, p) => sum + p.usedCredits, 0)
    const remainingCredits = totalCredits - usedCredits

    return NextResponse.json({
      data: { totalCredits, usedCredits, remainingCredits, packages },
    })
  } catch (err) {
    console.error('[screening/credits GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
