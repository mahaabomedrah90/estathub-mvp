import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { requireRole } from '../middleware/roles'

export const ownerStatementRouter = Router()

// ─── Builder ──────────────────────────────────────────────────────────────────

async function buildOwnerStatement(ownerId: string) {
  // 1. Owner user profile
  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: {
      id: true, fullName: true, email: true,
      nationalId: true, phoneNumber: true,
      status: true, createdAt: true,
    },
  })
  if (!user) throw Object.assign(new Error('owner_not_found'), { statusCode: 404 })

  // 2. Owner's properties (ownerId field on Property)
  const properties = await prisma.property.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'asc' },
  })

  const propertyIds = properties.map((p: any) => p.id)

  // 3. Parallel queries on owner's data
  const [wallet, orders, payouts, withdrawalRequests, investmentFeeRecords] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: ownerId } }),

    propertyIds.length > 0
      ? prisma.order.findMany({
          where: { propertyId: { in: propertyIds }, status: { in: ['PAID', 'ISSUED'] } },
          include: {
            property: { select: { id: true, title: true } },
            user: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        })
      : Promise.resolve([]),

    propertyIds.length > 0
      ? prisma.payout.findMany({
          where: { propertyId: { in: propertyIds } },
          include: {
            property: { select: { id: true, title: true } },
            distributions: { select: { id: true, userId: true, amount: true } },
          },
          orderBy: { createdAt: 'asc' },
        })
      : Promise.resolve([]),

    prisma.withdrawalRequest.findMany({
      where: { userId: ownerId },
      orderBy: { createdAt: 'asc' },
    }),

    propertyIds.length > 0
      ? (prisma as any).platformRevenue.findMany({
          where: { propertyId: { in: propertyIds }, type: 'INVESTMENT_FEE' },
          select: { amount: true, propertyId: true },
        })
      : Promise.resolve([]),
  ])

  // ── Per-property aggregations ─────────────────────────────────────────────
  const capitalPerProperty = new Map<string, number>()
  const ordersPerProperty  = new Map<string, number>()
  const investorsPerProperty = new Map<string, Set<string>>()

  for (const o of orders as any[]) {
    capitalPerProperty.set(o.propertyId, (capitalPerProperty.get(o.propertyId) ?? 0) + o.amount)
    ordersPerProperty.set(o.propertyId, (ordersPerProperty.get(o.propertyId) ?? 0) + 1)
    if (!investorsPerProperty.has(o.propertyId)) investorsPerProperty.set(o.propertyId, new Set())
    investorsPerProperty.get(o.propertyId)!.add(o.userId)
  }

  const rentalPerProperty = new Map<string, number>()
  for (const p of payouts as any[]) {
    rentalPerProperty.set(p.propertyId, (rentalPerProperty.get(p.propertyId) ?? 0) + p.totalAmount)
  }

  // ── Owner bank details (from first property that has them) ────────────────
  const bankProperty = (properties as any[]).find(p => p.ownerIban || p.ownerEmail)

  // ── Property portfolio table ──────────────────────────────────────────────
  const propertyPortfolio = (properties as any[]).map(p => {
    const soldTokens  = p.totalTokens - p.remainingTokens
    const capitalRaised = capitalPerProperty.get(p.id) ?? 0
    const fundingPct  = p.totalTokens > 0 ? (soldTokens / p.totalTokens) * 100 : 0
    return {
      id: p.id,
      title: p.title,
      location: p.location ?? '',
      city: p.city ?? '',
      totalValue: p.totalValue,
      tokenPrice: p.tokenPrice,
      totalTokens: p.totalTokens,
      soldTokens,
      remainingTokens: p.remainingTokens,
      capitalRaised,
      ownerRetainedPct: p.ownerRetainedPercentage ?? 0,
      payoutSchedule: p.payoutSchedule ?? 'MONTHLY',
      status: p.status,
      fundingPct,
      investorCount: investorsPerProperty.get(p.id)?.size ?? 0,
      tokenizationDate: p.approvedAt ?? p.submittedAt ?? p.createdAt,
      rentalIncome: rentalPerProperty.get(p.id) ?? 0,
    }
  })

  // ── Capital raising history (individual orders) ───────────────────────────
  const capitalRaisingHistory = (orders as any[]).map(o => ({
    id: o.id,
    date: o.createdAt,
    propertyId: o.propertyId,
    propertyTitle: o.property?.title ?? '—',
    tokens: o.tokens,
    amount: o.amount,
    investorName: o.user?.fullName ?? o.user?.email ?? '—',
    investorId: o.userId,
    status: o.status,
  }))

  // ── Rental income statement (payouts per property per period) ─────────────
  const rentalIncomeStatement = (payouts as any[]).map(p => {
    const totalDistributed = (p.distributions as any[]).reduce(
      (s: number, d: any) => s + d.amount, 0
    )
    return {
      id: p.id,
      date: p.createdAt,
      propertyId: p.propertyId,
      propertyTitle: p.property?.title ?? '—',
      period: p.month,
      totalPayoutAmount: p.totalAmount,
      totalDistributedToInvestors: totalDistributed,
      distributionCount: (p.distributions as any[]).length,
    }
  })

  // ── Settlement history (withdrawal requests) ──────────────────────────────
  const settlementHistory = (withdrawalRequests as any[]).map(w => ({
    id: w.id,
    date: w.createdAt,
    reviewedAt: w.reviewedAt ?? null,
    amount: w.amount,
    status: w.status,
    bankName: w.bankName ?? null,
    iban: w.iban ?? null,
    adminNote: w.adminNote ?? null,
    ref: w.id,
  }))

  // ── Ledger: unified chronological event list ──────────────────────────────
  type LedgerEvent = {
    date: Date
    type: string
    description: string
    descriptionEn: string
    debit: number
    credit: number
    ref: string
    propertyId: string | null
  }

  const events: LedgerEvent[] = []

  // TOKEN SALES → CREDIT (investor capital received; creates liability payable to owner)
  for (const o of orders as any[]) {
    events.push({
      date: o.createdAt,
      type: 'CAPITAL_RAISED',
      description: `رأس مال مستثمرين — ${o.property?.title ?? ''} (${o.tokens} حصة)`,
      descriptionEn: `Investor Capital — ${o.property?.title ?? ''} (${o.tokens} tokens)`,
      debit: 0,
      credit: o.amount,
      ref: o.id,
      propertyId: o.propertyId,
    })
  }

  // RENTAL PAYOUTS → CREDIT
  for (const p of payouts as any[]) {
    events.push({
      date: p.createdAt,
      type: 'RENTAL_INCOME',
      description: `دخل إيجاري — ${p.property?.title ?? ''} (${p.month})`,
      descriptionEn: `Rental Income — ${p.property?.title ?? ''} (${p.month})`,
      debit: 0,
      credit: p.totalAmount,
      ref: p.id,
      propertyId: p.propertyId,
    })
  }

  // APPROVED WITHDRAWALS → DEBIT (settlements reduce the balance)
  for (const w of withdrawalRequests as any[]) {
    if (w.status === 'APPROVED') {
      const approvedAt: Date = w.reviewedAt ?? w.updatedAt ?? w.createdAt
      events.push({
        date: approvedAt,
        type: 'SETTLEMENT',
        description: w.bankName ? `تحويل تسوية — ${w.bankName}` : 'تحويل تسوية',
        descriptionEn: w.bankName ? `Settlement Transfer — ${w.bankName}` : 'Settlement Transfer',
        debit: w.amount,
        credit: 0,
        ref: w.id,
        propertyId: null,
      })
    }
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime())

  let runningBalance = 0
  const ledger = events.map((e, idx) => {
    runningBalance = +(runningBalance + e.credit - e.debit).toFixed(2)
    return {
      seq: idx + 1,
      date: e.date,
      type: e.type,
      description: e.description,
      descriptionEn: e.descriptionEn,
      debit: e.debit,
      credit: e.credit,
      balance: runningBalance,
      ref: e.ref,
      propertyId: e.propertyId,
    }
  })

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalCapitalRaised   = (orders as any[]).reduce((s, o) => s + o.amount, 0)
  const totalRentalIncome    = (payouts as any[]).reduce((s, p) => s + p.totalAmount, 0)
  const availableBalance     = wallet?.cashBalance ?? 0
  const pendingSettlements   = (withdrawalRequests as any[])
    .filter(w => w.status === 'PENDING').reduce((s, w) => s + w.amount, 0)
  const transferredToOwner   = (withdrawalRequests as any[])
    .filter(w => w.status === 'APPROVED').reduce((s, w) => s + w.amount, 0)
  const totalTokensSold      = (properties as any[]).reduce((s, p) => s + (p.totalTokens - p.remainingTokens), 0)
  const totalTokensRemaining = (properties as any[]).reduce((s, p) => s + p.remainingTokens, 0)
  const totalInvestors       = new Set((orders as any[]).map(o => o.userId)).size
  // Capital Raised = Liability (owed to owner). Rental Income = Income. Settlements = Liability Reduction.
  // ownerReceivableBalance / platformLiabilityToOwner: what ALWSM owes the owner at this point in time.
  const ownerReceivableBalance  = +(totalCapitalRaised + totalRentalIncome - transferredToOwner).toFixed(2)
  const platformLiabilityToOwner = ownerReceivableBalance
  const investorFundsHeld       = totalCapitalRaised
  const allTotalTokens          = totalTokensSold + totalTokensRemaining
  const fundingProgressPct      = allTotalTokens > 0
    ? +((totalTokensSold / allTotalTokens) * 100).toFixed(2)
    : 0

  // ── Reconciliation ────────────────────────────────────────────────────────
  // Expected balance ALWSM holds for owner =
  //   Capital Raised + Rental Income - Settlements Transferred
  const expectedBalance = +(totalCapitalRaised + totalRentalIncome - transferredToOwner).toFixed(2)
  const discrepancy     = +(availableBalance - expectedBalance).toFixed(2)

  return {
    generatedAt: new Date(),
    owner: {
      id: user.id,
      fullName: user.fullName ?? '—',
      email: user.email,
      nationalId: user.nationalId ?? null,
      phoneNumber: user.phoneNumber ?? null,
      status: user.status,
      memberSince: user.createdAt,
      // Bank details from properties
      ownerIban:   bankProperty?.ownerIban   ?? null,
      ownerPhone:  bankProperty?.ownerPhone  ?? null,
      ownerEmail:  bankProperty?.ownerEmail  ?? null,
      ownerName:   bankProperty?.ownerName   ?? user.fullName ?? '—',
      ownerType:   bankProperty?.ownerType   ?? null,
      commercialRegistration: bankProperty?.commercialRegistration ?? null,
    },
    summary: {
      totalCapitalRaised,       // Liability: investor funds collected for owner's property
      investorFundsHeld,        // Alias for totalCapitalRaised — surfaced separately for clarity
      availableBalance,
      pendingSettlements,
      transferredToOwner,
      platformFeesPaid: (investmentFeeRecords as any[]).reduce((s: number, r: any) => s + r.amount, 0),
      ownerReceivableBalance,   // Capital + Rental − Transferred (what owner is owed)
      platformLiabilityToOwner, // ALWSM's creditor payable to this owner (same formula)
      totalRentalIncome,
      fundingProgressPct,
      propertiesTokenized: properties.length,
      totalTokensSold,
      totalTokensRemaining,
      totalInvestors,
    },
    propertyPortfolio,
    capitalRaisingHistory,
    rentalIncomeStatement,
    settlementHistory,
    ledger,
    reconciliation: {
      // Accounting classification:
      //   Capital Raised  → Liability (investor funds ALWSM holds on owner's behalf)
      //   Rental Income   → Income earned and credited to owner
      //   Settlements     → Liability Reduction (paid out to owner)
      totalCapitalRaised,
      totalRentalIncome,
      totalSettlements: transferredToOwner,
      platformFeesPaid: (investmentFeeRecords as any[]).reduce((s: number, r: any) => s + r.amount, 0),
      expectedOwnerLiability: expectedBalance, // = Capital + Rental − Transferred
      expectedBalance,                          // kept for backward compat
      actualBalance: availableBalance,
      discrepancy,
      isBalanced: Math.abs(discrepancy) < 0.01,
    },
  }
}

