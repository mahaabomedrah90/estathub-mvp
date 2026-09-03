import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { logAdminAction, AuditAction } from '../lib/auditService'
import { sendEmail, getAdminEmail, buildAdminWithdrawalRequestEmail, buildWithdrawalApprovedEmail, buildWithdrawalRejectedEmail, maskIban } from '../lib/emailService'
import { getFeatureFlag } from '../lib/featureFlags'
import { storeReviewerGuard } from '../middleware/storeReviewer'

// ─── Investor router ──────────────────────────────────────────────────────────
export const withdrawalRequestRouter = Router()

// POST /api/wallet/withdrawal-request
withdrawalRequestRouter.post('/', auth(true), storeReviewerGuard, async (req: Request & { user?: any }, res: Response) => {
  try {
    const withdrawalEnabled = await getFeatureFlag('withdrawalEnabled', true)
    if (!withdrawalEnabled) {
      return res.status(410).json({ error: 'WITHDRAWAL_DISABLED', message: 'خدمة السحب متوقفة مؤقتاً.' })
    }
    const withdrawalMaintenance = await getFeatureFlag('maintenanceMode', false)
    if (withdrawalMaintenance && req.user?.role !== 'ADMIN') {
      return res.status(503).json({ error: 'MAINTENANCE_MODE', message: 'المنصة في وضع الصيانة حالياً. يرجى المحاولة لاحقاً.' })
    }

    const amount         = Number(req.body?.amount)
    const ibanConfirmed  = req.body?.ibanConfirmed === true
    const bankName: string | undefined = req.body?.bankName?.trim() || undefined

    // Normalize IBAN from request body (remove spaces, uppercase)
    let rawIban: string | undefined = req.body?.iban
      ? req.body.iban.replace(/\s+/g, '').toUpperCase()
      : undefined

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'invalid_amount', message: 'Amount must be a positive number.' })
    }

    // Validate wallet balance
    const wallet = await prisma.wallet.findUnique({ where: { userId: req.user!.userId } })
    const currentBalance = wallet?.cashBalance ?? 0

    if (amount > currentBalance) {
      return res.status(400).json({
        error: 'insufficient_balance',
        message: 'Withdrawal amount exceeds available wallet balance.',
        messageAr: 'مبلغ السحب يتجاوز الرصيد المتاح في محفظتك.',
        availableBalance: currentBalance,
      })
    }

    // Resolve IBAN — either from ibanConfirmed reuse or from request body
    let effectiveBankName = bankName
    if (ibanConfirmed) {
      const saved = await prisma.withdrawalRequest.findFirst({
        where: {
          userId: req.user!.userId,
          iban: { not: null },
          status: { in: ['PENDING', 'APPROVED'] },
        },
        orderBy: { createdAt: 'desc' },
        select: { iban: true, bankName: true },
      })
      if (!saved?.iban) {
        return res.status(400).json({ error: 'iban_required', message: 'رقم الآيبان مطلوب لإرسال طلب السحب', field: 'iban' })
      }
      rawIban = saved.iban
      effectiveBankName = bankName || saved.bankName || undefined
    } else {
      if (!rawIban) {
        return res.status(400).json({ error: 'iban_required', message: 'رقم الآيبان مطلوب لإرسال طلب السحب', field: 'iban' })
      }
      if (!rawIban.startsWith('SA') || rawIban.length !== 24) {
        return res.status(400).json({ error: 'invalid_iban', message: 'رقم الآيبان غير صحيح — يجب أن يبدأ بـ SA ويتكون من 24 حرفاً', field: 'iban' })
      }
    }

    const request = await prisma.withdrawalRequest.create({
      data: {
        userId:   req.user!.userId,
        amount,
        bankName: effectiveBankName,
        iban:     rawIban,
        status:   'PENDING',
      },
    })

    // Fire-and-forget admin email — failure must NOT block the response
    ;(async () => {
      try {
        const adminEmail = await getAdminEmail(prisma as any)
        const user = await prisma.user.findUnique({
          where: { id: req.user!.userId },
          select: { fullName: true, email: true, phoneNumber: true },
        })
        const content = buildAdminWithdrawalRequestEmail({
          investorName:       user?.fullName || req.user!.email || 'Unknown',
          investorEmail:      user?.email    || req.user!.email,
          investorPhone:      user?.phoneNumber || undefined,
          amount,
          requestId:          request.id,
          customerIbanMasked: rawIban ? maskIban(rawIban) : undefined,
          customerBankName:   effectiveBankName,
          createdAt:          request.createdAt,
        })
        await sendEmail({ to: adminEmail, ...content })
        console.log(`✅ Withdrawal request admin email sent for request ${request.id}`)
      } catch (emailErr: any) {
        console.warn(`⚠️  Failed to send withdrawal request admin email (request ${request.id}):`, emailErr.message)
      }
    })()

    return res.status(201).json({
      id:        request.id,
      status:    request.status,
      amount:    request.amount,
      message:   'Your withdrawal request has been submitted and is pending admin review. Your balance will be updated after approval.',
      messageAr: 'تم إرسال طلب السحب للمراجعة. لن يتم خصم المبلغ إلا بعد اعتماد الإدارة.',
    })
  } catch (e: any) {
    console.error('❌ Withdrawal request error:', e)
    return res.status(500).json({ error: 'withdrawal_request_failed' })
  }
})

