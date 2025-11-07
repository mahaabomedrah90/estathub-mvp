import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { submitInitProperty } from '../lib/fabric'

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
        title: name,
        totalValue,
        tokenPrice,
        totalTokens,
        remainingTokens: remainingTokens ?? totalTokens,
        monthlyYield: 0, // TODO: accept from request if needed
      },
    })

    // Initialize property on blockchain if Fabric is enabled
    if (process.env.USE_FABRIC === 'true') {
      try {
        const { txId } = await submitInitProperty({ 
          propertyId: created.id, 
          totalTokens: created.totalTokens 
        })
        
        // Update property with blockchain transaction ID
        await prisma.property.update({
          where: { id: created.id },
          data: { blockchainTxId: txId }
        })
        
        // Record on-chain event
        await prisma.onChainEvent.create({
          data: {
            txId,
            type: 'TOKEN_MINT',
            propertyId: created.id,
            payload: { totalTokens: created.totalTokens }
          }
        })
      } catch (err) {
        console.error('Failed to init property on blockchain:', err)
        return res.status(500).json({ error: 'failed_to_init_property_on_chain', detail: String(err) })
      }
    }

    res.status(201).json({
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
