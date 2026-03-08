import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'

const roomSchema = z.object({
  type: z.enum([
    'BEDROOM', 'LIVING_ROOM', 'KITCHEN', 'BATHROOM', 'WC',
    'HALLWAY', 'DINING_ROOM', 'UTILITY_ROOM', 'GARDEN',
    'GARAGE', 'LOFT', 'CONSERVATORY', 'OTHER',
  ]),
  name: z.string().min(1),
  floor: z.number().int().optional(),
  order: z.number().int(),
})

const postSchema = z.object({
  rooms: z.array(roomSchema).min(1),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const property = await prisma.property.findFirst({
      where: { id: params.id, userId: user.id },
    })
    if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const rooms = await prisma.propertyRoom.findMany({
      where: { propertyId: params.id },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ data: rooms })
  } catch (err) {
    console.error('[rooms GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const property = await prisma.property.findFirst({
      where: { id: params.id, userId: user.id },
    })
    if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body: unknown = await req.json()
    const result = postSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const rooms = await prisma.$transaction(async (tx) => {
      await tx.propertyRoom.deleteMany({ where: { propertyId: params.id } })
      await tx.propertyRoom.createMany({
        data: result.data.rooms.map((r) => ({
          propertyId: params.id,
          type: r.type,
          name: r.name,
          floor: r.floor ?? null,
          order: r.order,
        })),
      })
      return tx.propertyRoom.findMany({
        where: { propertyId: params.id },
        orderBy: { order: 'asc' },
      })
    })

    return NextResponse.json({ data: rooms }, { status: 201 })
  } catch (err) {
    console.error('[rooms POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
