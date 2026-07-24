import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { requireRole } from '../middleware/roles'
import { getSetting } from './settings.controller'

export const distributionRouter = Router()

// ─────────────────────────────────────────────────────────────────────────────
// Shared accounting helpers — the SINGLE source of truth for distribution math.
// Both the preview (GET) and the execute (POST) endpoints call these so the
// numbers a preview shows are exactly the numbers that get committed.
// ─────────────────────────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100

// A property may only be distributed to while it is APPROVED. PropertyStatus is
// PENDING | APPROVED | REJECTED — APPROVED is the sole eligible state.
const DISTRIBUTABLE_PROPERTY_STATUSES = ['APPROVED']
const isDistributableStatus = (status?: string | null) =>
  !!status && DISTRIBUTABLE_PROPERTY_STATUSES.includes(status)

export interface FeeRates {
  managementFeeEnabled: boolean
  managementFeeRate: number
  reserveRate: number
}

// Resolve fee rates for a property: prefer a locked property feeSnapshot, else
// fall back to the current global settings. Mirrors the historic POST behavior.
async function resolveFeeRates(feeSnapshot: any): Promise<FeeRates> {
  const snap = feeSnapshot ?? {}
  const managementFeeEnabled: boolean = snap.managementFeeEnabled
    ?? ((await getSetting('managementFeeEnabled', 'false')) === 'true')
  const managementFeeRate: number = snap.managementFeeRate
    ?? (parseFloat(await getSetting('managementFeeRate', '8')) || 8)
  const reserveRate: number = snap.reserveRate
    ?? (parseFloat(await getSetting('reserveRate', '3')) || 3)
  return { managementFeeEnabled, managementFeeRate, reserveRate }
}

export interface DistributionBreakdown {
  grossAmount: number
  mgmtFeeAmount: number
  reserveAmount: number
  netDistributable: number
  totalTokens: number
  shares: Array<{ userId: string; tokens: number; amount: number }>
}

// Pure computation — given holders, a gross amount and fee rates, produce the
// fee/reserve deductions and each holder's share of the net distributable.
function computeDistribution(
  holdings: Array<{ userId: string; tokens: number }>,
  totalAmount: number,
  rates: FeeRates,
): DistributionBreakdown {
  const grossAmount = Number(totalAmount)

  // Deduct management fee (platform revenue) and reserve (not revenue) before
  // distributing the remainder to investors.
  const mgmtFeeAmount = rates.managementFeeEnabled
    ? parseFloat((grossAmount * rates.managementFeeRate / 100).toFixed(2))
    : 0
  const reserveAmount = parseFloat((grossAmount * rates.reserveRate / 100).toFixed(2))
  const netDistributable = parseFloat((grossAmount - mgmtFeeAmount - reserveAmount).toFixed(2))

  const totalTokens = holdings.reduce((s, h) => s + h.tokens, 0)

  // Per-investor share of the NET distributable amount.
  const shares = holdings.map(h => ({
    userId: h.userId,
    tokens: h.tokens,
    amount: Math.floor((h.tokens / totalTokens) * netDistributable * 100) / 100,
  }))

  // Rounding correction — give the remainder to the largest holder.
  const distributed = shares.reduce((s, x) => s + x.amount, 0)
  const remainder = round2(netDistributable - distributed)
  if (remainder !== 0 && shares.length > 0) {
    const largest = shares.reduce((a, b) => (b.tokens > a.tokens ? b : a))
    largest.amount = round2(largest.amount + remainder)
  }

  return { grossAmount, mgmtFeeAmount, reserveAmount, netDistributable, totalTokens, shares }
}

// GET /api/admin/distributions — list last 50 payouts
distributionRouter.get(
  '/admin/distributions',
  auth(true), requireRole(['ADMIN']),
  async (_req, res) => {
    try {
      const payouts = await prisma.payout.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          propertyId: true,
          month: true,
          totalAmount: true,
          createdAt: true,
          property: { select: { title: true } },
          distributions: {
            select: { id: true, userId: true, amount: true, user: { select: { fullName: true, email: true } } },
          },
        },
      })
      res.json({ payouts })
    } catch (err: any) {
      console.error('distributions list error:', err)
      res.status(500).json({ code: 'SERVER_ERROR', message: err.message })
    }
  }
)

