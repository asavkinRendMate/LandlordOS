import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

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

    const server = createServerClient()
    const { data, error } = await server.storage.from('documents').createSignedUrl(inspection.pdfUrl, 3600)
    if (error || !data) {
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }

    return NextResponse.redirect(data.signedUrl)
  } catch (err) {
    console.error('[tenant/inspections/pdf-url GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
