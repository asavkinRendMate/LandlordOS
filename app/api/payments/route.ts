import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { generateUpcomingPayments, updatePaymentStatuses } from '@/lib/payments'

export async function GET(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const propertyId = searchParams.get('propertyId')
    if (!propertyId) return NextResponse.json({ error: 'propertyId required' }, { status: 400 })

    // Verify access: landlord OR active tenant for this property
    const [property, tenantProfile] = await Promise.all([
      prisma.property.findFirst({
        where: { id: propertyId, userId: user.id },
        select: { id: true },
      }),
      prisma.tenant.findFirst({
        where: { propertyId, email: user.email!, status: { in: ['TENANT', 'INVITED'] } },
        select: { id: true },
      }),
    ])

    if (!property && !tenantProfile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ensure upcoming payment records exist and statuses are current
    const activeTenancy = await prisma.tenancy.findFirst({
      where: { propertyId, status: { not: 'ENDED' } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (activeTenancy) {
      await generateUpcomingPayments(activeTenancy.id)
      await updatePaymentStatuses()
    }

    if (!activeTenancy) return NextResponse.json({ data: [] })

    // Last 12 months + all upcoming — scoped to the single active tenancy
    const since = new Date()
    since.setMonth(since.getMonth() - 12)

    const payments = await prisma.rentPayment.findMany({
      where: { tenancyId: activeTenancy.id, dueDate: { gte: since } },
      orderBy: { dueDate: 'desc' },
    })

    return NextResponse.json({ data: payments })
  } catch (err) {
    console.error('[payments GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