// ─── Admin router ─────────────────────────────────────────────────────────────
export const withdrawalRequestAdminRouter = Router()

function requireAdmin(req: Request & { user?: any }, res: Response): boolean {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'admin_access_required' })
    return false
  }
  return true
}

// GET /api/admin/withdrawal-requests
withdrawalRequestAdminRouter.get('/', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return
  try {
    const status = req.query.status as string | undefined
    const where = status ? { status: status as any } : {}
    const requests = await prisma.withdrawalRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
      },
    })
    return res.json(requests)
  } catch (e: any) {
    console.error('❌ Failed to list withdrawal requests:', e)
    return res.status(500).json({ error: 'failed_to_list_withdrawal_requests' })
  }
})

// POST /api/admin/withdrawal-requests/:id/approve
withdrawalRequestAdminRouter.post('/:id/approve', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return
  const { id } = req.params

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // Atomically claim the request — prevents double-debit under concurrent approvals.
      const claimed = await tx.withdrawalRequest.updateMany({
        where: { id, status: 'PENDING' },
        data:  { status: 'APPROVED', reviewedBy: req.user!.userId, reviewedAt: new Date() },
      })
      if (claimed.count === 0) {
        const current = await tx.withdrawalRequest.findUnique({ where: { id }, select: { status: true } })
        if (!current) throw Object.assign(new Error('not_found'), { status: 404 })
        throw Object.assign(new Error(current.status === 'APPROVED' ? 'already_approved' : 'already_rejected'), { status: 409 })
      }

      const wReq = await tx.withdrawalRequest.findUnique({ where: { id } })
      if (!wReq) throw Object.assign(new Error('not_found'), { status: 404 })

      // Validate wallet balance
      const wallet = await tx.wallet.findUnique({ where: { userId: wReq.userId } })
      if (!wallet || (wallet.cashBalance ?? 0) < wReq.amount) {
        throw Object.assign(new Error('insufficient_balance'), { status: 400 })
      }

      const walletBefore = wallet.cashBalance ?? 0

      // Deduct balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { cashBalance: { decrement: wReq.amount } },
      })

      // Create withdrawal transaction record
      const user = await tx.user.findUnique({
        where: { id: wReq.userId },
        select: { tenantId: true },
      })
      await tx.transaction.create({
        data: {
          userId: wReq.userId,
          tenantId: user!.tenantId,
          type: 'WITHDRAWAL',
          amount: wReq.amount,
          note: `Withdrawal request ${id} approved`,
        },
      })

      // Re-fetch final state for response/email/audit (status already set by atomic claim above)
      const updated = await tx.withdrawalRequest.findUnique({ where: { id } })

      return { updated, walletBefore, walletAfter: updatedWallet.cashBalance ?? 0 }
    })

    // Fire-and-forget audit log
    ;(async () => {
      try {
        const wReq = await prisma.withdrawalRequest.findUnique({
          where: { id },
          include: { user: { select: { fullName: true, email: true } } },
        })
        await logAdminAction({
          admin:      { userId: req.user!.userId, email: req.user!.email },
          action:     AuditAction.WITHDRAWAL_APPROVED,
          targetType: 'WithdrawalRequest',
          targetId:   id,
          investor:   { id: wReq!.userId, name: wReq?.user?.fullName || wReq?.user?.email },
          amount:     wReq!.amount,
          walletBefore: result.walletBefore,
          walletAfter:  result.walletAfter,
          req,
        })
      } catch (err: any) {
        console.error('⚠️  Audit log failed (withdrawal approve):', err.message)
      }
    })()

    // Fire-and-forget investor approval email
    ;(async () => {
      try {
        const wReq = await prisma.withdrawalRequest.findUnique({
          where: { id },
          include: { user: { select: { email: true, fullName: true } } },
        })
        if (wReq?.user) {
          const content = buildWithdrawalApprovedEmail({
            userName:   wReq.user.fullName || wReq.user.email,
            amount:     wReq.amount,
            requestId:  id,
            bankName:   wReq.bankName   || undefined,
            ibanMasked: wReq.iban       ? maskIban(wReq.iban) : undefined,
            newBalance: result.walletAfter,
            approvedAt: result.updated.reviewedAt ?? new Date(),
          })
          await sendEmail({ to: wReq.user.email, ...content })
          console.log(`✅ Withdrawal approved email sent to ${wReq.user.email} for request ${id}`)
        }
      } catch (emailErr: any) {
        console.warn(`⚠️  Failed to send withdrawal approved email (request ${id}):`, emailErr.message)
      }
    })()

    return res.json({ success: true, withdrawalRequest: result.updated })
  } catch (e: any) {
    const status = e.status || 500
    const error  = e.message || 'approval_failed'
    return res.status(status).json({ error })
  }
})

