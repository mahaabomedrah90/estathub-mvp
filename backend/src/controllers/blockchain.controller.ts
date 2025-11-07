import { Router, Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'

export const blockchainRouter = Router()

function auth(required = true) {
  return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    const h = String(req.headers.authorization || '')
    const token = h.startsWith('Bearer ') ? h.slice(7) : ''
    if (!token) return required ? res.status(401).json({ error: 'unauthorized' }) : next()
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret')
      req.user = payload
      return next()
    } catch {
      return required ? res.status(401).json({ error: 'unauthorized' }) : next()
    }
  }
}

// GET /api/blockchain/events - Get all on-chain events
blockchainRouter.get('/api/blockchain/events', auth(true), async (_req: Request, res: Response) => {
  try {
    const events = await prisma.onChainEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to last 100 events
    })
    return res.json({ events })
  } catch (e) {
    console.error('Failed to fetch on-chain events:', e)
    return res.status(500).json({ error: 'failed_to_fetch_events' })
  }
})

// GET /api/blockchain/properties - Get properties with blockchain txIds
blockchainRouter.get('/api/blockchain/properties', auth(true), async (_req: Request, res: Response) => {
  try {
    const properties = await prisma.property.findMany({
      select: {
        id: true,
        title: true,
        totalTokens: true,
        remainingTokens: true,
        blockchainTxId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.json({ properties })
  } catch (e) {
    console.error('Failed to fetch properties:', e)
    return res.status(500).json({ error: 'failed_to_fetch_properties' })
  }
})

// GET /api/blockchain/certificates - Get certificates with blockchain txIds
blockchainRouter.get('/api/blockchain/certificates', auth(true), async (_req: Request, res: Response) => {
  try {
    const certificates = await prisma.certificate.findMany({
      include: {
        user: { select: { email: true } },
        property: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const mapped = certificates.map(cert => ({
      id: cert.id,
      code: cert.code,
      userId: cert.userId,
      userEmail: cert.user.email,
      propertyId: cert.propertyId,
      propertyTitle: cert.property.title,
      orderId: cert.orderId,
      blockchainTxId: cert.blockchainTxId,
      createdAt: cert.createdAt,
    }))

    return res.json({ certificates: mapped })
  } catch (e) {
    console.error('Failed to fetch certificates:', e)
    return res.status(500).json({ error: 'failed_to_fetch_certificates' })
  }
})

// GET /api/blockchain/transactions - Get transactions with blockchain txIds
blockchainRouter.get('/api/blockchain/transactions', auth(true), async (_req: Request, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const mapped = transactions.map(txn => ({
      id: txn.id,
      userId: txn.userId,
      userEmail: txn.user.email,
      type: txn.type,
      amount: txn.amount,
      ref: txn.ref,
      note: txn.note,
      blockchainTxId: txn.blockchainTxId,
      createdAt: txn.createdAt,
    }))

    return res.json({ transactions: mapped })
  } catch (e) {
    console.error('Failed to fetch transactions:', e)
    return res.status(500).json({ error: 'failed_to_fetch_transactions' })
  }
})

// GET /api/blockchain/stats - Get blockchain statistics
blockchainRouter.get('/api/blockchain/stats', auth(true), async (_req: Request, res: Response) => {
  try {
    const [
      totalEvents,
      propertiesOnChain,
      certificatesOnChain,
      tokenMints,
    ] = await Promise.all([
      prisma.onChainEvent.count(),
      prisma.property.count({ where: { blockchainTxId: { not: null } } }),
      prisma.certificate.count({ where: { blockchainTxId: { not: null } } }),
      prisma.transaction.count({ 
        where: { 
          blockchainTxId: { not: null },
          type: 'TOKEN_MINT'
        } 
      }),
    ])

    return res.json({
      totalEvents,
      propertiesOnChain,
      certificatesOnChain,
      tokenMints,
    })
  } catch (e) {
    console.error('Failed to fetch blockchain stats:', e)
    return res.status(500).json({ error: 'failed_to_fetch_stats' })
  }
})
