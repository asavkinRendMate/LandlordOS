import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { getSignedUrl } from '@/lib/storage-url'

export async function GET(_req: Request, { params }: { params: { tenancyId: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const contract = await prisma.tenancyContract.findFirst({
      where: {
        tenancyId: params.tenancyId,
        tenancy: { property: { userId: user.id } },
      },
      select: { pdfUrl: true },
    })

    if (!contract?.pdfUrl) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const signedUrl = await getSignedUrl('documents', contract.pdfUrl)
    return NextResponse.json({ url: signedUrl })
  } catch (err) {
    console.error('[contracts/[tenancyId]/pdf-url GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
