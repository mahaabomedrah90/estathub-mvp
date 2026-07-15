import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'

export const mobileRouter = Router()

const TX_TITLE: Record<string, string> = {
  DEPOSIT:        'إيداع مكتمل',
  WITHDRAWAL:     'سحب مكتمل',
  TOKEN_MINT:     'استثمار عقاري',
  TOKEN_TRANSFER: 'تحويل حصص',
  DISTRIBUTION:   'توزيع أرباح',
}

// GET /api/mobile/dashboard — single-request home screen data for Flutter
mobileRouter.get('/dashboard', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    const userId = req.user!.userId

    const [
      user,
      wallet,
      holdings,
      recentTxns,
      pendingDeposits,
      pendingWithdrawals,
      featuredProperties,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          status: true,
          emailVerified: true,
          kycVerified: true,
        },
      }),
      prisma.wallet.findUnique({
        where: { userId },
        select: { walletId: true, cashBalance: true },
      }),
      prisma.holding.findMany({
        where: { userId },
        include: { property: { select: { tokenPrice: true } } },
      }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, type: true, amount: true, createdAt: true },
      }),
      prisma.depositRequest.count({ where: { userId, status: 'PENDING' } }),
      prisma.withdrawalRequest.count({ where: { userId, status: 'PENDING' } }),
      prisma.property.findMany({
        where: { status: 'APPROVED', remainingTokens: { gt: 0 } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          location: true,
          imageUrl: true,
          tokenPrice: true,
          expectedROI: true,
          remainingTokens: true,
        },
      }),
    ])

    if (!user) {
      return res.status(404).json({ error: 'user_not_found' })
    }

    const cashBalance   = wallet?.cashBalance ?? 0
    const investedValue = holdings.reduce(
      (sum: number, h: any) => sum + (h.tokens * (h.property?.tokenPrice ?? 0)),
      0
    )

    return res.json({
      success: true,
      data: {
        user: {
          id:            user.id,
          fullName:      user.fullName,
          email:         user.email,
          role:          user.role,
          status:        user.status,
          emailVerified: user.emailVerified,
          kycVerified:   user.kycVerified,
        },
        wallet: wallet
          ? {
              walletId:      wallet.walletId,
              cashBalance,
              investedValue,
              totalValue:    cashBalance + investedValue,
            }
          : null,
        portfolio: {
          holdingsCount: holdings.length,
          totalInvested: investedValue,
        },
        pending: {
          deposits:    pendingDeposits,
          withdrawals: pendingWithdrawals,
        },
        latestTransactions: recentTxns.map((tx: any) => ({
          id:        tx.id,
          type:      tx.type,
          status:    'COMPLETED',
          amount:    tx.amount,
          createdAt: tx.createdAt,
          title:     TX_TITLE[tx.type] || tx.type,
        })),
        featuredProperties: featuredProperties.map((p: any) => ({
          id:              p.id,
          title:           p.title,
          location:        p.location,
          imageUrl:        p.imageUrl || null,
          tokenPrice:      p.tokenPrice,
          expectedROI:     p.expectedROI,
          remainingTokens: p.remainingTokens,
        })),
      },
    })
  } catch (e: any) {
    console.error('❌ Mobile dashboard error:', e)
    return res.status(500).json({ error: 'failed_to_load_dashboard' })
  }
})
