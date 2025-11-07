import { Router, Request, Response, NextFunction } from 'express'
import { $Enums } from '@prisma/client'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { isFabricEnabled, evaluateGetHoldings } from '../lib/fabric'
export const walletRouter = Router()

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

// GET /api/wallet
walletRouter.get('/api/wallet', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    let wallet = await prisma.wallet.findUnique({ where: { userId: req.user!.id } })
    if (!wallet) {
      wallet = await prisma.wallet.create({ data: { userId: req.user!.id } })
    }
    let mapped: Array<{ propertyId: number; title: string; tokens: number; tokenPrice: number; value: number }>
    if (isFabricEnabled()) {
      const onchain = await evaluateGetHoldings(req.user!.id)
      const propIds = onchain.map(h => h.propertyId)
      const props = await prisma.property.findMany({ where: { id: { in: propIds.length ? propIds : [0] } } })
      const byId = new Map(props.map(p => [p.id, p]))
      mapped = onchain.map(h => {
        const p = byId.get(h.propertyId)
        const title = p?.title || `Property ${h.propertyId}`
        const tokenPrice = Number(p?.tokenPrice || 0)
        const value = (h.tokens || 0) * tokenPrice
        return { propertyId: h.propertyId, title, tokens: h.tokens, tokenPrice, value }
      })
    } else {
      const holdings = await prisma.holding.findMany({ where: { userId: req.user!.id }, include: { property: true } })
      mapped = holdings.map(h => ({
        propertyId: h.propertyId,
        title: h.property.title,
        tokens: h.tokens,
        tokenPrice: h.property.tokenPrice,
        value: (h.tokens || 0) * (h.property.tokenPrice || 0),
      }))
    }
    const investedValue = mapped.reduce((s, x) => s + x.value, 0)
    const cashBalance = wallet.cashBalance || 0
    const totalValue = cashBalance + investedValue
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    return res.json({ walletId: wallet.walletId, cashBalance, investedValue, totalValue, holdings: mapped, transactions })
  } catch (e) {
    console.error('Wallet load error:', e)
    return res.status(500).json({ error: 'failed_to_load_wallet', detail: String(e) })
  }
})

// POST /api/wallet/deposit
walletRouter.post('/api/wallet/deposit', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    const amount = Number(req.body?.amount)
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'invalid_amount' })
    const result = await prisma.$transaction(async tx => {
      const wallet = await tx.wallet.upsert({ where: { userId: req.user!.id }, update: {}, create: { userId: req.user!.id } })
      const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { cashBalance: { increment: amount } } })
      await tx.transaction.create({ data: { userId: req.user!.id, type: $Enums.TransactionType.DEPOSIT, amount } })
      return updated
    })
    return res.json({ cashBalance: result.cashBalance })
  } catch (e) {
    return res.status(500).json({ error: 'deposit_failed' })
  }
})

// POST /api/wallet/withdraw
walletRouter.post('/api/wallet/withdraw', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    const amount = Number(req.body?.amount)
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'invalid_amount' })
    const result = await prisma.$transaction(async tx => {
      const wallet = await tx.wallet.upsert({ where: { userId: req.user!.id }, update: {}, create: { userId: req.user!.id } })
      if ((wallet.cashBalance || 0) < amount) throw new Error('insufficient')
      const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { cashBalance: { decrement: amount } } })
      await tx.transaction.create({ data: { userId: req.user!.id, type: $Enums.TransactionType.WITHDRAWAL, amount } })
      return updated
    })
    return res.json({ cashBalance: result.cashBalance })
  } catch (e: any) {
    if (String(e?.message || '').includes('insufficient')) return res.status(400).json({ error: 'insufficient_balance' })
    return res.status(500).json({ error: 'withdraw_failed' })
  }
})

export default walletRouter
