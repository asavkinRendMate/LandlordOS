import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Seeds a complete, realistic demo dataset for a newly created demo user.
 * All dates are relative to now() so the demo always feels current.
 */
export async function seedDemoUser(userId: string, userEmail: string) {
  const now = new Date()

  // Helper: date N months ago at start of day
  const monthsAgo = (n: number) => {
    const d = new Date(now)
    d.setMonth(d.getMonth() - n)
    d.setHours(0, 0, 0, 0)
    return d
  }

  // Helper: date N days ago
  const daysAgo = (n: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() - n)
    d.setHours(0, 0, 0, 0)
    return d
  }

  // ── 1. Update user name ────────────────────────────────────────────────
  await prisma.user.update({
    where: { id: userId },
    data: { name: 'Demo Landlord' },
  })

  // ── 2. Create property ─────────────────────────────────────────────────
  const property = await prisma.property.create({
    data: {
      userId,
      name: 'Victoria Street Flat',
      line1: '12 Victoria Street',
      city: 'Manchester',
      postcode: 'M2 4HP',
      type: 'FLAT',
      bedrooms: 2,
      status: 'ACTIVE',
    },
  })

  // ── 3. Create rooms ────────────────────────────────────────────────────
  const rooms = await Promise.all([
    prisma.propertyRoom.create({
      data: { propertyId: property.id, type: 'BEDROOM', name: 'Bedroom 1', floor: 0, order: 0 },
    }),
    prisma.propertyRoom.create({
      data: { propertyId: property.id, type: 'BEDROOM', name: 'Bedroom 2', floor: 0, order: 1 },
    }),
    prisma.propertyRoom.create({
      data: { propertyId: property.id, type: 'LIVING_ROOM', name: 'Living Room', floor: 0, order: 2 },
    }),
    prisma.propertyRoom.create({
      data: { propertyId: property.id, type: 'KITCHEN', name: 'Kitchen', floor: 0, order: 3 },
    }),
    prisma.propertyRoom.create({
      data: { propertyId: property.id, type: 'BATHROOM', name: 'Bathroom', floor: 0, order: 4 },
    }),
    prisma.propertyRoom.create({
      data: { propertyId: property.id, type: 'HALLWAY', name: 'Hallway', floor: 0, order: 5 },
    }),
  ])

  // ── 4. Create compliance docs ──────────────────────────────────────────
  // Gas Safety — valid (issued 3 months ago, expires in 9 months)
  await prisma.complianceDoc.create({
    data: {
      propertyId: property.id,
      type: 'GAS_SAFETY',
      status: 'VALID',
      issuedDate: monthsAgo(3),
      expiryDate: (() => { const d = new Date(now); d.setMonth(d.getMonth() + 9); return d })(),
    },
  })

  // EPC — valid (issued 1 year ago, expires in 9 years)
  await prisma.complianceDoc.create({
    data: {
      propertyId: property.id,
      type: 'EPC',
      status: 'VALID',
      issuedDate: monthsAgo(12),
      expiryDate: (() => { const d = new Date(now); d.setFullYear(d.getFullYear() + 9); return d })(),
    },
  })

  // EICR — expiring soon (expires in 3 weeks → triggers alert)
  await prisma.complianceDoc.create({
    data: {
      propertyId: property.id,
      type: 'EICR',
      status: 'EXPIRING',
      issuedDate: monthsAgo(58), // ~5 years ago
      expiryDate: (() => { const d = new Date(now); d.setDate(d.getDate() + 21); return d })(),
    },
  })

  // How to Rent — issued
  await prisma.complianceDoc.create({
    data: {
      propertyId: property.id,
      type: 'HOW_TO_RENT',
      status: 'VALID',
      issued: true,
      version: '2024',
    },
  })

  // ── 5. Create tenant (Sarah Johnson) ───────────────────────────────────
  const tenant = await prisma.tenant.create({
    data: {
      propertyId: property.id,
      name: 'Sarah Johnson',
      email: 'sarah.demo@letsorted.co.uk',
      phone: '07700 900123',
      status: 'TENANT',
      confirmedAt: monthsAgo(6),
    },
  })

  // ── 6. Create active tenancy ───────────────────────────────────────────
  const tenancy = await prisma.tenancy.create({
    data: {
      propertyId: property.id,
      tenantId: tenant.id,
      startDate: monthsAgo(6),
      monthlyRent: 120000, // £1200 in pence
      paymentDay: 1,
      status: 'ACTIVE',
      depositAmount: 180000, // £1800 in pence
      depositScheme: 'DPS',
      depositRef: 'DPS-DEMO-2024-001',
      depositProtected: true,
      depositProtectedAt: monthsAgo(6),
    },
  })

  // ── 7. Create rent payments (3 months: 2 RECEIVED, 1 PENDING) ─────────
  // Two months ago — received
  await prisma.rentPayment.create({
    data: {
      tenancyId: tenancy.id,
      amount: 120000,
      dueDate: monthsAgo(2),
      receivedDate: (() => { const d = monthsAgo(2); d.setDate(d.getDate() + 1); return d })(),
      status: 'RECEIVED',
    },
  })

  // One month ago — received
  await prisma.rentPayment.create({
    data: {
      tenancyId: tenancy.id,
      amount: 120000,
      dueDate: monthsAgo(1),
      receivedDate: monthsAgo(1),
      status: 'RECEIVED',
    },
  })

  // This month — pending (due on 1st)
  const thisMonthDue = new Date(now.getFullYear(), now.getMonth(), 1)
  await prisma.rentPayment.create({
    data: {
      tenancyId: tenancy.id,
      amount: 120000,
      dueDate: thisMonthDue,
      status: thisMonthDue <= now ? 'EXPECTED' : 'PENDING',
    },
  })

  // ── 8. Create maintenance requests ─────────────────────────────────────
  // Open: leaking tap
  await prisma.maintenanceRequest.create({
    data: {
      propertyId: property.id,
      tenantId: tenant.id,
      title: 'Leaking tap in bathroom',
      description: 'The cold tap in the bathroom has been dripping constantly for the past few days. It seems to be getting worse.',
      priority: 'MEDIUM',
      status: 'OPEN',
      createdAt: daysAgo(3),
    },
  })

  // Resolved: broken window latch
  const resolvedRequest = await prisma.maintenanceRequest.create({
    data: {
      propertyId: property.id,
      tenantId: tenant.id,
      title: 'Broken window latch in bedroom',
      description: 'The latch on the bedroom window is broken and the window won\'t close securely.',
      priority: 'HIGH',
      status: 'RESOLVED',
      createdAt: daysAgo(21),
      resolvedAt: daysAgo(14),
      resolvedBy: userId,
    },
  })

  // Status history for resolved request
  await prisma.maintenanceStatusHistory.create({
    data: {
      requestId: resolvedRequest.id,
      fromStatus: 'OPEN',
      toStatus: 'IN_PROGRESS',
      changedBy: userId,
      changedAt: daysAgo(18),
      note: 'Contractor booked for next week',
    },
  })
  await prisma.maintenanceStatusHistory.create({
    data: {
      requestId: resolvedRequest.id,
      fromStatus: 'IN_PROGRESS',
      toStatus: 'RESOLVED',
      changedBy: userId,
      changedAt: daysAgo(14),
      note: 'Window latch replaced by contractor',
    },
  })

  // ── 9. Create property inspection (AGREED, MOVE_IN) ────────────────────
  const inspection = await prisma.propertyInspection.create({
    data: {
      propertyId: property.id,
      tenantId: tenant.id,
      inspectionType: 'MOVE_IN',
      inspectionNumber: 1,
      status: 'AGREED',
      landlordConfirmedAt: monthsAgo(6),
      tenantConfirmedAt: monthsAgo(6),
      createdAt: monthsAgo(6),
    },
  })

  // Inspection photos (3 photos across 2 rooms — no real files, just DB records)
  await prisma.inspectionPhoto.createMany({
    data: [
      {
        inspectionId: inspection.id,
        roomId: rooms[0].id, // Bedroom 1
        roomName: 'Bedroom 1',
        uploadedBy: 'LANDLORD',
        uploaderName: 'Demo Landlord',
        fileUrl: `demo/inspections/${inspection.id}/bedroom1-overview.jpg`,
        caption: 'Bedroom 1 — good condition',
        condition: 'GOOD',
        takenAt: monthsAgo(6),
      },
      {
        inspectionId: inspection.id,
        roomId: rooms[0].id, // Bedroom 1
        roomName: 'Bedroom 1',
        uploadedBy: 'LANDLORD',
        uploaderName: 'Demo Landlord',
        fileUrl: `demo/inspections/${inspection.id}/bedroom1-window.jpg`,
        caption: 'Bedroom 1 window — minor scuff on sill',
        condition: 'MINOR_ISSUE',
        takenAt: monthsAgo(6),
      },
      {
        inspectionId: inspection.id,
        roomId: rooms[3].id, // Kitchen
        roomName: 'Kitchen',
        uploadedBy: 'LANDLORD',
        uploaderName: 'Demo Landlord',
        fileUrl: `demo/inspections/${inspection.id}/kitchen-overview.jpg`,
        caption: 'Kitchen — good condition',
        condition: 'GOOD',
        takenAt: monthsAgo(6),
      },
    ],
  })

  // ── 10. Create property documents ──────────────────────────────────────
  await prisma.propertyDocument.createMany({
    data: [
      {
        propertyId: property.id,
        documentType: 'TENANCY_AGREEMENT',
        fileName: 'tenancy-agreement-victoria-street.pdf',
        fileUrl: `demo/documents/${property.id}/tenancy-agreement.pdf`,
        fileSize: 245000,
        mimeType: 'application/pdf',
        uploadedAt: monthsAgo(6),
      },
      {
        propertyId: property.id,
        documentType: 'HOW_TO_RENT',
        fileName: 'how-to-rent-guide-2024.pdf',
        fileUrl: `demo/documents/${property.id}/how-to-rent.pdf`,
        fileSize: 180000,
        mimeType: 'application/pdf',
        uploadedAt: monthsAgo(6),
      },
    ],
  })

  // ── 11. Create candidate with financial report ─────────────────────────
  const candidate = await prisma.tenant.create({
    data: {
      propertyId: property.id,
      name: 'James Miller',
      email: 'james.demo@letsorted.co.uk',
      status: 'CANDIDATE',
    },
  })

  // Ensure scoring config exists
  await prisma.scoringConfig.upsert({
    where: { version: 1 },
    update: {},
    create: { version: 1, isActive: true },
  })

  await prisma.financialReport.create({
    data: {
      tenantId: candidate.id,
      propertyId: property.id,
      reportType: 'LANDLORD_REQUESTED',
      status: 'COMPLETED',
      scoringConfigVersion: 1,
      totalScore: 78,
      grade: 'Good',
      aiSummary: 'Applicant demonstrates a stable income pattern with regular salary deposits. Rent-to-income ratio is within acceptable range at approximately 30%. No gambling or payday loan activity detected. Minor BNPL usage noted but within reasonable limits. Overall financial profile is solid with consistent savings behaviour.',
      breakdown: {
        AFFORDABILITY: { score: 15, rules: ['RENT_25_TO_30_PCT', 'REGULAR_INCOME_PATTERN'] },
        STABILITY: { score: 20, rules: ['SINGLE_EMPLOYER_6M', 'INCOME_STABLE_OR_GROWING'] },
        LIQUIDITY: { score: 20, rules: ['AVG_BALANCE_ABOVE_1_MONTH_RENT'] },
        DEBT: { score: -5, rules: ['BNPL_LOW'] },
        GAMBLING: { score: 0, rules: [] },
        POSITIVE: { score: 28, rules: ['REGULAR_SAVINGS', 'CONFIRMED_RENT_HISTORY', 'NO_CHARGEBACKS'] },
      },
      appliedRules: [
        { key: 'RENT_25_TO_30_PCT', points: 15, description: 'Rent is 25-30% of net income' },
        { key: 'REGULAR_INCOME_PATTERN', points: 10, description: 'Salary received on consistent day each month' },
        { key: 'SINGLE_EMPLOYER_6M', points: 10, description: 'Income from single employer for 6+ months' },
        { key: 'INCOME_STABLE_OR_GROWING', points: 10, description: 'Income stable or increasing over period' },
        { key: 'AVG_BALANCE_ABOVE_1_MONTH_RENT', points: 15, description: 'Average balance exceeds one month\'s rent' },
        { key: 'BNPL_LOW', points: -5, description: 'BNPL payments occasional and below £200/month' },
        { key: 'REGULAR_SAVINGS', points: 10, description: 'Regular transfers to savings account detected' },
        { key: 'CONFIRMED_RENT_HISTORY', points: 15, description: 'Previous rent payments visible in statement' },
        { key: 'NO_CHARGEBACKS', points: 5, description: 'No returned or reversed payments detected' },
      ],
      isLocked: false,
      applicantName: 'James Miller',
      monthlyRentPence: 120000,
      declaredIncomePence: 420000, // £4,200/mo
    },
  })
}

// Allow direct execution for testing: npx tsx prisma/demo-seed.ts <userId> <email>
if (require.main === module) {
  const [userId, email] = process.argv.slice(2)
  if (!userId || !email) {
    console.error('Usage: npx tsx prisma/demo-seed.ts <userId> <email>')
    process.exit(1)
  }
  seedDemoUser(userId, email)
    .then(() => console.log('Demo seed complete'))
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}
