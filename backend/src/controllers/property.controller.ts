import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'

export const propertyRouter = Router()

// GET /api/properties
propertyRouter.get('/api/properties', async (_req: Request, res: Response) => {
  try {
    const list = await prisma.property.findMany({ orderBy: { id: 'asc' } })
    const mapped = list.map(p => ({
      id: p.id,
      name: p.title, // map DB `title` -> API `name`
      totalValue: p.totalValue,
      tokenPrice: p.tokenPrice,
      totalTokens: p.totalTokens,
      remainingTokens: p.remainingTokens,
    }))
    res.json(mapped)
  } catch (e) {
    res.status(500).json({ error: 'failed_to_list_properties' })
  }
})

// POST /api/properties
// Body: { name: string, totalValue: number, tokenPrice: number, totalTokens: number, remainingTokens?: number }
propertyRouter.post('/api/properties', async (req: Request, res: Response) => {
  try {
    const { name, totalValue, tokenPrice, totalTokens, remainingTokens } = req.body || {}
    if (!name || totalTokens == null) return res.status(400).json({ error: 'name_and_totalTokens_required' })

    const created = await prisma.property.create({
      data: {
        title: String(name),
        totalValue: Number(totalValue ?? 0),
        tokenPrice: Number(tokenPrice ?? 0),
        totalTokens: Number(totalTokens),
        remainingTokens: Number(remainingTokens ?? totalTokens ?? 0),
      },
    })

    return res.status(201).json({
      id: created.id,
      name: created.title,
      totalValue: created.totalValue,
      tokenPrice: created.tokenPrice,
      totalTokens: created.totalTokens,
      remainingTokens: created.remainingTokens,
    })
  } catch (e) {
    res.status(500).json({ error: 'failed_to_create_property' })
  }
})

export default propertyRouter
