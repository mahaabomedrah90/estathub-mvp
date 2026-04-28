import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'

export const depositRequestAdminRouter = Router()

function requireAdmin(req: Request & { user?: any }, res: Response): boolean {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'admin_access_required' })
    return false
  }
  return true
}

// GET /api/admin/deposit-requests — list all deposit requests, newest first
depositRequestAdminRouter.get('/', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return

  try {
    const status = req.query.status as string | undefined
    const where = status ? { status: status as any } : {}

    const requests = await prisma.depositRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phoneNumber: true },
        },
      },
    })

    return res.json(requests)
  } catch (e: any) {
    console.error('❌ Failed to list deposit requests:', e)
    return res.status(500).json({ error: 'failed_to_list_deposit_requests' })
  }
})

// POST /api/admin/deposit-requests/:id/approve
depositRequestAdminRouter.post('/:id/approve', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return

  const { id } = req.params

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const depositReq = await tx.depositRequest.findUnique({ where: { id } })

      if (!depositReq) {
        throw Object.assign(new Error('not_found'), { status: 404 })
      }
      if (depositReq.status === 'APPROVED') {
        throw Object.assign(new Error('already_approved'), { status: 409 })
      }
      if (depositReq.status === 'REJECTED') {
        throw Object.assign(new Error('already_rejected'), { status: 409 })
      }

      // Upsert wallet so it exists
      const wallet = await tx.wallet.upsert({
        where: { userId: depositReq.userId },
        update: {},
        create: {
          userId: depositReq.userId,
          tenantId: (await tx.user.findUnique({ where: { id: depositReq.userId }, select: { tenantId: true } }))!.tenantId,
        },
      })

      // Credit wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { cashBalance: { increment: depositReq.amount } },
      })

      // Create confirmed transaction record
      const user = await tx.user.findUnique({
        where: { id: depositReq.userId },
        select: { tenantId: true },
      })
      await tx.transaction.create({
        data: {
          userId: depositReq.userId,
          tenantId: user!.tenantId,
          type: 'DEPOSIT',
          amount: depositReq.amount,
          ref: depositReq.bankReference || undefined,
          note: `Approved deposit request ${id}`,
        },
      })

      // Mark request as approved
      const updated = await tx.depositRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: req.user!.userId,
          reviewedAt: new Date(),
        },
      })

      return { depositRequest: updated, newBalance: updatedWallet.cashBalance }
    })

    console.log(`✅ Deposit request ${id} approved. New balance: ${result.newBalance}`)
    return res.json({
      success: true,
      depositRequest: result.depositRequest,
      newBalance: result.newBalance,
    })
  } catch (e: any) {
    console.error('❌ Deposit approval error:', e)
    const status = e.status || 500
    return res.status(status).json({ error: e.message || 'approval_failed' })
  }
})

// POST /api/admin/deposit-requests/:id/reject
depositRequestAdminRouter.post('/:id/reject', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return

  const { id } = req.params
  const adminNote: string = req.body?.adminNote || ''

  try {
    const depositReq = await prisma.depositRequest.findUnique({ where: { id } })

    if (!depositReq) {
      return res.status(404).json({ error: 'not_found' })
    }
    if (depositReq.status === 'APPROVED') {
      return res.status(409).json({ error: 'already_approved', message: 'Cannot reject an already approved request.' })
    }
    if (depositReq.status === 'REJECTED') {
      return res.status(409).json({ error: 'already_rejected', message: 'Request is already rejected.' })
    }

    const updated = await prisma.depositRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNote: adminNote || null,
        reviewedBy: req.user!.userId,
        reviewedAt: new Date(),
      },
    })

    console.log(`🚫 Deposit request ${id} rejected.`)
    return res.json({ success: true, depositRequest: updated })
  } catch (e: any) {
    console.error('❌ Deposit rejection error:', e)
    return res.status(500).json({ error: 'rejection_failed' })
  }
})
