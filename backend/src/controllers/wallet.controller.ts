import { Router, Request, Response } from 'express'
import { $Enums } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { isFabricEnabled, evaluateGetHoldings } from '../lib/fabric'
import { auth } from '../middleware/auth'

export const walletRouter = Router()

// GET /api/wallet
walletRouter.get('/', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
 
    
    let wallet = await prisma.wallet.findUnique({ where: { userId: req.user!.userId } })
    if (!wallet) {
      wallet = await prisma.wallet.create({ data: { userId: req.user!.userId, tenantId: req.user!.tenantId } })
 }

    // Now get holdings for THIS user
    const dbHoldings = await prisma.holding.findMany({ 
      where: { userId: req.user!.userId }, 
      include: { property: true } 
    })
   
    let mapped: Array<{ propertyId: string; title: string; tokens: number; tokenPrice: number; value: number }>
    
    // Use database holdings (blockchain is not properly synced)
    mapped = dbHoldings.map(h => ({
      propertyId: h.propertyId,
      title: h.property.title,
      tokens: h.tokens,
      tokenPrice: h.property.tokenPrice,
      value: (h.tokens || 0) * (h.property.tokenPrice || 0),
    }))
  
    const investedValue = mapped.reduce((s, x) => s + x.value, 0)
    const cashBalance = wallet.cashBalance || 0
    const totalValue = cashBalance + investedValue
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    
    console.log(`💼 Wallet for user ${req.user!.userId}:`, {
      cashBalance,
      investedValue,
      holdingsCount: mapped.length,
      holdings: mapped
    })
    
    return res.json({ walletId: wallet.walletId, cashBalance, investedValue, totalValue, holdings: mapped, transactions })
} catch (e: any) {
    console.error('Wallet load error:', e)
return res.status(500).json({
 error: 'failed_to_load_wallet',
 detail: e?.message || 'Unknown error occurred'
 })  }
})

// POST /api/wallet/deposit
walletRouter.post('/deposit', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    const amount = Number(req.body?.amount)
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'invalid_amount' })
    const result = await prisma.$transaction(async tx => {
      const wallet = await tx.wallet.upsert({ where: { userId: req.user!.userId }, update: {}, create: { userId: req.user!.userId, tenantId: req.user!.tenantId } })
      const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { cashBalance: { increment: amount } } })
      await tx.transaction.create({ data: { userId: req.user!.userId, tenantId: req.user!.tenantId, type: $Enums.TransactionType.DEPOSIT, amount } })
      return updated
    })
    return res.json({ cashBalance: result.cashBalance })
 } catch (e: any) {
 console.error('Deposit error:', e)
 return res.status(500).json({
 error: 'deposit_failed',
 detail: e?.message || 'Deposit transaction failed'
 })
  }
})

// POST /init-test-balance - Development only:
walletRouter.post('/init-test-balance', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'not_allowed_in_production' })
    }
    
    const testBalance = 1000000 // 1 million SAR for testing
    
    const wallet = await prisma.wallet.upsert({
      where: { userId: req.user!.userId },
      update: { cashBalance: testBalance },
      create: { userId: req.user!.userId, tenantId: req.user!.tenantId, cashBalance: testBalance }
    })
    
    // Record as deposit transaction
    await prisma.transaction.create({
      data: {
        userId: req.user!.userId,
        tenantId: req.user!.tenantId,
        type: $Enums.TransactionType.DEPOSIT,
        amount: testBalance,
        note: 'Test balance initialization'
      }
    })
    
    return res.json({ 
      success: true,
      cashBalance: wallet.cashBalance,
      message: 'Test balance initialized successfully'
    })
  } catch (e) {
    console.error('Test balance init error:', e)
    return res.status(500).json({ error: 'init_failed' })
  }
})

// POST /api/wallet/withdraw
walletRouter.post('/withdraw', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    const amount = Number(req.body?.amount)
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'invalid_amount' })
    const result = await prisma.$transaction(async tx => {
      const wallet = await tx.wallet.upsert({ where: { userId: req.user!.userId }, update: {}, create: { userId: req.user!.userId, tenantId: req.user!.tenantId } })
      if ((wallet.cashBalance || 0) < amount) throw new Error('insufficient')
      const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { cashBalance: { decrement: amount } } })
      await tx.transaction.create({ data: { userId: req.user!.userId, tenantId: req.user!.tenantId, type: $Enums.TransactionType.WITHDRAWAL, amount } })
      return updated
    })
    return res.json({ cashBalance: result.cashBalance })
  } catch (e: any) {
    console.error('Withdraw error:', e)
    return res.status(500).json({ error: 'withdraw_failed' })
  }
})

export default walletRouter
