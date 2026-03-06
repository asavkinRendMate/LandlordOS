import { PrismaClient, ScoringCategory } from '@prisma/client'

const prisma = new PrismaClient()

const rules: { category: ScoringCategory; key: string; description: string; points: number }[] = [
  // AFFORDABILITY
  { category: 'AFFORDABILITY', key: 'RENT_BELOW_25_PCT',       description: 'Rent is less than 25% of net income',                                 points:  30 },
  { category: 'AFFORDABILITY', key: 'RENT_25_TO_30_PCT',       description: 'Rent is 25-30% of net income',                                        points:  15 },
  { category: 'AFFORDABILITY', key: 'RENT_30_TO_35_PCT',       description: 'Rent is 30-35% of net income',                                        points:   0 },
  { category: 'AFFORDABILITY', key: 'RENT_35_TO_40_PCT',       description: 'Rent is 35-40% of net income',                                        points: -15 },
  { category: 'AFFORDABILITY', key: 'RENT_ABOVE_40_PCT',       description: 'Rent exceeds 40% of net income',                                      points: -30 },
  { category: 'AFFORDABILITY', key: 'REGULAR_INCOME_PATTERN',  description: 'Salary received on consistent day each month (±2 days)',               points:  10 },

  // STABILITY
  { category: 'STABILITY', key: 'SINGLE_EMPLOYER_6M',          description: 'Income from single employer for 6+ months',                           points:  10 },
  { category: 'STABILITY', key: 'INCOME_STABLE_OR_GROWING',    description: 'Income stable or increasing over period',                             points:  10 },
  { category: 'STABILITY', key: 'INCOME_UNSTABLE',             description: 'Irregular or inconsistent income pattern',                            points:  -5 },
  { category: 'STABILITY', key: 'EMPLOYER_CHANGED',            description: 'Change of employer detected in analysis period',                      points:  -5 },

  // LIQUIDITY
  { category: 'LIQUIDITY', key: 'AVG_BALANCE_ABOVE_1_MONTH_RENT',   description: 'Average balance exceeds one month\'s rent',                     points:  15 },
  { category: 'LIQUIDITY', key: 'AVG_BALANCE_HALF_TO_1_MONTH_RENT', description: 'Average balance 0.5-1x monthly rent',                           points:   5 },
  { category: 'LIQUIDITY', key: 'AVG_BALANCE_BELOW_HALF_RENT',      description: 'Average balance below half monthly rent',                        points: -25 },
  { category: 'LIQUIDITY', key: 'LOW_BALANCE_1_2_MONTHS',           description: 'Balance below £100 before payday in 1-2 months',                points: -20 },
  { category: 'LIQUIDITY', key: 'LOW_BALANCE_3_PLUS_MONTHS',        description: 'Balance below £100 before payday in 3+ months',                 points: -35 },
  { category: 'LIQUIDITY', key: 'OVERDRAFT_1_2_TIMES',              description: 'Overdraft used 1-2 times in period',                            points:  -5 },
  { category: 'LIQUIDITY', key: 'OVERDRAFT_3_PLUS_TIMES',           description: 'Overdraft used 3 or more times in period',                      points: -25 },

  // DEBT
  { category: 'DEBT', key: 'PAYDAY_LOANS_DETECTED',            description: 'Payday loan transactions detected (Wonga, QuickQuid, etc.)',          points: -30 },
  { category: 'DEBT', key: 'BNPL_HIGH',                        description: 'BNPL payments (Klarna, Clearpay) regularly exceed £200/month',        points: -15 },
  { category: 'DEBT', key: 'BNPL_LOW',                         description: 'BNPL payments occasional and below £200/month',                       points:  -5 },
  { category: 'DEBT', key: 'DEBT_ABOVE_20_PCT_INCOME',         description: 'Total debt repayments exceed 20% of income',                         points: -20 },
  { category: 'DEBT', key: 'DEBT_10_TO_20_PCT_INCOME',         description: 'Total debt repayments are 10-20% of income',                         points: -10 },

  // GAMBLING
  { category: 'GAMBLING', key: 'GAMBLING_ANY',                 description: 'Any gambling transactions detected',                                  points: -10 },
  { category: 'GAMBLING', key: 'GAMBLING_ABOVE_5_PCT',         description: 'Gambling exceeds 5% of monthly income',                              points: -20 },
  { category: 'GAMBLING', key: 'GAMBLING_ABOVE_10_PCT',        description: 'Gambling exceeds 10% of monthly income',                             points: -40 },
  { category: 'GAMBLING', key: 'GAMBLING_4_PLUS_MONTHS',       description: 'Gambling detected in 4 or more months out of 6',                    points: -10 },

  // POSITIVE
  { category: 'POSITIVE', key: 'REGULAR_SAVINGS',              description: 'Regular transfers to savings account detected',                       points:  10 },
  { category: 'POSITIVE', key: 'CONFIRMED_RENT_HISTORY',       description: 'Previous rent payments visible in statement',                        points:  15 },
  { category: 'POSITIVE', key: 'NO_CHARGEBACKS',               description: 'No returned or reversed payments detected',                          points:   5 },
]

async function main() {
  console.log('Seeding scoring rules...')

  for (const rule of rules) {
    await prisma.scoringRule.upsert({
      where: { key: rule.key },
      update: { description: rule.description, points: rule.points, category: rule.category },
      create: rule,
    })
  }

  // Create active ScoringConfig v1
  await prisma.scoringConfig.upsert({
    where: { version: 1 },
    update: { isActive: true },
    create: { version: 1, isActive: true },
  })

  console.log(`✓ ${rules.length} scoring rules seeded`)
  console.log('✓ ScoringConfig v1 created and set active')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
