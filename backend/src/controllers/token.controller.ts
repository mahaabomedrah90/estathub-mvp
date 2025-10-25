import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { auth } from '../middleware/auth'
import { requireRole } from '../middleware/roles'
import { Role } from '@prisma/client'

export const tokenRouter = Router()

tokenRouter.post('/api/tokens/mint', auth(true), requireRole([Role.ADMIN, Role.OWNER] as unknown as string[]), async (req: Request & { user?: any }, res: Response) => {
  try {
    const { propertyId, userEmail, userId, tokens } = req.body || {}
    const pid = Number(propertyId)
    const qty = Number(tokens)
    if (!Number.isFinite(pid) || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: 'invalid_input' })
    }

    let targetUser = null as null | { id: number; email: string }
    if (userId) {
      targetUser = await prisma.user.findUnique({ where: { id: Number(userId) } })
    } else if (userEmail) {
      targetUser = await prisma.user.findUnique({ where: { email: String(userEmail).toLowerCase().trim() } })
    }
    if (!targetUser) return res.status(404).json({ error: 'user_not_found' })

    const prop = await prisma.property.findUnique({ where: { id: pid } })
    if (!prop) return res.status(404).json({ error: 'property_not_found' })
    if (prop.remainingTokens < qty) return res.status(400).json({ error: 'insufficient_remaining_tokens' })

    const result = await prisma.$transaction(async tx => {
      await tx.property.update({ where: { id: pid }, data: { remainingTokens: { decrement: qty } } })
      const holding = await tx.holding.upsert({
        where: { userId_propertyId: { userId: targetUser!.id, propertyId: pid } },
        update: { tokens: { increment: qty } },
        create: { userId: targetUser!.id, propertyId: pid, tokens: qty },
      })
      return holding
    })

    return res.json({ ok: true, message: 'tokens_minted', data: { propertyId: pid, userId: targetUser.id, tokens: qty } })
  } catch (e) {
    return res.status(500).json({ error: 'mint_failed' })
  }
})

tokenRouter.get('/api/holdings', async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.holding.findMany({ include: { property: true, user: true }, orderBy: { id: 'asc' } })
    const data = rows.map(r => ({
      id: r.id,
      user: { id: r.userId, email: r.user.email },
      property: { id: r.propertyId, name: r.property.title, tokenPrice: r.property.tokenPrice },
      tokens: r.tokens,
      value: (r.tokens || 0) * (r.property.tokenPrice || 0),
      createdAt: r.createdAt,
    }))
    return res.json(data)
  } catch (e) {
    return res.status(500).json({ error: 'failed_to_list_holdings' })
  }
})

export default tokenRouter
