import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { sendEmail, buildDepositApprovedEmail, buildDepositRejectedEmail } from '../lib/emailService'
import { logAdminAction, AuditAction } from '../lib/auditService'

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
      // Atomically claim the request — only one concurrent approve wins.
      // updateMany where status='PENDING' returns count=0 if already approved/rejected,
      // preventing double-credit under READ COMMITTED isolation.
      const claimed = await tx.depositRequest.updateMany({
        where: { id, status: 'PENDING' },
        data:  { status: 'APPROVED', reviewedBy: req.user!.userId, reviewedAt: new Date() },
      })
      if (claimed.count === 0) {
        const current = await tx.depositRequest.findUnique({ where: { id }, select: { status: true } })
        if (!current) throw Object.assign(new Error('not_found'), { status: 404 })
        throw Object.assign(new Error(current.status === 'APPROVED' ? 'already_approved' : 'already_rejected'), { status: 409 })
      }

      const depositReq = await tx.depositRequest.findUnique({ where: { id } })
      if (!depositReq) throw Object.assign(new Error('not_found'), { status: 404 })

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

      // Re-fetch after wallet update to get final state for response/email
      const updated = await tx.depositRequest.findUnique({ where: { id } })

      return { depositRequest: updated, newBalance: updatedWallet.cashBalance }
    })

    console.log(`✅ Deposit request ${id} approved. New balance: ${result.newBalance}`)

    // Fire-and-forget audit log + email
    ;(async () => {
      try {
        const investor = await prisma.user.findUnique({
          where: { id: result.depositRequest.userId },
          select: { email: true, fullName: true },
        })
        await logAdminAction({
          admin:       { userId: req.user!.userId, email: req.user!.email },
          action:      AuditAction.DEPOSIT_APPROVED,
          targetType:  'DepositRequest',
          targetId:    id,
          investor:    { id: result.depositRequest.userId, name: investor?.fullName || investor?.email },
          amount:      result.depositRequest.amount,
          walletBefore: result.newBalance - result.depositRequest.amount,
          walletAfter:  result.newBalance,
          metadata: {
            bankReference: result.depositRequest.bankReference,
            bankName:      result.depositRequest.bankName,
          },
          req,
        })
      } catch (auditErr: any) {
        console.error('⚠️  Failed to write audit log (approve):', auditErr.message)
      }
    })()

    // Fire-and-forget email notification to investor
    ;(async () => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: result.depositRequest.userId },
          select: { email: true, fullName: true },
        })
        if (user) {
          const { subject, html, text } = buildDepositApprovedEmail({
            userName: user.fullName || user.email,
            amount: result.depositRequest.amount,
            newBalance: result.newBalance,
            requestId: id,
          })
          await sendEmail({ to: user.email, subject, html, text })
        }
      } catch (emailErr) {
        console.error('⚠️  Failed to send deposit approval email:', emailErr)
      }
    })()

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

    // Fire-and-forget audit log
    ;(async () => {
      try {
        const investor = await prisma.user.findUnique({
          where: { id: depositReq.userId },
          select: { fullName: true, email: true },
        })
        await logAdminAction({
          admin:      { userId: req.user!.userId, email: req.user!.email },
          action:     AuditAction.DEPOSIT_REJECTED,
          targetType: 'DepositRequest',
          targetId:   id,
          investor:   { id: depositReq.userId, name: investor?.fullName || investor?.email },
          amount:     depositReq.amount,
          metadata:   { reason: adminNote || null },
          req,
        })
      } catch (auditErr: any) {
        console.error('⚠️  Failed to write audit log (reject):', auditErr.message)
      }
    })()

    // Fire-and-forget email notification to investor
    ;(async () => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: depositReq.userId },
          select: { email: true, fullName: true },
        })
        if (user) {
          const { subject, html, text } = buildDepositRejectedEmail({
            userName: user.fullName || user.email,
            amount: depositReq.amount,
            requestId: id,
            adminNote: adminNote || undefined,
          })
          await sendEmail({ to: user.email, subject, html, text })
        }
      } catch (emailErr) {
        console.error('⚠️  Failed to send deposit rejection email:', emailErr)
      }
    })()

    return res.json({ success: true, depositRequest: updated })
  } catch (e: any) {
    console.error('❌ Deposit rejection error:', e)
    return res.status(500).json({ error: 'rejection_failed' })
  }
})
