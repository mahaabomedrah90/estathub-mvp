import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { requireRole } from '../middleware/roles'

export const distributionRouter = Router()

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

// POST /api/admin/distributions — execute a rental distribution
distributionRouter.post(
  '/admin/distributions',
  auth(true), requireRole(['ADMIN']),
  async (req, res) => {
    const { propertyId, month, totalAmount } = req.body

    if (!propertyId || !month || !totalAmount || totalAmount <= 0) {
      return res.status(400).json({ code: 'INVALID_INPUT', message: 'propertyId, month, and totalAmount are required' })
    }

    // 409 guard — no double distributions for same property+month
    const existing = await prisma.payout.findFirst({ where: { propertyId, month } })
    if (existing) {
      return res.status(409).json({ code: 'ALREADY_DISTRIBUTED', message: `Distribution for ${month} already executed` })
    }

    const [property, holdings] = await Promise.all([
      prisma.property.findUnique({ where: { id: propertyId }, select: { title: true, tenantId: true } }),
      prisma.holding.findMany({ where: { propertyId }, select: { userId: true, tokens: true } }),
    ])

    if (!property) return res.status(404).json({ code: 'NOT_FOUND', message: 'Property not found' })
    if (holdings.length === 0) return res.status(400).json({ code: 'NO_HOLDERS', message: 'No token holders for this property' })

    const totalTokens = holdings.reduce((s, h) => s + h.tokens, 0)
    const amount = Number(totalAmount)

    // Calculate per-investor share, rounding to 2 decimals
    const shares = holdings.map(h => ({
      userId: h.userId,
      tokens: h.tokens,
      amount: Math.floor((h.tokens / totalTokens) * amount * 100) / 100,
    }))

    // Rounding correction — give remainder to largest holder
    const distributed = shares.reduce((s, x) => s + x.amount, 0)
    const remainder = Math.round((amount - distributed) * 100) / 100
    if (remainder !== 0) {
      const largest = shares.reduce((a, b) => (b.tokens > a.tokens ? b : a))
      largest.amount = Math.round((largest.amount + remainder) * 100) / 100
    }

    // Execute in a transaction
    const payout = await prisma.$transaction(async (tx) => {
      const p = await tx.payout.create({
        data: { propertyId, month, totalAmount: amount },
      })

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
      }

      return p
    })

    res.status(201).json({ payout: { id: payout.id, propertyId, month, totalAmount: amount, investorCount: shares.length } })
  }
)
