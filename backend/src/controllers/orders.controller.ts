import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { requireRole } from '../middleware/roles'
import { isFabricEnabled, submitTxn } from '../lib/fabric'
import { getSetting } from './settings.controller'
import { getFeatureFlag } from '../lib/featureFlags'
import { issueDeedAfterPayment } from '../lib/deedService'
import { logAdminAction, AuditAction } from '../lib/auditService'
import crypto from 'node:crypto'

export const ordersRouter = Router()

// Feature-flag purchase gate.
// purchaseEnabled: missing key or explicit "false" → BLOCKED (fail-safe for investments).
// Only explicit "true" in the Settings table allows through.
function purchaseGate(_req: Request, res: Response, next: NextFunction): void {
  getFeatureFlag('purchaseEnabled', false)
    .then(enabled => {
      if (!enabled) {
        res.status(410).json({
          error: 'PURCHASE_DISABLED',
          message: 'خدمة الاستثمار متوقفة مؤقتاً. يرجى المحاولة لاحقاً.',
        })
        return
      }
      next()
    })
    .catch(() => {
      // On unexpected error, fail-safe: block investment
      res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'خدمة الاستثمار غير متاحة حالياً.' })
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders — Step 1 of 2: create a PENDING investment order
// Web flow: this endpoint reserves the intent; no money moves here.
// Flutter flow: same endpoint, same body, same response.
// ─────────────────────────────────────────────────────────────────────────────
ordersRouter.post('/', purchaseGate, auth(true), async (req: Request & { user?: any }, res: Response) => {
  let userId = '', pid = '', qty = 0

  try {
    // Only INVESTOR role may create orders
    const userRole = req.user?.role
    if (userRole !== 'INVESTOR') {
      return res.status(403).json({
        error: 'role_not_authorized',
        message:
          userRole === 'ADMIN'
            ? 'Administrators cannot invest in properties. Only investors can purchase tokens.'
            : userRole === 'OWNER'
            ? 'Property owners cannot invest in properties. Only investors can purchase tokens.'
            : 'Only investors can purchase property tokens. Please log in with an investor account.',
        requiredRole: 'INVESTOR',
        currentRole: userRole,
      })
    }

    // Maintenance mode blocks financial write actions for non-admin roles
    const maintenance = await getFeatureFlag('maintenanceMode', false)
    if (maintenance) {
      return res.status(503).json({
        error: 'MAINTENANCE_MODE',
        message: 'المنصة في وضع الصيانة حالياً. يرجى المحاولة لاحقاً.',
      })
    }

    userId = req.user!.userId

    // Reject suspended accounts before any DB work
    const investingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, kycVerified: true } as any,
    })
    if ((investingUser as any)?.status === 'SUSPENDED') {
      return res.status(403).json({
        error: 'account_suspended',
        message: 'الحساب غير مفعل، يرجى التواصل مع إدارة المنصة.',
      })
    }

    if (!(investingUser as any)?.kycVerified) {
      return res.status(403).json({
        code: 'KYC_REQUIRED',
        message: 'Complete identity verification before investing.',
      })
    }

    const { propertyId, tokens } = req.body || {}
    pid = propertyId ? String(propertyId) : ''
    qty = Number(tokens)

    // tokens must be a finite positive integer; propertyId must be a non-empty string
    if (!pid || !Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      return res.status(400).json({ error: 'invalid_input' })
    }

    const prop = await prisma.property.findUnique({ where: { id: pid } })
    if (!prop) return res.status(404).json({ error: 'property_not_found' })
    if (prop.status !== 'APPROVED') {
      return res.status(400).json({
        error: 'property_not_available',
        message: 'This property is not available for investment.',
      })
    }

    // Prevent duplicate PENDING orders for the same user + property
    const existingPendingOrder = await prisma.order.findFirst({
      where: { userId, propertyId: pid, status: 'PENDING' },
    })
    if (existingPendingOrder) {
      return res.status(409).json({
        error: 'pending_order_exists',
        message: 'You already have a pending order for this property.',
        existingOrderId: existingPendingOrder.id,
      })
    }

    if (prop.remainingTokens < qty) {
      return res.status(400).json({ error: 'insufficient_tokens' })
    }

    const investmentAmount = (prop.tokenPrice || 0) * qty

    const minInvestmentStr = await getSetting('minInvestmentAmount', '100')
    const MIN_INVESTMENT = parseInt(minInvestmentStr, 10)
    if (investmentAmount < MIN_INVESTMENT) {
      return res.status(400).json({
        error: 'minimum_investment_not_met',
        message: `Minimum investment is ${MIN_INVESTMENT} SAR. Your investment amount is ${investmentAmount.toFixed(2)} SAR.`,
        minInvestment: MIN_INVESTMENT,
        currentAmount: investmentAmount,
      })
    }

    const maxInvestmentStr = await getSetting('maxInvestmentAmount', '1000000')
    const MAX_INVESTMENT = parseInt(maxInvestmentStr, 10)
    if (investmentAmount > MAX_INVESTMENT) {
      return res.status(400).json({
        error: 'maximum_investment_exceeded',
        message: `Maximum investment is ${MAX_INVESTMENT.toLocaleString()} SAR. Your investment amount is ${investmentAmount.toFixed(2)} SAR.`,
        maxInvestment: MAX_INVESTMENT,
        currentAmount: investmentAmount,
      })
    }

    const platformFeeStr = await getSetting('platformFee', '5')
    const platformFeePercent = parseFloat(platformFeeStr)
    const platformFeeAmount = parseFloat((investmentAmount * platformFeePercent / 100).toFixed(2))
    const totalPayable = parseFloat((investmentAmount + platformFeeAmount).toFixed(2))

    const order = await prisma.order.create({
      data: {
        userId, propertyId: pid, tokens: qty, amount: investmentAmount, status: 'PENDING',
        feeRateSnapshot:   platformFeePercent,
        feeAmountSnapshot: platformFeeAmount,
        totalPayable,
      },
    })

    console.log(`💳 Order created: investor=${userId} property=${pid} tokens=${qty} investmentAmount=${investmentAmount} fee=${platformFeePercent}%=${platformFeeAmount} totalPayable=${totalPayable}`)

    // Audit: ORDER_CREATED — fire-and-forget
    logAdminAction({
      admin:      null,
      action:     AuditAction.ORDER_CREATED,
      targetType: 'Order',
      targetId:   order.id,
      investor:   { id: userId },
      amount:     investmentAmount,
      metadata:   { propertyId: pid, tokens: qty, totalPayable },
      req,
    }).catch(() => {})

    // Root-level response shape — web reads order.id directly for the confirm call
    return res.status(201).json({
      id: order.id,
      amount: order.amount,
      investmentAmount: order.amount,
      platformFeePercent,
      platformFeeAmount,
      totalPayable,
      status: order.status,
    })
  } catch (e) {
    console.error('❌ Order creation failed:', {
      error: e,
      message: (e as Error)?.message,
      stack: (e as Error)?.stack,
      userId,
      propertyId: pid,
      tokens: qty,
    })
    return res.status(500).json({ error: 'order_create_failed', details: (e as Error)?.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders/confirm — Step 2 of 2: financial settlement
// This is the real money-moving step: wallet deduction, holding, certificate,
// deed auto-issuance, and optional blockchain sync all happen here.
// ─────────────────────────────────────────────────────────────────────────────
ordersRouter.post('/confirm', purchaseGate, auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    const oid = req.body?.orderId
    if (!oid) return res.status(400).json({ error: 'invalid_orderId' })

    const order = await prisma.order.findUnique({ where: { id: oid }, include: { property: true } })
    if (!order) return res.status(404).json({ error: 'order_not_found' })
    if (order.userId !== req.user!.userId) {
      return res.status(403).json({ error: 'forbidden', message: 'You can only confirm your own orders.' })
    }
    // Fast-path idempotency for already-issued orders (checked again inside tx below)
    if (order.status === 'ISSUED') return res.json({ ok: true })

    // Maintenance mode blocks confirm for non-admin roles
    const confirmMaintenance = await getFeatureFlag('maintenanceMode', false)
    if (confirmMaintenance && req.user?.role !== 'ADMIN') {
      return res.status(503).json({
        error: 'MAINTENANCE_MODE',
        message: 'المنصة في وضع الصيانة حالياً. يرجى المحاولة لاحقاً.',
      })
    }

    // Block SUSPENDED users from confirming payment
    const confirmingUser = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { status: true } as any })
    if ((confirmingUser as any)?.status === 'SUSPENDED') {
      return res.status(403).json({
        error: 'account_suspended',
        message: 'الحساب غير مفعل، يرجى التواصل مع إدارة المنصة.'
      })
    }

    // Complete database transaction first (without blockchain)
    let confirmedTotalPayable = 0
    let confirmedWalletBefore = 0
    let confirmedWalletAfter = 0

    await prisma.$transaction(async (tx: any) => {

      // ── Atomic idempotency claim ────────────────────────────────────────────
      // Atomically transition PENDING → PAID as the first write.
      // If two concurrent confirm requests arrive, only one can update a row
      // with status = 'PENDING'. The second finds no matching row and throws,
      // preventing double-debit without relying on the Certificate unique constraint.
      const claimed = await tx.order.updateMany({
        where: { id: oid, status: 'PENDING' },
        data:  { status: 'PAID' },
      })
      if (claimed.count === 0) {
        // Either already PAID/ISSUED (idempotent) or CANCELLED — fetch current status
        const current = await tx.order.findUnique({ where: { id: oid }, select: { status: true } })
        if (current?.status === 'ISSUED') {
          // Already fully confirmed — safe to return ok outside the tx via a sentinel
          throw Object.assign(new Error('already_issued'), { alreadyIssued: true })
        }
        throw new Error('order_not_confirmable')
      }

      // Use the fee snapshot stored at order creation time to guarantee
      // the rate charged equals the rate the investor was quoted.
      const investmentAmount = (order.property?.tokenPrice || 0) * (order.tokens || 0)
      const platformFeePercent = (order as any).feeRateSnapshot
        ?? parseFloat(await getSetting('platformFee', '5'))
      const platformFeeAmount = (order as any).feeAmountSnapshot
        ?? parseFloat((investmentAmount * platformFeePercent / 100).toFixed(2))
      const totalPayable = (order as any).totalPayable
        ?? parseFloat((investmentAmount + platformFeeAmount).toFixed(2))
      confirmedTotalPayable = totalPayable

      // Get user's tenantId for wallet creation
      const user = await tx.user.findUnique({ where: { id: order.userId } })
      if (!user) throw new Error('user_not_found')

      // Ensure wallet exists and has sufficient balance (checked against totalPayable)
      const wallet = await tx.wallet.upsert({
        where: { userId: order.userId },
        update: {},
        create: { userId: order.userId, tenantId: user.tenantId },
      })
      if ((wallet.cashBalance || 0) < totalPayable) {
        const insufficientErr = new Error('insufficient_balance') as any
        insufficientErr.requiredAmount = parseFloat((totalPayable - (wallet.cashBalance || 0)).toFixed(2))
        throw insufficientErr
      }
      confirmedWalletBefore = wallet.cashBalance || 0

      // Debit totalPayable (investmentAmount + fee) from wallet
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data:  { cashBalance: { decrement: totalPayable } },
      })
      confirmedWalletAfter = updatedWallet.cashBalance || 0

      await tx.transaction.create({
        data: {
          userId:   order.userId,
          tenantId: user.tenantId,
          type:     'WITHDRAWAL',
          amount:   totalPayable,
          ref:      String(oid),
        },
      })

      // Record investment fee as an immutable platform revenue event
      if (platformFeeAmount > 0) {
        await (tx as any).platformRevenue.create({
          data: {
            type:        'INVESTMENT_FEE',
            description: `Investment fee — order ${oid}`,
            amount:      platformFeeAmount,
            propertyId:  order.propertyId,
            userId:      order.userId,
            date:        new Date(),
          },
        })
      }

      // Re-read remainingTokens inside the transaction before decrementing.
      // Prevents overselling when two orders for the same property confirm concurrently.
      const freshProp = await tx.property.findUnique({
        where:  { id: order.propertyId },
        select: { remainingTokens: true },
      })
      if (!freshProp || freshProp.remainingTokens < order.tokens) {
        throw new Error('tokens_sold_out')
      }

      // Issue tokens off-chain: decrement property supply and credit holding
      await tx.property.update({ where: { id: order.propertyId }, data: { remainingTokens: { decrement: order.tokens } } })
      await tx.holding.upsert({
        where:  { userId_propertyId: { userId: order.userId, propertyId: order.propertyId } },
        update: { tokens: { increment: order.tokens } },
        create: { userId: order.userId, propertyId: order.propertyId, tokens: order.tokens },
      })

      // Certificate and finalize — set status ISSUED
      const code = crypto.randomUUID()
      await tx.certificate.create({ data: { code, userId: order.userId, propertyId: order.propertyId, orderId: order.id } })
      await tx.order.update({ where: { id: oid }, data: { status: 'ISSUED' } })
    })

    // Audit: ORDER_CONFIRMED + WALLET_DEBITED — fire-and-forget
    ;(async () => {
      try {
        await logAdminAction({
          admin:        null,
          action:       AuditAction.ORDER_CONFIRMED,
          targetType:   'Order',
          targetId:     oid,
          investor:     { id: order.userId },
          amount:       confirmedTotalPayable,
          walletBefore: confirmedWalletBefore,
          walletAfter:  confirmedWalletAfter,
          metadata:     { propertyId: order.propertyId, tokens: order.tokens },
          req,
        })
      } catch {}
    })()

    // Auto-issue digital deed after payment — fire-and-forget
    issueDeedAfterPayment({
      userId: order.userId,
      propertyId: order.propertyId,
      orderId: oid,
    }).catch(err => console.error('⚠️  [deed] Auto-issuance failed for order', oid, err?.message))

    // After database transaction succeeds, record on blockchain
    // blockchainEnabled flag must be true AND Fabric must be configured
    const blockchainOn = await getFeatureFlag('blockchainEnabled', false)
    if (blockchainOn && isFabricEnabled()) {
      try {
        // Get user email for blockchain record
        const user = await prisma.user.findUnique({ where: { id: order.userId } })
        const userEmail = user?.email || `user-${order.userId}`

        console.log(`🔗 Recording payment on blockchain for order ${oid}...`)

        // Step 1: Mint tokens on blockchain (updates holding balance)
        const { txId: mintTxId } = await submitTxn(
          'estathub',
          'MintTokens',
          order.propertyId.toString(),
          order.userId.toString(),
          order.tokens.toString(),
          oid.toString()
        )

        console.log(`✅ Tokens minted on blockchain for order ${oid}: ${mintTxId}`)

        // Step 2: Record investment transaction on blockchain
        let investTxId: string | undefined
        try {
          const investResult = await submitTxn(
            'estathub',
            'InvestProperty',
            order.propertyId.toString(),
            userEmail,
            order.tokens.toString()
          )
          investTxId = investResult.txId
          console.log(`✅ Investment recorded on blockchain - User ${userEmail} invested ${order.tokens} tokens in Property ${order.propertyId}, TxID: ${investTxId}`)
        } catch (investErr: any) {
          console.warn(`⚠️  Failed to record investment on blockchain (tokens already minted):`, investErr?.message || investErr)
          // Continue - token minting is the critical operation
        }

        // Step 3: Record blockchain transaction in database
        await prisma.transaction.create({
          data: {
            userId: order.userId,
            tenantId: req.user?.tenantId || 'default-tenant',
            type: 'TOKEN_MINT',
            amount: order.tokens,
            ref: String(oid),
            blockchainTxId: mintTxId,
            note: `Payment confirmed - ${order.tokens} tokens minted for property ${order.propertyId}`,
          },
        })

        // Step 4: Update certificate with blockchain txId
        await prisma.certificate.updateMany({
          where: { orderId: oid },
          data: { blockchainTxId: mintTxId }
        })

        // Step 5: Record on-chain event for blockchain explorer
        try {
          await prisma.onChainEvent.create({
            data: {
              txId: mintTxId,
              type: 'TOKEN_MINT',
              userId: order.userId,
              propertyId: order.propertyId,
              orderId: oid,
              payload: JSON.stringify({
                action: 'MintTokens',
                tokens: order.tokens,
                propertyId: order.propertyId,
                userId: order.userId,
                userEmail
              })
            }
          })
          console.log(`📝 Recorded on-chain event for order ${oid}`)
        } catch (eventErr) {
          console.warn('⚠️  Failed to record on-chain event:', eventErr)
        }

        console.log(`✅ Blockchain synchronization complete for order ${oid}`)
      } catch (err: any) {
        console.error(`❌ Failed to record payment on blockchain for order ${oid}:`, err?.message || err)
        console.error(`   Database transaction completed successfully, but blockchain sync failed.`)
        console.error(`   This may cause ledger inconsistency. Manual intervention may be required.`)
        // Don't throw - database transaction already completed
      }
    }

    return res.json({ ok: true })
  } catch (e: any) {
    if (e?.alreadyIssued) return res.json({ ok: true })
    if (String(e?.message || '').includes('order_not_confirmable')) {
      return res.status(409).json({ error: 'order_not_confirmable', message: 'هذا الطلب لا يمكن تأكيده.' })
    }
    if (String(e?.message || '').includes('tokens_sold_out')) {
      return res.status(409).json({ error: 'tokens_sold_out', message: 'عذراً، نفدت الحصص المتاحة لهذا العقار.' })
    }
    if (String(e?.message || '').includes('insufficient_balance')) {
      const requiredAmount = e?.requiredAmount ?? 0
      return res.status(400).json({
        error: 'insufficient_balance',
        action: 'DEPOSIT_REQUIRED',
        requiredAmount,
        bankTransfer: {
          bankName: process.env.BANK_NAME || 'Alinma Bank',
          iban: process.env.BANK_IBAN || 'SA0000000000000000000000',
          accountName: process.env.BANK_ACCOUNT_NAME || 'شركة الوسم للعقارات',
          instructions: 'قم بالتحويل البنكي ثم أدخل رقم المرجع لطلب الإيداع',
        },
      })
    }
    return res.status(500).json({ error: 'payment_confirm_failed' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/investments — Admin analytics: all completed investments
// ─────────────────────────────────────────────────────────────────────────────
ordersRouter.get('/investments', auth(true), requireRole(['ADMIN']), async (_req: Request & { user?: any }, res: Response) => {
  try {
    console.log('📊 Fetching investments data for admin analytics')

    const investments = await prisma.order.findMany({
      where: { status: 'ISSUED' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            createdAt: true,
            role: true,
            nationalId: true,
            address: true
          }
        },
        property: {
          select: {
            id: true,
            title: true,
            location: true,
            tokenPrice: true,
            totalTokens: true,
            remainingTokens: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const transformedInvestments = investments.map((investment: any) => ({
      id: investment.id,
      userId: investment.userId,
      propertyId: investment.propertyId,
      tokensOrdered: investment.tokens,
      totalPrice: investment.amount,
      status: investment.status,
      createdAt: investment.createdAt,
      user: investment.user,
      property: investment.property
    }))

    console.log(`✅ Found ${transformedInvestments.length} investments`)
    res.json(transformedInvestments)
  } catch (error) {
    console.error('❌ Failed to fetch investments:', error)
    res.status(500).json({ error: 'failed_to_fetch_investments', details: (error as Error)?.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/investors — Admin analytics: per-investor summary
// ─────────────────────────────────────────────────────────────────────────────
ordersRouter.get('/investors', auth(true), requireRole(['ADMIN']), async (_req: Request & { user?: any }, res: Response) => {
  try {
    console.log('👥 Fetching investor data for admin insights')

    const investorsWithInvestments = await prisma.order.groupBy({
      by: ['userId'],
      where: { status: 'ISSUED' },
      _sum: { amount: true, tokens: true },
      _count: { id: true }
    })

    const investors = await Promise.all(
      investorsWithInvestments.map(async (investor: any) => {
        const user = await prisma.user.findUnique({
          where: { id: investor.userId },
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            createdAt: true,
            role: true,
            nationalId: true,
            address: true
          }
        })

        if (!user) return null

        const userInvestments = await prisma.order.findMany({
          where: { userId: investor.userId, status: 'ISSUED' },
          include: {
            property: {
              select: {
                id: true,
                title: true,
                propertyUsage: true,
                location: true,
                tokenPrice: true
              }
            }
          }
        })

        const totalInvestment = investor._sum?.amount || 0
        const totalTokens = investor._sum?.tokens || 0
        const propertiesCount = investor._count?.id || 0
        const totalReturns = Math.floor(totalInvestment * 0.1)
        const roi = totalInvestment > 0 ? totalReturns / totalInvestment : 0

        return {
          id: user.id,
          name: user.fullName || 'Unknown Investor',
          email: user.email,
          phone: user.phoneNumber || '+966 XX XXX XXXX',
          joinDate: user.createdAt,
          status: 'active',
          verificationStatus: !!user.nationalId,
          lastActive: new Date(),
          totalInvestment,
          totalReturns,
          totalTokens,
          propertiesCount,
          roi,
          profitMargin: roi,
          portfolio: userInvestments.map((inv: any) => ({
            propertyId: inv.propertyId,
            propertyName: inv.property.title,
            propertyType: inv.property.propertyUsage,
            location: inv.property.location,
            investment: inv.amount,
            tokens: inv.tokens,
            returns: Math.floor(inv.amount * 0.092),
            investmentDate: inv.createdAt,
            expectedReturns: Math.floor(inv.amount * 0.12),
            performance: 'good'
          })),
          riskLevel: 'medium',
          performanceScore: 75,
          transactionCount: propertiesCount * 2,
          smartContractInteractions: propertiesCount
        }
      })
    )

    const validInvestors = investors
      .filter(investor => investor !== null)
      .sort((a, b) => b!.totalInvestment - a!.totalInvestment)

    console.log(`✅ Found ${validInvestors.length} investors`)
    res.json(validInvestors)
  } catch (error) {
    console.error('❌ Failed to fetch investors:', error)
    res.status(500).json({ error: 'failed_to_fetch_investors', details: (error as Error)?.message })
  }
})

export default ordersRouter