// ─── Admin: full portfolio report (all owners + properties) ──────────────────
// GET /api/admin/owner-statement/full-report   ← must be BEFORE /:ownerId
ownerStatementRouter.get(
  '/admin/owner-statement/full-report',
  auth(true),
  requireRole(['ADMIN']),
  async (_req: Request & { user?: any }, res: Response) => {
    try {
      const [owners, allProperties] = await Promise.all([
        prisma.user.findMany({
          where:   { role: 'OWNER' },
          select:  { id: true, fullName: true, email: true, status: true },
          orderBy: { createdAt: 'desc' },
        }),
        (prisma.property as any).findMany({
          select: { id: true, ownerId: true, title: true, totalValue: true, status: true },
        }),
      ])

      const allPropIds = (allProperties as any[]).map((p: any) => p.id)
      const allOrders  = allPropIds.length > 0
        ? await prisma.order.findMany({
            where:  { propertyId: { in: allPropIds }, status: { in: ['PAID', 'ISSUED'] } },
            select: { propertyId: true, amount: true },
          })
        : []

      const capitalPerProp = new Map<string, number>()
      for (const o of allOrders as any[]) {
        capitalPerProp.set(o.propertyId, (capitalPerProp.get(o.propertyId) ?? 0) + o.amount)
      }

      const propsByOwner = new Map<string, any[]>()
      for (const p of allProperties as any[]) {
        if (!propsByOwner.has(p.ownerId)) propsByOwner.set(p.ownerId, [])
        propsByOwner.get(p.ownerId)!.push(p)
      }

      const data = (owners as any[])
        .map(owner => {
          const props = propsByOwner.get(owner.id) ?? []
          if (props.length === 0) return null
          const propertyRows = props.map((p: any) => {
            const capitalRaised = capitalPerProp.get(p.id) ?? 0
            return {
              id:             p.id,
              title:          p.title,
              totalValue:     p.totalValue ?? 0,
              capitalRaised:  +capitalRaised.toFixed(2),
              status:         p.status,
            }
          })
          return {
            id:            owner.id,
            fullName:      owner.fullName ?? '—',
            email:         owner.email,
            status:        owner.status,
            capitalRaised: +propertyRows.reduce((s: number, p: any) => s + p.capitalRaised, 0).toFixed(2),
            properties:    propertyRows,
          }
        })
        .filter(Boolean)

      return res.json({ success: true, data })
    } catch (e: any) {
      console.error('❌ owner full-report:', e?.message)
      return res.status(500).json({ error: 'failed_to_fetch_full_report' })
    }
  }
)

