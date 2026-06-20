import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { isFabricEnabled, evaluateGetHoldings } from '../lib/fabric'
import { auth } from '../middleware/auth'
import { sendEmail, getAdminEmail, buildDepositRequestAdminEmail, maskIban } from '../lib/emailService'
import { getFeatureFlag } from '../lib/featureFlags'

export const walletRouter = Router()

// GET /api/wallet
walletRouter.get('/', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    const walletEnabled = await getFeatureFlag('walletEnabled', true)
    if (!walletEnabled) {
      return res.status(410).json({ error: 'WALLET_DISABLED', message: 'المحفظة غير متاحة حالياً.' })
    }

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
      take: 100,
    })

    const pendingDeposits = await prisma.depositRequest.findMany({
      where: { userId: req.user!.userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    })

    const pendingWithdrawals = await prisma.withdrawalRequest.findMany({
      where: { userId: req.user!.userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    })

    const rejectedWithdrawals = await prisma.withdrawalRequest.findMany({
      where: { userId: req.user!.userId, status: 'REJECTED' },
      orderBy: { reviewedAt: 'desc' },
      select: { id: true, amount: true, createdAt: true, reviewedAt: true, adminNote: true, status: true },
    })

    // Full withdrawal history — ALL statuses — IBAN masked server-side
    const withdrawalHistoryRaw = await prisma.withdrawalRequest.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, status: true, createdAt: true, reviewedAt: true, bankName: true, iban: true, adminNote: true },
    })
    const withdrawalHistory = withdrawalHistoryRaw.map((w: any) => ({
      ...w, iban: w.iban ? maskIban(w.iban) : null,
    }))

    // Full deposit history — ALL statuses
    const depositHistory = await prisma.depositRequest.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, status: true, createdAt: true, reviewedAt: true, bankName: true, bankReference: true, adminNote: true },
    })

    // Latest saved IBAN from any approved or pending withdrawal request
    const savedIbanReq = await prisma.withdrawalRequest.findFirst({
      where: {
        userId: req.user!.userId,
        iban: { not: null },
        status: { in: ['PENDING', 'APPROVED'] },
      },
      orderBy: { createdAt: 'desc' },
      select: { iban: true, bankName: true },
    })

    const savedWithdrawalAccount = savedIbanReq
      ? {
          hasIban:   true,
          ibanMasked: maskIban(savedIbanReq.iban!),
          ibanLast4:  savedIbanReq.iban!.replace(/\s+/g, '').slice(-4),
          bankName:   savedIbanReq.bankName || null,
        }
      : { hasIban: false, ibanMasked: null, ibanLast4: null, bankName: null }

    console.log(`💼 Wallet for user ${req.user!.userId}:`, {
      cashBalance,
      investedValue,
      holdingsCount: mapped.length,
      holdings: mapped
    })

    return res.json({ walletId: wallet.walletId, cashBalance, investedValue, totalValue, holdings: mapped, transactions, pendingDeposits, pendingWithdrawals, rejectedWithdrawals, savedWithdrawalAccount, withdrawalHistory, depositHistory })
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
    const depositEnabled = await getFeatureFlag('depositEnabled', true)
    if (!depositEnabled) {
      return res.status(410).json({ error: 'DEPOSIT_DISABLED', message: 'خدمة الإيداع متوقفة مؤقتاً.' })
    }
    const depositMaintenance = await getFeatureFlag('maintenanceMode', false)
    if (depositMaintenance && req.user?.role !== 'ADMIN') {
      return res.status(503).json({ error: 'MAINTENANCE_MODE', message: 'المنصة في وضع الصيانة حالياً. يرجى المحاولة لاحقاً.' })
    }

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