// GET /api/admin/distributions/preview — dry-run a distribution.
// Read-only: computes the exact fee/reserve/net breakdown and per-investor
// allocation the POST would commit, plus an `alreadyDistributed` guard flag.
// Does NOT write anything.
distributionRouter.get(
  '/admin/distributions/preview',
  auth(true), requireRole(['ADMIN']),
  async (req, res) => {
    try {
      const propertyId = String(req.query.propertyId || '')
      const month = String(req.query.month || '')
      const totalAmount = Number(req.query.totalAmount)

      if (!propertyId || !month || !totalAmount || totalAmount <= 0) {
        return res.status(400).json({ code: 'INVALID_INPUT', message: 'propertyId, month, and a positive totalAmount are required' })
      }

      const [property, holdings, existing] = await Promise.all([
        prisma.property.findUnique({ where: { id: propertyId }, select: { title: true, status: true, feeSnapshot: true } }),
        prisma.holding.findMany({
          where: { propertyId },
          select: { userId: true, tokens: true, user: { select: { fullName: true, email: true } } },
        }),
        prisma.payout.findFirst({ where: { propertyId, month }, select: { id: true } }),
      ])

      if (!property) return res.status(404).json({ code: 'NOT_FOUND', message: 'Property not found' })

      // Eligibility: only APPROVED properties can be distributed to.
      if (!isDistributableStatus(property.status)) {
        return res.status(400).json({ code: 'PROPERTY_NOT_ELIGIBLE', message: `Property is not eligible for distribution (status: ${property.status})` })
      }

      // Zero-token guard — no holders, or holders with no tokens. Reject before
      // any calculation (a zero total would divide-by-zero downstream).
      const totalTokens = holdings.reduce((s, h) => s + h.tokens, 0)
      if (totalTokens <= 0) {
        return res.status(400).json({ code: 'NO_HOLDERS', message: 'No token holders for this property — nothing to distribute' })
      }

      const rates = await resolveFeeRates(property.feeSnapshot as any)
      const alreadyDistributed = !!existing

      const breakdown = computeDistribution(
        holdings.map(h => ({ userId: h.userId, tokens: h.tokens })),
        Number(totalAmount),
        rates,
      )

      // Join per-investor amounts back to holder identities for display.
      const userById = new Map(holdings.map(h => [h.userId, h.user]))
      const rows = breakdown.shares
        .map(s => ({
          userId: s.userId,
          fullName: userById.get(s.userId)?.fullName ?? null,
          email: userById.get(s.userId)?.email ?? null,
          tokens: s.tokens,
          sharePct: breakdown.totalTokens > 0 ? round2((s.tokens / breakdown.totalTokens) * 100) : 0,
          amount: s.amount,
        }))
        .sort((a, b) => b.tokens - a.tokens)

      res.json({
        preview: {
          propertyId,
          propertyTitle: property.title,
          month,
          alreadyDistributed,
          grossAmount: breakdown.grossAmount,
          mgmtFeeAmount: breakdown.mgmtFeeAmount,
          reserveAmount: breakdown.reserveAmount,
          netDistributable: breakdown.netDistributable,
          totalTokens: breakdown.totalTokens,
          investorCount: breakdown.shares.length,
          ...rates,
          rows,
        },
      })
    } catch (err: any) {
      console.error('distribution preview error:', err)
      res.status(500).json({ code: 'SERVER_ERROR', message: err.message })
    }
  }
)

