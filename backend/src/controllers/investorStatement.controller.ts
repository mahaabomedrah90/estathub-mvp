import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { requireRole } from '../middleware/roles'

export const investorStatementRouter = Router()

// ─── Shared builder ──────────────────────────────────────────────────────────

async function buildStatement(userId: string) {
  const [
    user,
    wallet,
    depositRequests,
    withdrawalRequests,
    orders,
    distributions,
    holdings,
    deeds,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        nationalId: true,
        phoneNumber: true,
        createdAt: true,
      },
    }),
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.depositRequest.findMany({
      where: { userId, status: 'APPROVED' },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.withdrawalRequest.findMany({
      where: { userId, status: 'APPROVED' },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.order.findMany({
      where: { userId, status: { in: ['PAID', 'ISSUED'] } },
      orderBy: { createdAt: 'asc' },
      include: {
        property: {
          select: { id: true, title: true, tokenPrice: true, totalTokens: true },
        },
      },
    }),
    prisma.distribution.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        payout: {
          include: {
            property: { select: { id: true, title: true } },
          },
        },
      },
    }),
    prisma.holding.findMany({
      where: { userId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            tokenPrice: true,
            totalTokens: true,
            totalValue: true,
          },
        },
      },
    }),
    prisma.digitalDeed.findMany({
      where: { userId },
      select: {
        propertyId: true,
        deedNumber: true,
        status: true,
        issuedAt: true,
      },
    }),
  ])

  if (!user) throw Object.assign(new Error('user_not_found'), { statusCode: 404 })

  // ── Deed map by propertyId ─────────────────────────────────────────────────
  const deedByProperty = new Map(deeds.map((d: any) => [d.propertyId, d]))

  // ── First investment date per property ────────────────────────────────────
  const firstInvestmentDate = new Map<string, Date>()
  for (const o of orders) {
    const existing = firstInvestmentDate.get(o.propertyId)
    if (!existing || o.createdAt < existing) {
      firstInvestmentDate.set(o.propertyId, o.createdAt)
    }
  }

  // ── Per-property invested amount (sum of order amounts) ───────────────────
  const investedByProperty = new Map<string, number>()
  for (const o of orders) {
    investedByProperty.set(o.propertyId, (investedByProperty.get(o.propertyId) ?? 0) + o.amount)
  }

  // ── Per-property profit distributions ─────────────────────────────────────
  const profitsByProperty = new Map<string, number>()
  for (const dist of distributions) {
    const propId = (dist as any).payout?.property?.id
    if (propId) {
      profitsByProperty.set(propId, (profitsByProperty.get(propId) ?? 0) + dist.amount)
    }
  }

  // ── Holdings table ─────────────────────────────────────────────────────────
  const holdingsData = holdings.map((h: any) => {
    const tokenPrice = h.property?.tokenPrice ?? 0
    const totalTokens = h.property?.totalTokens ?? 0
    // Book value = purchase cost (no market appreciation model yet)
    const bookValue = h.tokens * tokenPrice
    const ownershipPct = totalTokens > 0 ? (h.tokens / totalTokens) * 100 : 0
    const deed = deedByProperty.get(h.propertyId)
    const totalInvestedInProperty = +(investedByProperty.get(h.propertyId) ?? bookValue).toFixed(2)
    const totalProfitsFromProperty = +(profitsByProperty.get(h.propertyId) ?? 0).toFixed(2)
    return {
      propertyId: h.propertyId,
      propertyTitle: h.property?.title ?? '—',
      tokens: h.tokens,
      tokenPrice,
      purchaseCost: bookValue,
      // bookValue = purchaseCost; no market value until valuation model is added
      bookValue,
      ownershipPct,
      totalInvestedInProperty,
      totalProfitsFromProperty,
      firstInvestmentDate: firstInvestmentDate.get(h.propertyId) ?? null,
      deedStatus: deed?.status ?? null,
      deedNumber: deed?.deedNumber ?? null,
      deedIssuedAt: deed?.issuedAt ?? null,
    }
  })

  // ── Ledger: build unified event list ──────────────────────────────────────
  type LedgerEvent = {
    date: Date
    type: string
    description: string
    descriptionEn: string
    debit: number
    credit: number
    ref: string
    propertyId?: string | null
  }

  const events: LedgerEvent[] = []

  for (const d of depositRequests) {
    const approvedAt: Date = (d as any).reviewedAt ?? (d as any).updatedAt ?? (d as any).createdAt
    events.push({
      date: approvedAt,
      type: 'DEPOSIT',
      description: (d as any).bankName ? `إيداع — ${(d as any).bankName}` : 'إيداع',
      descriptionEn: (d as any).bankName ? `Deposit — ${(d as any).bankName}` : 'Deposit',
      debit: 0,
      credit: (d as any).amount,
      ref: d.id,
    })
  }

  for (const w of withdrawalRequests) {
    const approvedAt: Date = (w as any).reviewedAt ?? (w as any).updatedAt ?? (w as any).createdAt
    events.push({
      date: approvedAt,
      type: 'WITHDRAWAL',
      description: (w as any).bankName ? `سحب — ${(w as any).bankName}` : 'سحب',
      descriptionEn: (w as any).bankName ? `Withdrawal — ${(w as any).bankName}` : 'Withdrawal',
      debit: (w as any).amount,
      credit: 0,
      ref: w.id,
    })
  }

  for (const o of orders) {
    const prop = (o as any).property
    events.push({
      date: o.createdAt,
      type: 'INVESTMENT_PURCHASE',
      description: prop?.title ? `شراء حصص — ${prop.title} (${o.tokens} حصة)` : 'شراء حصص',
      descriptionEn: prop?.title ? `Purchase — ${prop.title} (${o.tokens} tokens)` : 'Token Purchase',
      debit: o.amount,
      credit: 0,
      ref: o.id,
      propertyId: o.propertyId,
    })
  }

  for (const dist of distributions) {
    const prop = (dist as any).payout?.property
    events.push({
      date: dist.createdAt,
      type: 'PROFIT_DISTRIBUTION',
      description: prop?.title ? `توزيع أرباح — ${prop.title}` : 'توزيع أرباح',
      descriptionEn: prop?.title ? `Profit Distribution — ${prop.title}` : 'Profit Distribution',
      debit: 0,
      credit: dist.amount,
      ref: dist.id,
      propertyId: prop?.id ?? null,
    })
  }

  // Sort chronologically
  events.sort((a, b) => a.date.getTime() - b.date.getTime())

  // Build ledger with running balance
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
      propertyId: e.propertyId ?? null,
    }
  })

  // ── Distributions history (standalone for Section 3) ──────────────────────
  const distributionsHistory = distributions.map((dist: any) => ({
    id: dist.id,
    date: dist.createdAt,
    amount: dist.amount,
    propertyId: dist.payout?.property?.id ?? null,
    propertyTitle: dist.payout?.property?.title ?? '—',
    period: dist.payout?.month ?? null,
    payoutId: dist.payoutId,
  }))

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalDeposits = depositRequests.reduce((s: number, d: any) => s + d.amount, 0)
  const totalWithdrawals = withdrawalRequests.reduce((s: number, w: any) => s + w.amount, 0)
  const totalInvestments = orders.reduce((s: number, o: any) => s + o.amount, 0)
  const totalProfitDistributions = distributions.reduce((s: number, d: any) => s + d.amount, 0)
  const cashBalance = wallet?.cashBalance ?? 0
  const currentInvestmentValue = holdingsData.reduce((s, h) => s + h.bookValue, 0)
  const totalPortfolioValue = cashBalance + currentInvestmentValue
  const ownedPropertiesCount = holdingsData.length
  const ownedTokensCount = holdingsData.reduce((s, h) => s + h.tokens, 0)
  const roi = totalInvestments > 0
    ? +((totalProfitDistributions / totalInvestments) * 100).toFixed(2)
    : 0

  // ── Reconciliation ────────────────────────────────────────────────────────
  const expectedBalance = +(
    totalDeposits - totalWithdrawals - totalInvestments + totalProfitDistributions
  ).toFixed(2)
  const discrepancy = +(cashBalance - expectedBalance).toFixed(2)

  return {
    generatedAt: new Date(),
    investor: {
      id: user.id,
      fullName: user.fullName ?? '—',
      email: user.email,
      nationalId: user.nationalId ?? null,
      phoneNumber: user.phoneNumber ?? null,
      memberSince: user.createdAt,
    },
    summary: {
      totalDeposits,
      totalWithdrawals,
      cashBalance,
      totalInvested: totalInvestments,
      totalProfitDistributions,
      currentInvestmentValue,
      totalPortfolioValue,
      netPlatformWealth: totalPortfolioValue,
      ownedPropertiesCount,
      ownedTokensCount,
      roi,
    },
    holdings: holdingsData,
    distributionsHistory,
    ledger,
    reconciliation: {
      totalDeposits,
      totalWithdrawals,
      totalInvestments,
      totalProfitDistributions,
      expectedBalance,
      actualBalance: cashBalance,
      discrepancy,
      isBalanced: Math.abs(discrepancy) < 0.01,
    },
  }
}

