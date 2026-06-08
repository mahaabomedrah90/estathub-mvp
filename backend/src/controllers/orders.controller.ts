import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { requireRole } from '../middleware/roles'
import { submitMintTokens, isFabricEnabled, submitTxn } from '../lib/fabric'
import { getSetting } from './settings.controller'
import { issueDeedAfterPayment } from '../lib/deedService'
import crypto from 'node:crypto'

export const ordersRouter = Router()

// POST /api/orders — create order for investor
ordersRouter.post('/', auth(true), async (req: Request & { user?: any }, res: Response) => {
  let userId: string = '', pid: string = '', qty: number = 0
  
  try {
    console.log('📝 Order creation request:', {
      body: req.body,
      user: req.user
    })
    
    // Validate user role - only INVESTOR can create orders
    const userRole = req.user?.role
    if (userRole !== 'INVESTOR') {
      console.log('❌ Order creation denied - invalid role:', userRole)
      return res.status(403).json({
        error: 'role_not_authorized',
        message: userRole === 'ADMIN' 
          ? 'Administrators cannot invest in properties. Only investors can purchase tokens.'
          : userRole === 'OWNER'
          ? 'Property owners cannot invest in properties. Only investors can purchase tokens.'
          : 'Only investors can purchase property tokens. Please log in with an investor account.',
        requiredRole: 'INVESTOR',
        currentRole: userRole
      })
    }
    
    userId = req.user!.userId
    const { propertyId, tokens } = req.body || {}
    pid = String(propertyId)
    qty = Number(tokens)
    if (!pid || !Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: 'invalid_input' })

    const prop = await prisma.property.findUnique({ where: { id: pid } })
    if (!prop) return res.status(404).json({ error: 'property_not_found' })
    if (prop.status !== 'APPROVED') return res.status(400).json({ error: 'property_not_available', message: 'This property is not available for investment.' })
    const existingPendingOrder = await prisma.order.findFirst({
      where: { userId, propertyId: pid, status: 'PENDING' }
    })
    if (existingPendingOrder) {
      return res.status(409).json({
        error: 'pending_order_exists',
        message: 'You already have a pending order for this property.',
        existingOrderId: existingPendingOrder.id
      })
    }
    if (prop.remainingTokens < qty) return res.status(400).json({ error: 'insufficient_tokens' })

    const investmentAmount = (prop.tokenPrice || 0) * qty

    // Validate minimum investment against investmentAmount (not totalPayable)
    const minInvestmentStr = await getSetting('minInvestmentAmount', '100')
    const MIN_INVESTMENT = parseInt(minInvestmentStr, 10)
    if (investmentAmount < MIN_INVESTMENT) {
      return res.status(400).json({
        error: 'minimum_investment_not_met',
        message: `Minimum investment is ${MIN_INVESTMENT} SAR. Your investment amount is ${investmentAmount.toFixed(2)} SAR.`,
        minInvestment: MIN_INVESTMENT,
        currentAmount: investmentAmount
      })
    }

    // Validate maximum investment against investmentAmount (not totalPayable)
    const maxInvestmentStr = await getSetting('maxInvestmentAmount', '1000000')
    const MAX_INVESTMENT = parseInt(maxInvestmentStr, 10)
    console.log('💰 Investment validation:', { investmentAmount, MIN_INVESTMENT, MAX_INVESTMENT })
    if (investmentAmount > MAX_INVESTMENT) {
      console.log('❌ Maximum investment exceeded:', { investmentAmount, MAX_INVESTMENT })
      return res.status(400).json({
        error: 'maximum_investment_exceeded',
        message: `Maximum investment is ${MAX_INVESTMENT.toLocaleString()} SAR. Your investment amount is ${investmentAmount.toFixed(2)} SAR.`,
        maxInvestment: MAX_INVESTMENT,
        currentAmount: investmentAmount
      })
    }

    // Calculate platform fee (applied on top of investmentAmount)
    const platformFeeStr = await getSetting('platformFee', '5')
    const platformFeePercent = parseFloat(platformFeeStr)
    const platformFeeAmount = parseFloat((investmentAmount * platformFeePercent / 100).toFixed(2))
    const totalPayable = parseFloat((investmentAmount + platformFeeAmount).toFixed(2))

    const order = await prisma.order.create({ data: { userId, propertyId: pid, tokens: qty, amount: investmentAmount, status: 'PENDING' } })
    console.log(`💳 Order created: investmentAmount=${investmentAmount}, fee=${platformFeePercent}%=${platformFeeAmount}, totalPayable=${totalPayable}`)
    return res.status(201).json({
      id: order.id,
      amount: order.amount,
      investmentAmount: order.amount,
      platformFeePercent,
      platformFeeAmount,
      totalPayable,
      status: order.status
    })
  } catch (e) {
    console.error('❌ Order creation failed:', {
      error: e,
      message: (e as Error)?.message,
      stack: (e as Error)?.stack,
      userId,
      propertyId: pid,
      tokens: qty
    })
    return res.status(500).json({ error: 'order_create_failed', details: (e as Error)?.message })
  }
})