// POST /api/admin/distributions — execute a rental distribution
distributionRouter.post(
  '/admin/distributions',
  auth(true), requireRole(['ADMIN']),
  async (req, res) => {
    const { propertyId, month, totalAmount } = req.body

    if (!propertyId || !month || !totalAmount || totalAmount <= 0) {
      return res.status(400).json({ code: 'INVALID_INPUT', message: 'propertyId, month, and totalAmount are required' })
    }

    // Friendly pre-check — fast 409 for the common (non-concurrent) case. The
    // authoritative concurrency-safe guard is the Payout(propertyId, month)
    // unique index, enforced inside the transaction below.
    const existing = await prisma.payout.findFirst({ where: { propertyId, month } })
    if (existing) {
      return res.status(409).json({ code: 'ALREADY_DISTRIBUTED', message: `Distribution for ${month} already executed` })
    }

    const [property, holdings] = await Promise.all([
      prisma.property.findUnique({ where: { id: propertyId }, select: { title: true, tenantId: true, status: true, feeSnapshot: true } }),
      prisma.holding.findMany({ where: { propertyId }, select: { userId: true, tokens: true } }),
    ])

    if (!property) return res.status(404).json({ code: 'NOT_FOUND', message: 'Property not found' })

    // Eligibility: only APPROVED properties can be distributed to.
    if (!isDistributableStatus(property.status)) {
      return res.status(400).json({ code: 'PROPERTY_NOT_ELIGIBLE', message: `Property is not eligible for distribution (status: ${property.status})` })
    }

    // Zero-token guard — reject before any calculation or write.
    const totalTokens = holdings.reduce((s, h) => s + h.tokens, 0)
    if (totalTokens <= 0) {
      return res.status(400).json({ code: 'NO_HOLDERS', message: 'No token holders for this property' })
    }

    // Resolve fee rates and compute the breakdown via the shared helpers — the
    // exact same math the preview endpoint runs.
    const rates = await resolveFeeRates(property.feeSnapshot as any)
    const { grossAmount, mgmtFeeAmount, reserveAmount, netDistributable, shares } =
      computeDistribution(holdings, Number(totalAmount), rates)

    // Execute everything in a single transaction
    let payout
    try {
      payout = await prisma.$transaction(async (tx: any) => {
      const p = await tx.payout.create({
        data: { propertyId, month, totalAmount: grossAmount },
      })

      // Record management fee as platform revenue event
      if (mgmtFeeAmount > 0) {
        await tx.platformRevenue.create({
          data: {
            type: 'MANAGEMENT_FEE',
            description: `Management fee — ${property.title} (${month})`,
            amount: mgmtFeeAmount,
            propertyId,
            date: new Date(),
          },
        })
      }

      for (const s of shares) {
        await tx.distribution.create({
          data: { payoutId: p.id, userId: s.userId, amount: s.amount },
        })

        // Credit investor wallet
        await tx.wallet.upsert({
          where: { userId: s.userId },
          update: { cashBalance: { increment: s.amount } },
          create: { userId: s.userId, tenantId: property.tenantId, cashBalance: s.amount },
        })

        // Audit trail — create a Transaction record per investor
        await tx.transaction.create({
          data: {
            userId:   s.userId,
            tenantId: property.tenantId,
            type:     'DEPOSIT',
            amount:   s.amount,
            ref:      `dist:${p.id}`,
          },
        })
      }

      return p
      })
    } catch (err: any) {
      // Concurrency-safe fallback: if a competing request won the race, the
      // Payout(propertyId, month) unique index rejects this insert (P2002).
      // Surface it as the same friendly 409 the pre-check returns.
      if (err?.code === 'P2002') {
        return res.status(409).json({ code: 'ALREADY_DISTRIBUTED', message: `Distribution for ${month} already executed` })
      }
      console.error('distribution execute error:', err)
      return res.status(500).json({ code: 'SERVER_ERROR', message: err?.message || 'Distribution failed' })
    }

    res.status(201).json({
      payout: {
        id: payout.id,
        propertyId,
        propertyTitle: property.title,
        month,
        grossAmount,
        mgmtFeeAmount,
        reserveAmount,
        netDistributable,
        investorCount: shares.length,
        createdAt: payout.createdAt,
      },
    })
  }
)
