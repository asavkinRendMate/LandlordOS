import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'

// GET /api/tenant-documents?tenantId=xxx
export async function GET(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { property: true },
    })
    if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = tenant.property.userId === user.id
    const isSelf  = tenant.userId === user.id
    if (!isOwner && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const documents = await prisma.tenantDocument.findMany({
      where: { tenantId },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json({ data: documents })
  } catch (err) {
    console.error('[tenant-documents GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