// ─── Admin: list owners ───────────────────────────────────────────────────────
ownerStatementRouter.get(
  '/admin/owner-statement',
  auth(true),
  requireRole(['ADMIN']),
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const owners = await prisma.user.findMany({
        where: { role: 'OWNER' },
        select: {
          id: true, fullName: true, email: true,
          nationalId: true, phoneNumber: true,
          status: true, createdAt: true,
          wallet: { select: { cashBalance: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      // Attach property count
      const withCount = await Promise.all(
        owners.map(async (o: any) => ({
          ...o,
          propertiesCount: await prisma.property.count({ where: { ownerId: o.id } }),
        }))
      )
      return res.json({ success: true, data: withCount })
    } catch (e: any) {
      console.error('❌ owner-statement list:', e?.message)
      return res.status(500).json({ error: 'failed_to_fetch_owners' })
    }
  }
)

// ─── Admin: full statement ────────────────────────────────────────────────────
ownerStatementRouter.get(
  '/admin/owner-statement/:ownerId',
  auth(true),
  requireRole(['ADMIN']),
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const data = await buildOwnerStatement(req.params.ownerId)
      return res.json({ success: true, data })
    } catch (e: any) {
      const status = (e as any).statusCode ?? 500
      console.error('❌ owner-statement admin:', e?.message)
      return res.status(status).json({ error: e?.message ?? 'failed_to_fetch_statement' })
    }
  }
)

// ─── Owner self-service ───────────────────────────────────────────────────────
ownerStatementRouter.get(
  '/owner-statement',
  auth(true),
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const data = await buildOwnerStatement(req.user!.userId)
      return res.json({ success: true, data })
    } catch (e: any) {
      const status = (e as any).statusCode ?? 500
      console.error('❌ owner-statement self:', e?.message)
      return res.status(status).json({ error: e?.message ?? 'failed_to_fetch_statement' })
    }
  }
)
