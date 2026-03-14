import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSignedUrl } from '@/lib/storage-url'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

    const signedUrl = await getSignedUrl('documents', contract.pdfUrl)
    return NextResponse.json(
      { url: signedUrl },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      },
    )
  } catch (err) {
    console.error('[contracts/token/[token]/pdf-url GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
