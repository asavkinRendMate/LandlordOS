import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const property = await prisma.property.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        complianceDocs: true,
        tenancies: {
          where: { status: { not: 'ENDED' } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        tenants: {
          orderBy: { createdAt: 'desc' },
          include: {
            documents: {
              select: { documentType: true, expiryDate: true },
            },
            financialReports: {
              orderBy: { createdAt: 'desc' },
              take: 1,
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
                statementFiles: true,
                verificationWarning: true,
                applicantName: true,
                jointApplicants: true,
                validationResults: true,
                failureReason: true,
              },
            },
          },
        },
      },
    })

    if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: property })
  } catch (err) {
    console.error('[properties/[id] GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

const patchSchema = z.object({
  requireFinancialVerification: z.boolean().optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: unknown = await req.json()
    const result = patchSchema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const property = await prisma.property.findFirst({ where: { id: params.id, userId: user.id } })
    if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.property.update({
      where: { id: params.id },
      data: result.data,
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[properties/[id] PATCH]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