// ─── Admin: full portfolio report (all investors + holdings) ─────────────────
// GET /api/admin/investor-statement/full-report   ← must be BEFORE /:userId
investorStatementRouter.get(
  '/admin/investor-statement/full-report',
  auth(true),
  requireRole(['ADMIN']),
  async (_req: Request & { user?: any }, res: Response) => {
    try {
      const [investors, allOrders, allHoldings, allDistributions, allWallets] = await Promise.all([
        prisma.user.findMany({
          where:   { role: 'INVESTOR' },
          select:  { id: true, fullName: true, email: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.order.findMany({
          where:  { status: { in: ['PAID', 'ISSUED'] } },
          select: { userId: true, propertyId: true, amount: true },
        }),
        prisma.holding.findMany({
          select: {
            userId: true, propertyId: true, tokens: true,
            property: { select: { id: true, title: true, tokenPrice: true } },
          },
        }),
        prisma.distribution.findMany({
          select: {
            userId: true, amount: true,
            payout: { select: { propertyId: true } },
          },
        }),
        prisma.wallet.findMany({ select: { userId: true, cashBalance: true } }),
      ])

      // build lookup maps
      const investedByUserProp = new Map<string, Map<string, number>>()
      for (const o of allOrders as any[]) {
        if (!investedByUserProp.has(o.userId)) investedByUserProp.set(o.userId, new Map())
        const m = investedByUserProp.get(o.userId)!
        m.set(o.propertyId, (m.get(o.propertyId) ?? 0) + o.amount)
      }

      const profitByUserProp = new Map<string, Map<string, number>>()
      for (const d of allDistributions as any[]) {
        const pid = (d as any).payout?.propertyId
        if (!pid) continue
        if (!profitByUserProp.has(d.userId)) profitByUserProp.set(d.userId, new Map())
        const m = profitByUserProp.get(d.userId)!
        m.set(pid, (m.get(pid) ?? 0) + d.amount)
      }

      const walletMap      = new Map((allWallets as any[]).map((w: any) => [w.userId, w.cashBalance ?? 0]))
      const holdingsByUser = new Map<string, any[]>()
      for (const h of allHoldings as any[]) {
        if (!holdingsByUser.has(h.userId)) holdingsByUser.set(h.userId, [])
        holdingsByUser.get(h.userId)!.push(h)
      }

      const data = (investors as any[])
        .map(inv => {
          const holdings = holdingsByUser.get(inv.id) ?? []
          if (holdings.length === 0) return null

          const propInv    = investedByUserProp.get(inv.id) ?? new Map()
          const propProfit = profitByUserProp.get(inv.id)   ?? new Map()

          const holdingRows = holdings.map((h: any) => {
            const invested       = propInv.get(h.propertyId) ?? h.tokens * (h.property?.tokenPrice ?? 0)
            const profitReceived = propProfit.get(h.propertyId) ?? 0
            return {
              propertyId:       h.propertyId,
              propertyTitle:    h.property?.title ?? '—',
              tokens:           h.tokens,
              investmentAmount: +invested.toFixed(2),
              profitReceived:   +profitReceived.toFixed(2),
            }
          })

          return {
            id:               inv.id,
            fullName:         inv.fullName ?? '—',
            email:            inv.email,
            status:           inv.status,
            cashBalance:      +(walletMap.get(inv.id) ?? 0).toFixed(2),
            totalInvested:    +holdingRows.reduce((s: number, h: any) => s + h.investmentAmount, 0).toFixed(2),
            totalDistributed: +holdingRows.reduce((s: number, h: any) => s + h.profitReceived, 0).toFixed(2),
            holdings:         holdingRows,
          }
        })
        .filter(Boolean)

      return res.json({ success: true, data })
    } catch (e: any) {
      console.error('❌ investor full-report:', e?.message)
      return res.status(500).json({ error: 'failed_to_fetch_full_report' })
    }
  }
)

// ─── Admin: list investors ────────────────────────────────────────────────────
// GET /api/admin/investor-statement
investorStatementRouter.get(
  '/admin/investor-statement',
  auth(true),
  requireRole(['ADMIN']),
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const investors = await prisma.user.findMany({
        where: { role: 'INVESTOR' },
        select: {
          id: true,
          fullName: true,
          email: true,
          nationalId: true,
          phoneNumber: true,
          createdAt: true,
          wallet: { select: { cashBalance: true } },
          _count: { select: { holdings: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      return res.json({ success: true, data: investors })
    } catch (e: any) {
      console.error('❌ investor-statement list:', e?.message)
      return res.status(500).json({ error: 'failed_to_fetch_investors' })
    }
  }
)

// ─── Admin: full statement for specific investor ──────────────────────────────
// GET /api/admin/investor-statement/:userId
investorStatementRouter.get(
  '/admin/investor-statement/:userId',
  auth(true),
  requireRole(['ADMIN']),
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const data = await buildStatement(req.params.userId)
      return res.json({ success: true, data })
    } catch (e: any) {
      const status = (e as any).statusCode ?? 500
      console.error('❌ investor-statement admin:', e?.message)
      return res.status(status).json({ error: e?.message ?? 'failed_to_fetch_statement' })
    }
  }
)

// ─── Investor self-service ────────────────────────────────────────────────────
// GET /api/investor-statement
investorStatementRouter.get(
  '/investor-statement',
  auth(true),
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const data = await buildStatement(req.user!.userId)
      return res.json({ success: true, data })
    } catch (e: any) {
      const status = (e as any).statusCode ?? 500
      console.error('❌ investor-statement self:', e?.message)
      return res.status(status).json({ error: e?.message ?? 'failed_to_fetch_statement' })
    }
  }
)
