import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({ log: [] })

const VIOLATION_TYPES = [
  'expired_meter',
  'no_parking_zone',
  'blocking_hydrant',
  'disabled_spot',
] as const

const BASE_AMOUNTS: Record<string, number> = {
  expired_meter: 50000,
  no_parking_zone: 150000,
  blocking_hydrant: 250000,
  disabled_spot: 500000,
}

function timeStr(h: number, m: number): Date {
  return new Date(`1970-01-01T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`)
}

const TIME_WINDOWS = [
  { start: timeStr(6, 0), end: timeStr(22, 0), multiplier: 1.0 },
  { start: timeStr(22, 0), end: timeStr(6, 0), multiplier: 1.5 },
]

const REPEAT_LEVELS = [
  { minCount: 0, multiplier: 1.0 },
  { minCount: 1, multiplier: 1.5 },
  { minCount: 2, multiplier: 2.0 },
]

async function main() {
  const existing = await prisma.fineRule.findFirst()
  if (existing) {
    console.log('Fine rules already seeded. Skipping.')
    return
  }

  const rule = await prisma.fineRule.create({
    data: {
      version: 1,
      status: 'active',
    },
  })

  for (const vt of VIOLATION_TYPES) {
    for (const tw of TIME_WINDOWS) {
      for (const rl of REPEAT_LEVELS) {
        await prisma.fineRuleDetail.create({
          data: {
            rule_id: rule.id,
            violation_type: vt,
            base_amount: BASE_AMOUNTS[vt],
            time_multiplier_start: tw.start,
            time_multiplier_end: tw.end,
            time_multiplier_value: tw.multiplier,
            repeat_count_min: rl.minCount,
            repeat_multiplier: rl.multiplier,
          },
        })
      }
    }
  }

  const count = await prisma.fineRuleDetail.count()
  console.log(`Seeded fine rule v1 with ${count} detail rows`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
