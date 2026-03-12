import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAdminSession } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  tenancyId: z.string().min(1),
})

export async function POST(req: Request) {
  const authError = await verifyAdminSession()
  if (authError) return authError

  try {
    const body: unknown = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid tenancy ID' }, { status: 400 })

    const { tenancyId } = result.data

    const contract = await prisma.tenancyContract.findUnique({
      where: { tenancyId },
    })
    if (!contract) return NextResponse.json({ error: 'No contract found for this tenancy' }, { status: 404 })

    await prisma.tenancyContract.delete({
      where: { tenancyId },
    })

    return NextResponse.json({ success: true, message: 'Contract deleted — you can now regenerate' })
  } catch (err) {
    console.error('[admin/dev/reset-contract]', err)
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