// POST /api/payments/confirm — confirm payment and issue tokens
ordersRouter.post('/confirm', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    const oid = req.body?.orderId
    if (!oid) return res.status(400).json({ error: 'invalid_orderId' })

    const order = await prisma.order.findUnique({ where: { id: oid }, include: { property: true } })
    if (!order) return res.status(404).json({ error: 'order_not_found' })
    if (order.userId !== req.user!.userId) {
      return res.status(403).json({ error: 'forbidden', message: 'You can only confirm your own orders.' })
    }
    if (order.status === 'ISSUED') return res.json({ ok: true })

    // Complete database transaction first (without blockchain)
    await prisma.$transaction(async (tx: any) => {

      // Recalculate payment amounts — must match order creation logic
      const investmentAmount = (order.property?.tokenPrice || 0) * (order.tokens || 0)
      const platformFeeStr = await getSetting('platformFee', '5')
      const platformFeePercent = parseFloat(platformFeeStr)
      const platformFeeAmount = parseFloat((investmentAmount * platformFeePercent / 100).toFixed(2))
      const totalPayable = parseFloat((investmentAmount + platformFeeAmount).toFixed(2))

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

      // Mark order paid and debit totalPayable (investmentAmount + fee) from wallet
      await tx.order.update({ where: { id: oid }, data: { status: 'PENDING' } })
      await tx.wallet.update({ where: { id: wallet.id }, data: { cashBalance: { decrement: totalPayable } } })
      await tx.transaction.create({
        data: {
          userId: order.userId,
          tenantId: user.tenantId,
          type: 'WITHDRAWAL',
          amount: totalPayable,
          ref: String(oid)
        }
      })

      // Issue tokens off-chain: decrement property supply and credit holding
      await tx.property.update({ where: { id: order.propertyId }, data: { remainingTokens: { decrement: order.tokens } } })
      await tx.holding.upsert({
        where: { userId_propertyId: { userId: order.userId, propertyId: order.propertyId } },
        update: { tokens: { increment: order.tokens } },
        create: { userId: order.userId, propertyId: order.propertyId, tokens: order.tokens },
      })

      // Certificate and finalize
      const code = crypto.randomUUID()
      await tx.certificate.create({ data: { code, userId: order.userId, propertyId: order.propertyId, orderId: order.id } })
      await tx.order.update({ where: { id: oid }, data: { status: 'ISSUED' } })
    })
    
    // Auto-issue digital deed after payment — fire-and-forget
    issueDeedAfterPayment({
      userId: order.userId,
      propertyId: order.propertyId,
      orderId: oid,
    }).catch(err => console.error('⚠️  [deed] Auto-issuance failed for order', oid, err?.message))

    // After database transaction succeeds, record on blockchain
    if (isFabricEnabled()) {
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
            amount: order.tokens, // Record actual token amount minted
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
  } catch (e) {
    if (String((e as Error).message || '').includes('insufficient_balance')) {
      const requiredAmount = (e as any).requiredAmount ?? 0
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

// GET /api/orders/investments - get all investments for admin analytics
ordersRouter.get('/investments', auth(true), requireRole(['ADMIN']), async (req: Request & { user?: any }, res: Response) => {
  try {
    console.log('📊 Fetching investments data for admin analytics')
    
    // Get all completed orders (investments)
    const investments = await prisma.order.findMany({
      where: {
        status: 'ISSUED'
      },
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
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform the data for frontend consumption
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
    res.status(500).json({ 
      error: 'failed_to_fetch_investments',
      details: (error as Error)?.message 
    })
  }
})

// GET /api/orders/investors - get investor data for admin insights
ordersRouter.get('/investors', auth(true), requireRole(['ADMIN']), async (req: Request & { user?: any }, res: Response) => {
  try {
    console.log('👥 Fetching investor data for admin insights')
    
    // Get users with investments
    const investorsWithInvestments = await prisma.order.groupBy({
      by: ['userId'],
      where: { status: 'ISSUED' },
      _sum: {
        amount: true,
        tokens: true
      },
      _count: {
        id: true
      }
    })

    // Get detailed user information for each investor
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

        // Get user's investment details
        const userInvestments = await prisma.order.findMany({
          where: {
            userId: investor.userId,
            status: 'ISSUED'
          },
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

        // Basic investment metrics derived from aggregated groupBy result
        const totalInvestment = investor._sum?.amount || 0
        const totalTokens = investor._sum?.tokens || 0
        const propertiesCount = investor._count?.id || 0
        const totalReturns = Math.floor(totalInvestment * 0.1)
        const roi = totalInvestment > 0 ? totalReturns / totalInvestment : 0

        // Simple risk/performance placeholders for dashboard
        const riskLevel = 'medium'
        const performanceScore = 75

        return {
          id: user.id,
          name: user.fullName || 'Unknown Investor',
          email: user.email,
          phone: user.phoneNumber || '+966 XX XXX XXXX',
          joinDate: user.createdAt,
          status: 'active', // Default status
          verificationStatus: !!user.nationalId, // Use nationalId as verification indicator
          lastActive: new Date(), // Current date as default
          // Investment metrics
          totalInvestment,
          totalReturns,
          totalTokens,
          propertiesCount,
          roi,
          profitMargin: roi,
          
          // Portfolio details
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
          
          // Risk and performance metrics
          riskLevel,
          performanceScore,
          transactionCount: propertiesCount * 2,
          smartContractInteractions: propertiesCount
        }
      })
    )

    // Filter out null values and sort by total investment
    const validInvestors = investors
      .filter(investor => investor !== null)
      .sort((a, b) => b!.totalInvestment - a!.totalInvestment)

    console.log(`✅ Found ${validInvestors.length} investors`)
    
    res.json(validInvestors)
  } catch (error) {
    console.error('❌ Failed to fetch investors:', error)
    res.status(500).json({ 
      error: 'failed_to_fetch_investors',
      details: (error as Error)?.message 
    })
  }
})

export default ordersRouter
