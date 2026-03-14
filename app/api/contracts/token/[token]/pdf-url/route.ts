import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  try {
    const contract = await prisma.tenancyContract.findFirst({
      where: {
        OR: [
          { landlordToken: params.token },
          { tenantToken: params.token },
        ],
      },
      select: { pdfUrl: true },
    })

    if (!contract?.pdfUrl) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const server = createServerClient()
    const { data, error } = await server.storage.from('documents').createSignedUrl(contract.pdfUrl, 3600)
    if (error || !data) {
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }

    return NextResponse.redirect(data.signedUrl)
  } catch (err) {
    console.error('[contracts/token/[token]/pdf-url GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
