/**
 * Creates (or re-syncs) the dedicated Apple App Review account.
 *
 *   APPLE_REVIEW_PASSWORD='...' npx tsx scripts/create-apple-review-account.ts
 *
 * Idempotent: safe to re-run. It never creates a wallet balance, holding,
 * order, deposit request or withdrawal request, and it never touches any other
 * user.
 *
 * The password is read from the APPLE_REVIEW_PASSWORD environment variable at
 * execution time. It is never hardcoded, never logged, and never written to
 * documentation.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const REVIEWER_EMAIL = 'apple-review@alwsm.sa'
const REVIEWER_NAME = 'Apple App Review'
const BCRYPT_ROUNDS = 12 // matches scripts/seed-admin.ts

async function main(): Promise<void> {
  const password = process.env.APPLE_REVIEW_PASSWORD
  if (!password || password.trim().length < 12) {
    console.error(
      '❌ APPLE_REVIEW_PASSWORD is required (minimum 12 characters) and must be supplied at run time.'
    )
    process.exit(1)
  }

  // Refuse to touch anything that is not the reviewer account.
  const existing = await prisma.user.findUnique({
    where: { email: REVIEWER_EMAIL },
    select: { id: true, email: true, role: true, isStoreReviewer: true },
  })

  if (existing && existing.role !== 'INVESTOR') {
    console.error(
      `❌ Refusing to modify ${REVIEWER_EMAIL}: existing role is ${existing.role}, expected INVESTOR.`
    )
    process.exit(1)
  }

  const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!tenant) {
    console.error('❌ No tenant found. Run scripts/seed-tenant.ts first.')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  const user = await prisma.user.upsert({
    where: { email: REVIEWER_EMAIL },
    // Only fields that define the reviewer's identity/permissions are synced.
    // No financial fields are ever written here.
    update: {
      passwordHash,
      role: 'INVESTOR',
      status: 'ACTIVE',
      isStoreReviewer: true,
      emailVerified: true,
      kycVerified: true,
    },
    create: {
      email: REVIEWER_EMAIL,
      fullName: REVIEWER_NAME,
      passwordHash,
      role: 'INVESTOR',
      status: 'ACTIVE',
      isStoreReviewer: true,
      emailVerified: true,
      // phoneVerified is intentionally left false: phoneNumber is @unique and
      // nothing in the login or review flow requires it, so no phone number is
      // invented for this account.
      kycVerified: true,
      tenantId: tenant.id,
    },
    select: { id: true, email: true, role: true, status: true, isStoreReviewer: true },
  })

  // Wallet must exist (the app reads it) but stays at exactly 0.
  const wallet = await prisma.wallet.upsert({
    where: { userId: user.id },
    update: {}, // never overwrite an existing balance
    create: { userId: user.id, tenantId: tenant.id, cashBalance: 0 },
    select: { id: true, cashBalance: true },
  })

  // Verify the account carries no financial records.
  const [holdings, orders, deposits, withdrawals] = await Promise.all([
    prisma.holding.count({ where: { userId: user.id } }),
    prisma.order.count({ where: { userId: user.id } }),
    prisma.depositRequest.count({ where: { userId: user.id } }),
    prisma.withdrawalRequest.count({ where: { userId: user.id } }),
  ])

  console.log('✅ Apple review account ready (password not shown):')
  console.log({
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    isStoreReviewer: user.isStoreReviewer,
    walletBalance: wallet.cashBalance,
    holdings,
    orders,
    depositRequests: deposits,
    withdrawalRequests: withdrawals,
  })

  if (wallet.cashBalance !== 0 || holdings || orders || deposits || withdrawals) {
    console.warn('⚠️  Account has financial records — investigate before handing to Apple.')
  }
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