// POST /api/admin/withdrawal-requests/:id/reject
withdrawalRequestAdminRouter.post('/:id/reject', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return
  const { id }         = req.params
  const adminNote: string = req.body?.adminNote || ''

  try {
    const wReq = await prisma.withdrawalRequest.findUnique({ where: { id } })
    if (!wReq) return res.status(404).json({ error: 'not_found' })
    if (wReq.status !== 'PENDING') return res.status(409).json({ error: 'not_pending' })

    const updated = await prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status:     'REJECTED',
        adminNote:  adminNote || null,
        reviewedBy: req.user!.userId,
        reviewedAt: new Date(),
      },
    })

    // Fire-and-forget audit log for rejection
    ;(async () => {
      try {
        await logAdminAction({
          admin:      { userId: req.user!.userId, email: req.user!.email },
          action:     AuditAction.WITHDRAWAL_REJECTED,
          targetType: 'WithdrawalRequest',
          targetId:   id,
          investor:   { id: wReq.userId },
          amount:     wReq.amount,
          metadata:   { reason: adminNote || null },
          req,
        })
      } catch (err: any) {
        console.error('⚠️  Audit log failed (withdrawal reject):', err.message)
      }
    })()

    // Fire-and-forget investor rejection email
    ;(async () => {
      try {
        const wReq = await prisma.withdrawalRequest.findUnique({
          where: { id },
          include: { user: { select: { email: true, fullName: true } } },
        })
        if (wReq?.user) {
          const content = buildWithdrawalRejectedEmail({
            userName:   wReq.user.fullName || wReq.user.email,
            amount:     wReq.amount,
            requestId:  id,
            adminNote:  updated.adminNote || undefined,
            rejectedAt: updated.reviewedAt ?? new Date(),
          })
          await sendEmail({ to: wReq.user.email, ...content })
          console.log(`✅ Withdrawal rejection email sent to ${wReq.user.email} for request ${id}`)
        }
      } catch (emailErr: any) {
        console.warn(`⚠️  Failed to send withdrawal rejection email (request ${id}):`, emailErr.message)
      }
    })()

    return res.json({ success: true, withdrawalRequest: updated })
  } catch (e: any) {
    console.error('❌ Withdrawal rejection error:', e)
    return res.status(500).json({ error: 'rejection_failed' })
  }
})
