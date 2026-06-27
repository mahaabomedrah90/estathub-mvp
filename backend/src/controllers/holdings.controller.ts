import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'

export const holdingsRouter = Router()

// GET /api/holdings — the current investor's owned properties / portfolio holdings.
// Read-only. Auth required. Scoped to req.user.userId (own data only).
holdingsRouter.get('/', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    const userId = req.user!.userId

    const holdings = await prisma.holding.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            location: true,
            city: true,
            imageUrl: true,
            tokenPrice: true,
            totalTokens: true,
            remainingTokens: true,
            expectedROI: true,
            monthlyYield: true,
            totalValue: true,
            status: true,
            ownershipType: true,
          },
        },
      },
    })

    // Fetch all digital deeds for this user in one query and join by propertyId.
    const deeds = await prisma.digitalDeed.findMany({
      where: { userId },
      select: { propertyId: true, deedNumber: true, status: true, issuedAt: true },
    })
    const deedByPropertyId = new Map(deeds.map((d: any) => [d.propertyId, d]))

    const items = holdings.map((h: any) => {
      const tokenPrice = h.property?.tokenPrice ?? 0
      const totalTokens = h.property?.totalTokens ?? 0
      const monthlyYield = h.property?.monthlyYield ?? 0
      const value = h.tokens * tokenPrice
      const ownershipPct = totalTokens > 0 ? (h.tokens / totalTokens) * 100 : 0
      const monthlyIncome = value * (monthlyYield / 100)
      const deed = deedByPropertyId.get(h.propertyId)
      return {
        id: h.id,
        propertyId: h.propertyId,
        tokens: h.tokens,
        tokenPrice,
        value,
        ownershipPct,
        monthlyIncome,
        deedNumber: deed?.deedNumber ?? null,
        deedStatus: deed?.status ?? null,
        deedIssuedAt: deed?.issuedAt ?? null,
        createdAt: h.createdAt,
        property: h.property
          ? {
              id: h.property.id,
              title: h.property.title,
              location: h.property.location,
              city: h.property.city,
              imageUrl: h.property.imageUrl || null,
              tokenPrice: h.property.tokenPrice,
              expectedROI: h.property.expectedROI,
              monthlyYield: h.property.monthlyYield,
              status: h.property.status,
              ownershipType: h.property.ownershipType,
            }
          : null,
      }
    })

    const totalInvested = items.reduce((s: number, i: any) => s + i.value, 0)
    const totalMonthlyIncome =
      items.reduce((s: number, i: any) => s + i.monthlyIncome, 0)

    return res.json({
      success: true,
      data: {
        holdingsCount: items.length,
        totalInvested,
        // No per-holding appreciation model yet — current value tracks invested.
        totalValue: totalInvested,
        totalMonthlyIncome,
        holdings: items,
      },
    })
  } catch (e: any) {
    console.error('❌ GET /holdings error:', e?.message)
    return res.status(500).json({ error: 'failed_to_fetch_holdings' })
  }
})
