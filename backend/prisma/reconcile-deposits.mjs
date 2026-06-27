/**
 * Deposit Reconciliation Script — DRY RUN ONLY
 *
 * Finds APPROVED DepositRequests that have no matching wallet Transaction.
 * Prints what WOULD be fixed. Does NOT write anything to the database.
 *
 * Usage:
 *   node backend/prisma/reconcile-deposits.mjs           # dry run (safe)
 *   LIVE=1 node backend/prisma/reconcile-deposits.mjs   # apply fixes (review dry-run first)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const IS_LIVE = process.env.LIVE === '1'

async function main() {
  console.log('\n============================================================')
  console.log(IS_LIVE ? '🔴 LIVE MODE — changes will be written' : '🟡 DRY RUN — no changes will be written')
  console.log('============================================================\n')

  // 1. Load all APPROVED deposit requests
  const approvedDeposits = await prisma.depositRequest.findMany({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Found ${approvedDeposits.length} APPROVED deposit request(s).`)

  if (approvedDeposits.length === 0) {
    console.log('Nothing to reconcile.')
    return
  }

  let orphanCount = 0
  let okCount = 0
  const fixes = []

  for (const dep of approvedDeposits) {
    // Check for a matching Transaction
    const tx = await prisma.transaction.findFirst({
      where: {
        userId: dep.userId,
        type: 'DEPOSIT',
        note: { contains: dep.id },
      },
    })

    if (tx) {
      okCount++
      console.log(`  ✅ ${dep.id}  amount=${dep.amount}  matched tx=${tx.id}`)
    } else {
      orphanCount++
      console.log(`  ❌ ${dep.id}  amount=${dep.amount}  userId=${dep.userId}  NO matching transaction`)

      // Check current wallet balance
      const wallet = await prisma.wallet.findUnique({ where: { userId: dep.userId } })
      console.log(`     wallet cashBalance=${wallet?.cashBalance ?? 'NO WALLET'}`)

      fixes.push({ dep, wallet })
    }
  }

  console.log(`\nSummary: ${okCount} matched, ${orphanCount} orphaned.\n`)

  if (orphanCount === 0) {
    console.log('✅ No reconciliation needed. All approved deposits have matching transactions.')
    return
  }

  if (!IS_LIVE) {
    console.log('🟡 DRY RUN — the following fixes WOULD be applied if you run with LIVE=1:\n')
    for (const { dep, wallet } of fixes) {
      console.log(`  DepositRequest ${dep.id}`)
      console.log(`    → Add Transaction: type=DEPOSIT, amount=${dep.amount}, userId=${dep.userId}`)
      if (wallet) {
        console.log(`    → Increment wallet ${wallet.id} cashBalance by ${dep.amount} (from ${wallet.cashBalance} to ${(wallet.cashBalance ?? 0) + dep.amount})`)
      } else {
        console.log(`    → Create wallet for userId=${dep.userId}, cashBalance=${dep.amount}`)
      }
    }
    console.log('\nReview the above, then run: LIVE=1 node backend/prisma/reconcile-deposits.mjs')
    return
  }

  // LIVE mode — apply fixes inside a transaction per deposit
  console.log('🔴 Applying fixes...\n')
  let fixed = 0
  let failed = 0

  for (const { dep, wallet } of fixes) {
    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: dep.userId }, select: { tenantId: true } })
        if (!user) throw new Error(`User ${dep.userId} not found`)

        // Upsert wallet
        const w = await tx.wallet.upsert({
          where: { userId: dep.userId },
          create: { userId: dep.userId, tenantId: user.tenantId, cashBalance: dep.amount },
          update: { cashBalance: { increment: dep.amount } },
        })

        // Create transaction record
        await tx.transaction.create({
          data: {
            userId: dep.userId,
            tenantId: user.tenantId,
            type: 'DEPOSIT',
            amount: dep.amount,
            ref: dep.bankReference || undefined,
            note: `[RECONCILED] Approved deposit request ${dep.id}`,
          },
        })

        console.log(`  ✅ Fixed ${dep.id} — wallet balance now ${w.cashBalance}`)
      })
      fixed++
    } catch (e) {
      console.error(`  ❌ Failed to fix ${dep.id}: ${e.message}`)
      failed++
    }
  }

  console.log(`\nDone. Fixed: ${fixed}, Failed: ${failed}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
