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

    // Find all usages for this user's packages, with their linked reports
    const packages = await prisma.screeningPackage.findMany({
      where: { userId: user.id },
      select: { id: true },
    })

    const packageIds = packages.map((p) => p.id)
    if (packageIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const usages = await prisma.screeningPackageUsage.findMany({
      where: { packageId: { in: packageIds } },
      orderBy: { createdAt: 'desc' },
      include: {
        report: {
          select: {
            id: true,
            status: true,
            totalScore: true,
            grade: true,
            aiSummary: true,
            breakdown: true,
            appliedRules: true,
            verificationToken: true,
            hasUnverifiedFiles: true,
            verificationWarning: true,
            validationResults: true,
            failureReason: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json({ data: usages })
  } catch (err) {
    console.error('[screening/history GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