// GET /api/wallet/transactions — paginated unified transaction timeline for mobile
walletRouter.get('/transactions', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    const walletEnabled = await getFeatureFlag('walletEnabled', true)
    if (!walletEnabled) {
      return res.status(410).json({ error: 'WALLET_DISABLED', message: 'المحفظة غير متاحة حالياً.' })
    }

    const page  = Math.max(1, Number(req.query.page)  || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const userId = req.user!.userId

    const [transactions, deposits, withdrawals] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 300,
      }),
      prisma.depositRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.withdrawalRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, amount: true, status: true, createdAt: true, reviewedAt: true, bankName: true, adminNote: true },
      }),
    ])

    type TimelineItem = {
      id: string
      type: string
      status: string
      amount: number
      createdAt: Date
      reviewedAt: Date | null
      title: string
      description: string
      adminNote: string | null
      ref: string | null
    }

    const items: TimelineItem[] = []

    for (const tx of transactions) {
      const isDebit = tx.type === 'WITHDRAWAL' || tx.type === 'TOKEN_MINT' || tx.type === 'TOKEN_TRANSFER'
      items.push({
        id: tx.id,
        type: tx.type,
        status: 'COMPLETED',
        amount: isDebit ? -Math.abs(tx.amount) : Math.abs(tx.amount),
        createdAt: tx.createdAt,
        reviewedAt: null,
        title: tx.type === 'DEPOSIT' ? 'إيداع مؤكد'
          : tx.type === 'WITHDRAWAL' ? 'سحب مؤكد'
          : tx.type === 'TOKEN_MINT' ? 'استثمار عقاري'
          : tx.type === 'DISTRIBUTION' ? 'توزيع أرباح'
          : tx.type,
        description: tx.note || '',
        adminNote: null,
        ref: tx.ref || null,
      })
    }

    for (const d of deposits) {
      items.push({
        id: d.id,
        type: 'DEPOSIT_REQUEST',
        status: d.status,
        amount: d.amount,
        createdAt: d.createdAt,
        reviewedAt: d.reviewedAt || null,
        title: d.status === 'PENDING'  ? 'طلب إيداع قيد المراجعة'
          : d.status === 'APPROVED' ? 'إيداع معتمد'
          : 'طلب إيداع مرفوض',
        description: d.status === 'PENDING'  ? 'في انتظار مراجعة الإدارة'
          : d.status === 'APPROVED' ? 'تم اعتماد الإيداع وإضافته للمحفظة'
          : 'لم يتم الإيداع',
        adminNote: d.adminNote || null,
        ref: d.bankReference || null,
      })
    }

    for (const w of withdrawals) {
      items.push({
        id: w.id,
        type: 'WITHDRAWAL_REQUEST',
        status: w.status,
        amount: -Math.abs(w.amount),
        createdAt: w.createdAt,
        reviewedAt: w.reviewedAt || null,
        title: w.status === 'PENDING'  ? 'طلب سحب قيد المراجعة'
          : w.status === 'APPROVED' ? 'طلب سحب معتمد'
          : 'طلب سحب مرفوض',
        description: w.status === 'PENDING'  ? 'في انتظار مراجعة الإدارة'
          : w.status === 'APPROVED' ? 'تم اعتماد طلب السحب وخصمه من المحفظة'
          : 'لم يتم خصم أي مبلغ من محفظتك.',
        adminNote: w.adminNote || null,
        ref: null,
      })
    }

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    const total = items.length
    const start = (page - 1) * limit
    const paged = items.slice(start, start + limit)

    return res.json({
      success: true,
      data: paged,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    })
  } catch (e: any) {
    console.error('❌ Wallet transactions error:', e)
    return res.status(500).json({ error: 'failed_to_load_transactions' })
  }
})

// POST /api/wallet/withdraw — DISABLED: instant withdrawal not allowed; use /api/wallet/withdrawal-request
walletRouter.post('/withdraw', (_req: Request, res: Response) => {
  return res.status(410).json({
    error: 'instant_withdrawal_disabled',
    message: 'Instant withdrawals are not permitted. Please submit a withdrawal request for admin review.',
    messageAr: 'السحب الفوري غير مسموح به. يرجى إرسال طلب سحب للمراجعة.',
  })
})

export default walletRouter
