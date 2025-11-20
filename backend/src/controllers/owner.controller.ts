// backend/src/controllers/owner.controller.ts
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'

export const ownerRouter = Router()

// GET /api/owners/:ownerId/investors
ownerRouter.get('/:ownerId/investors', auth(true), async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params

    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId_required' })
    }

    // All properties belonging to this owner
    const properties = await prisma.property.findMany({
      where: { ownerId: String(ownerId) },
      select: { id: true, title: true, totalTokens: true }
    })

    if (properties.length === 0) {
      return res.json({ investors: [], totalInvestment: 0 })
    }

    const propertyIds = properties.map(p => p.id)

    // Holdings across those properties, include user + property
    const holdings = await prisma.holding.findMany({
      where: { propertyId: { in: propertyIds } },
      include: {
        user: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true, tokenPrice: true } }
      }
    })

    // Aggregate by investor
    const investorMap = new Map<string, any>()

    for (const h of holdings) {
      const key = h.userId
      const price = h.property.tokenPrice || 0
      const investment = h.tokens * price

      if (!investorMap.has(key)) {
        investorMap.set(key, {
          userId: h.userId,
          name: h.user.name || h.user.email,
          email: h.user.email,
          totalTokens: 0,
          totalInvestment: 0,
          positions: [] as any[]
        })
      }

      const inv = investorMap.get(key)
      inv.totalTokens += h.tokens
      inv.totalInvestment += investment
      inv.positions.push({
        propertyId: h.property.id,
        propertyTitle: h.property.title,
        tokens: h.tokens,
        investment
      })
    }

    const investors = Array.from(investorMap.values())
    const totalInvestment = investors.reduce((sum, i) => sum + i.totalInvestment, 0)

    res.json({
      ownerId,
      investors,
      totalInvestment,
      totalInvestors: investors.length
    })
  } catch (e) {
    console.error('Error fetching owner investors:', e)
    res.status(500).json({ error: 'failed_to_fetch_owner_investors' })
  }
})