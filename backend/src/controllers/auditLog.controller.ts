import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'

export const auditLogRouter = Router()

function requireAdmin(req: Request & { user?: any }, res: Response): boolean {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'admin_access_required' })
    return false
  }
  return true
}

// ─── GET /api/admin/audit-logs ────────────────────────────────────────────────
// Query params:
//   q             — OR-search across action / adminEmail / investorName /
//                   investorId / targetId / targetType (partial, case-insensitive)
//   range         — "today" | "7d" | "30d" (default: all)
//   page          — 1-based (default 1)
//   limit         — rows per page (default 20, max 100)
//
// Backwards-compat (when q is absent):
//   action, adminEmail, investorName — partial AND filters
//   targetId                         — exact AND filter
auditLogRouter.get('/audit-logs', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return

  try {
    const page  = Math.max(1, Number(req.query.page)  || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const skip  = (page - 1) * limit

    // ── Date range (always AND) ────────────────────────────────────────────────
    let createdAtFilter: any = undefined
    const range = req.query.range as string | undefined
    if (range === 'today') {
      const start = new Date(); start.setHours(0, 0, 0, 0)
      createdAtFilter = { gte: start }
    } else if (range === '7d') {
      createdAtFilter = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    } else if (range === '30d') {
      createdAtFilter = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }

    // ── Search logic ───────────────────────────────────────────────────────────
    const q = req.query.q ? String(req.query.q).trim() : ''

    const where: any = {}

    if (createdAtFilter) {
      where.createdAt = createdAtFilter
    }

    if (q) {
      // OR across all searchable text fields
      where.OR = [
        { action:       { contains: q, mode: 'insensitive' } },
        { adminEmail:   { contains: q, mode: 'insensitive' } },
        { investorName: { contains: q, mode: 'insensitive' } },
        { investorId:   { contains: q, mode: 'insensitive' } },
        { targetId:     { contains: q, mode: 'insensitive' } },
        { targetType:   { contains: q, mode: 'insensitive' } },
      ]
    } else {
      // Backwards-compat: individual AND filters (used when q is absent)
      if (req.query.action)       where.action       = { contains: String(req.query.action),       mode: 'insensitive' }
      if (req.query.adminEmail)   where.adminEmail   = { contains: String(req.query.adminEmail),   mode: 'insensitive' }
      if (req.query.investorName) where.investorName = { contains: String(req.query.investorName), mode: 'insensitive' }
      if (req.query.targetId)     where.targetId     = { contains: String(req.query.targetId),     mode: 'insensitive' }
    }

    const [total, logs] = await Promise.all([
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ])

    return res.json({
      data: logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (e: any) {
    console.error('❌ Audit log list error:', e)
    return res.status(500).json({ error: 'failed_to_list_audit_logs' })
  }
})

// ─── GET /api/admin/users/:id/wallet-history ─────────────────────────────────
// Returns the transaction history for a user, mapped to a UI-friendly shape.
auditLogRouter.get('/users/:id/wallet-history', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return

  const { id } = req.params

  try {
    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, fullName: true } })
    if (!user) return res.status(404).json({ error: 'user_not_found' })

    const transactions = await prisma.transaction.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const typeLabel: Record<string, string> = {
      DEPOSIT:        'Bank Deposit',
      WITHDRAWAL:     'Withdrawal',
      TOKEN_MINT:     'Property Investment',
      TOKEN_TRANSFER: 'Token Transfer',
      DISTRIBUTION:   'Investment Distribution',
    }

    const mapped = transactions.map((tx) => {
      // Outgoing types are shown as negative
      const isDebit = tx.type === 'WITHDRAWAL' || tx.type === 'TOKEN_MINT' || tx.type === 'TOKEN_TRANSFER'
      return {
        id:          tx.id,
        type:        tx.type,
        amount:      isDebit ? -Math.abs(tx.amount) : Math.abs(tx.amount),
        createdAt:   tx.createdAt,
        description: tx.note || typeLabel[tx.type] || tx.type,
        ref:         tx.ref || null,
      }
    })

    return res.json(mapped)
  } catch (e: any) {
    console.error('❌ Wallet history error:', e)
    return res.status(500).json({ error: 'failed_to_load_wallet_history' })
  }
})
