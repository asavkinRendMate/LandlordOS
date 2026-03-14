import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { getSignedUrl } from '@/lib/storage-url'

export async function GET(_req: Request, { params }: { params: { reportId: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Find inspection and verify the authenticated user is the linked tenant
    const inspection = await prisma.propertyInspection.findFirst({
      where: { id: params.reportId },
      select: {
        pdfUrl: true,
        tenant: { select: { email: true } },
      },
    })

    if (!inspection || !inspection.tenant || inspection.tenant.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!inspection.pdfUrl) {
      return NextResponse.json({ error: 'PDF not yet generated' }, { status: 404 })
    }

    const signedUrl = await getSignedUrl('documents', inspection.pdfUrl)
    return NextResponse.json({ url: signedUrl })
  } catch (err) {
    console.error('[tenant/inspections/pdf-url GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
