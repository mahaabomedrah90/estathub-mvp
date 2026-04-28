import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { isFabricEnabled, evaluateGetHoldings } from '../lib/fabric'
import { auth } from '../middleware/auth'
import { sendEmail, getAdminEmail, buildDepositRequestAdminEmail } from '../lib/emailService'

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
    mapped = dbHoldings.map((h: any) => ({
      propertyId: h.propertyId,
      title: h.property.title,
      tokens: h.tokens,
      tokenPrice: h.property.tokenPrice,
      value: (h.tokens || 0) * (h.property.tokenPrice || 0),
    }))
  
    const investedValue = mapped.reduce((s: number, x: any) => s + x.value, 0)
    const cashBalance = wallet.cashBalance || 0
    const totalValue = cashBalance + investedValue
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const pendingDeposits = await prisma.depositRequest.findMany({
      where: { userId: req.user!.userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`💼 Wallet for user ${req.user!.userId}:`, {
      cashBalance,
      investedValue,
      holdingsCount: mapped.length,
      holdings: mapped
    })

    return res.json({ walletId: wallet.walletId, cashBalance, investedValue, totalValue, holdings: mapped, transactions, pendingDeposits })
} catch (e: any) {
    console.error('Wallet load error:', e)
return res.status(500).json({
 error: 'failed_to_load_wallet',
 detail: e?.message || 'Unknown error occurred'
 })  }
})

// POST /api/wallet/deposit — DISABLED: direct deposit not allowed in production
walletRouter.post('/deposit', auth(true), async (_req: Request & { user?: any }, res: Response) => {
  return res.status(410).json({
    error: 'direct_deposit_disabled',
    message: 'Direct deposits are not permitted. Please use /api/wallet/deposit-request to submit a bank transfer request for admin review.',
    messageAr: 'الإيداع المباشر غير مسموح به. يرجى استخدام طلب الإيداع عبر التحويل البنكي.',
  })
})

// POST /api/wallet/deposit-request — submit a manual bank transfer deposit request
walletRouter.post('/deposit-request', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    const amount = Number(req.body?.amount)
    const bankReference: string | undefined = req.body?.bankReference || undefined
    const bankName: string | undefined = req.body?.bankName || undefined
    const receiptUrl: string | undefined = req.body?.receiptUrl || undefined

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'invalid_amount', message: 'Amount must be a positive number.' })
    }
    if (amount < 100) {
      return res.status(400).json({ error: 'amount_too_small', message: 'Minimum deposit amount is 100 SAR.' })
    }
    if (amount > 100000) {
      return res.status(400).json({ error: 'amount_too_large', message: 'Maximum deposit amount is 100,000 SAR.' })
    }

    const depositRequest = await prisma.depositRequest.create({
      data: {
        userId: req.user!.userId,
        amount,
        bankReference,
        bankName,
        receiptUrl,
        status: 'PENDING',
      },
    })

    // Fire-and-forget admin email — failure must NOT block the response
    ;(async () => {
      try {
        const adminEmail = await getAdminEmail(prisma as any)
        const user = await prisma.user.findUnique({
          where: { id: req.user!.userId },
          select: { fullName: true, email: true },
        })
        const content = buildDepositRequestAdminEmail({
          userName: user?.fullName || req.user!.email || 'Unknown',
          userEmail: user?.email || req.user!.email,
          amount,
          bankReference,
          requestId: depositRequest.id,
          createdAt: depositRequest.createdAt,
        })
        await sendEmail({ to: adminEmail, ...content })
      } catch (emailErr: any) {
        console.error('❌ Failed to send deposit request admin email:', emailErr.message)
      }
    })()

    return res.status(201).json({
      id: depositRequest.id,
      status: depositRequest.status,
      amount: depositRequest.amount,
      message: 'Your deposit request has been received and is pending review. Your balance will be updated after verification.',
      messageAr: 'تم استلام طلب الإيداع وهو قيد المراجعة. سيتم تحديث رصيدك بعد التحقق من التحويل.',
    })
  } catch (e: any) {
    console.error('Deposit request error:', e)
    return res.status(500).json({ error: 'deposit_request_failed', detail: e?.message || 'Failed to create deposit request' })
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
        type: 'DEPOSIT',
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
    const result = await prisma.$transaction(async (tx: any) => {
      const wallet = await tx.wallet.upsert({ where: { userId: req.user!.userId }, update: {}, create: { userId: req.user!.userId, tenantId: req.user!.tenantId } })
      if ((wallet.cashBalance || 0) < amount) throw new Error('insufficient')
      const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { cashBalance: { decrement: amount } } })
      await tx.transaction.create({ data: { userId: req.user!.userId, tenantId: req.user!.tenantId, type: 'WITHDRAWAL', amount } })
      return updated
    })
    return res.json({ cashBalance: result.cashBalance })
  } catch (e: any) {
    console.error('Withdraw error:', e)
    return res.status(500).json({ error: 'withdraw_failed' })
  }
})

export default walletRouter
