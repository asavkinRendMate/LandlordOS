export interface RoomEntry {
  type: string
  name: string
}

export const ROOM_TYPE_LABELS: Record<string, string> = {
  BEDROOM: 'Bedroom',
  LIVING_ROOM: 'Living Room',
  KITCHEN: 'Kitchen',
  BATHROOM: 'Bathroom',
  WC: 'WC',
  HALLWAY: 'Hallway',
  DINING_ROOM: 'Dining Room',
  UTILITY_ROOM: 'Utility Room',
  GARDEN: 'Garden',
  GARAGE: 'Garage',
  LOFT: 'Loft',
  CONSERVATORY: 'Conservatory',
  OTHER: 'Other',
}

export const QUICK_ADD_ROOMS: RoomEntry[] = [
  { type: 'WC', name: 'WC' },
  { type: 'DINING_ROOM', name: 'Dining Room' },
  { type: 'UTILITY_ROOM', name: 'Utility Room' },
  { type: 'GARDEN', name: 'Garden' },
  { type: 'GARAGE', name: 'Garage' },
  { type: 'LOFT', name: 'Loft' },
  { type: 'CONSERVATORY', name: 'Conservatory' },
]

export function suggestRooms(propertyType: string, bedrooms: number): RoomEntry[] {
  const rooms: RoomEntry[] = []

  for (let i = 1; i <= bedrooms; i++) {
    rooms.push({ type: 'BEDROOM', name: `Bedroom ${i}` })
  }

  rooms.push({ type: 'LIVING_ROOM', name: 'Living Room' })
  rooms.push({ type: 'KITCHEN', name: 'Kitchen' })
  rooms.push({ type: 'BATHROOM', name: 'Bathroom' })
  rooms.push({ type: 'HALLWAY', name: 'Hallway' })

  if (propertyType === 'HOUSE') {
    rooms.push({ type: 'GARDEN', name: 'Garden' })
    if (bedrooms >= 3) {
      rooms.push({ type: 'DINING_ROOM', name: 'Dining Room' })
    }
  }

  if (propertyType === 'FLAT' && bedrooms >= 2) {
    rooms.push({ type: 'WC', name: 'WC' })
  }

  return rooms
}
