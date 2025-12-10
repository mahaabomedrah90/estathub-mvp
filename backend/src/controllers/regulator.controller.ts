
import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { requireRole } from '../middleware/roles'
import { $Enums, TransactionType } from '@prisma/client'

export const regulatorRouter = Router()

// Shared middleware: authenticated + regulator/admin role
const regulatorOnly = [auth(true), requireRole(['REGULATOR', 'ADMIN'])]

// ---------------------------------------------------------------------------
// GET /api/regulator/properties
// Read-only list of all properties with basic regulatory info
// ---------------------------------------------------------------------------
regulatorRouter.get(
  '/properties',
  ...regulatorOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, status, from, to } = req.query

      const where: any = {}

      // Optional status filter
      if (status && typeof status === 'string') {
        const upper = status.toUpperCase() as $Enums.PropertyStatus
        if (['PENDING', 'APPROVED', 'REJECTED'].includes(upper)) {
          where.status = upper
        }
      }

      // Optional text search
      if (search && typeof search === 'string') {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
          { ownerName: { contains: search, mode: 'insensitive' } },
          { deedNumber: { contains: search, mode: 'insensitive' } },
        ]
      }

      // Optional date range filter on submittedAt
      if ((from && typeof from === 'string') || (to && typeof to === 'string')) {
        where.submittedAt = {}
        if (from && typeof from === 'string') {
          where.submittedAt.gte = new Date(from)
        }
        if (to && typeof to === 'string') {
          where.submittedAt.lte = new Date(to)
        }
      }

      const list = await prisma.property.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
      })

      const mapped = list.map((p) => ({
        id: p.id,
        title: p.title,
        location: p.location,
        ownerName: p.ownerName,
        totalTokens: p.totalTokens,
        remainingTokens: p.remainingTokens,
        status: p.status,
        deedNumber: p.deedNumber,
        submittedAt: p.submittedAt,
        approvedAt: p.approvedAt,
        rejectedAt: p.rejectedAt,
        rejectionReason: p.rejectionReason,
      }))

      res.json(mapped)
    } catch (err) {
      next(err)
    }
  }
)

// ---------------------------------------------------------------------------
// GET /api/regulator/properties/:id
// Detailed property view + current ownership breakdown
// ---------------------------------------------------------------------------
regulatorRouter.get(
  '/properties/:id',
  ...regulatorOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      if (!id) {
        return res.status(400).json({ error: 'invalid_property_id' })
      }

      const property = await prisma.property.findUnique({
        where: { id },
      })

      if (!property) {
        return res.status(404).json({ error: 'property_not_found' })
      }

      // Ownership breakdown
      const holdings = await prisma.holding.findMany({
        where: { propertyId: id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              createdAt: true,
            },
          },
        },
        orderBy: { tokens: 'desc' },
      })

      const totalTokens = property.totalTokens || 0

      const ownership = holdings.map((h) => ({
        id: h.id,
        userId: h.userId,
        userEmail: h.user.email,
        userName: h.user.name || h.user.email,
        role: h.user.role,
        tokens: h.tokens,
        ownershipPct:
          totalTokens > 0 ? Number(((h.tokens / totalTokens) * 100).toFixed(2)) : 0,
        since: h.createdAt,
      }))

      const response = {
        property: {
          id: property.id,
          title: property.title,
          location: property.location,
          description: property.description,
          imageUrl: property.imageUrl,
          totalTokens: property.totalTokens,
          remainingTokens: property.remainingTokens,
          totalValue: property.totalValue,
          tokenPrice: property.tokenPrice,
          status: property.status,
          ownerId: property.ownerId,
          ownerName: property.ownerName,
          submittedAt: property.submittedAt,
          approvedAt: property.approvedAt,
          rejectedAt: property.rejectedAt,
          rejectionReason: property.rejectionReason,
          deedNumber: property.deedNumber,
          municipality: property.municipality,
          district: property.district,
          city: property.city,
        },
        ownership,
      }

      res.json(response)
    } catch (err) {
      next(err)
    }
  }
)

// ---------------------------------------------------------------------------
// POST /api/regulator/properties/:id/approve
// Regulatory approval (no token minting here)
// ---------------------------------------------------------------------------
regulatorRouter.post(
  '/properties/:id/approve',
  ...regulatorOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      if (!id) {
        return res.status(400).json({ error: 'invalid_property_id' })
      }

      const property = await prisma.property.findUnique({ where: { id } })
      if (!property) {
        return res.status(404).json({ error: 'property_not_found' })
      }

      if (property.status === 'APPROVED') {
        return res.status(400).json({ error: 'property_already_approved' })
      }

      const updated = await prisma.property.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
        },
      })

      // NOTE: We intentionally do NOT call Fabric or mint tokens here.
      // Only dedicated admin / payment flows handle token minting.

      res.json({
        success: true,
        message: 'Property approved by regulator',
        property: updated,
      })
    } catch (err) {
      next(err)
    }
  }
)

// ---------------------------------------------------------------------------
// POST /api/regulator/properties/:id/reject
// Regulatory rejection (no token minting)
// ---------------------------------------------------------------------------
regulatorRouter.post(
  '/properties/:id/reject',
  ...regulatorOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const { reason } = req.body || {}

      if (!id) {
        return res.status(400).json({ error: 'invalid_property_id' })
      }

      const property = await prisma.property.findUnique({ where: { id } })
      if (!property) {
        return res.status(404).json({ error: 'property_not_found' })
      }

      const updated = await prisma.property.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: reason || 'Rejected by regulator',
        },
      })

      res.json({
        success: true,
        message: 'Property rejected by regulator',
        property: updated,
      })
    } catch (err) {
      next(err)
    }
  }
)

// ---------------------------------------------------------------------------
// GET /api/regulator/ledger
// Regulatory ledger view aggregating on-chain-related data
// ---------------------------------------------------------------------------
regulatorRouter.get(
  '/ledger',
  ...regulatorOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from, to, search } = req.query

      const where: any = {}
      if ((from && typeof from === 'string') || (to && typeof to === 'string')) {
        where.createdAt = {}
        if (from && typeof from === 'string') {
          where.createdAt.gte = new Date(from)
        }
        if (to && typeof to === 'string') {
          where.createdAt.lte = new Date(to)
        }
      }

      const properties = await prisma.property.findMany({
        where,
        include: {
          holdings: true,
          deeds: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      const events = await prisma.onChainEvent.findMany({
        orderBy: { createdAt: 'desc' },
      })

      const transactions = await prisma.transaction.findMany({
        where: { type: TransactionType.TOKEN_MINT },
        orderBy: { createdAt: 'desc' },
      })

      const ledger = properties
        .filter((p) => {
          if (!search || typeof search !== 'string') return true
          const needle = search.toLowerCase()
          return (
            p.title.toLowerCase().includes(needle) ||
            (p.deedNumber || '').toLowerCase().includes(needle) ||
            (p.ownerName || '').toLowerCase().includes(needle)
          )
        })
        .map((p) => {
          const totalSupply = p.totalTokens || 0
          const distributedTokens = totalSupply - (p.remainingTokens || 0)
          const investorsCount = p.holdings.length

          const lastEvent = events.find((e) => e.propertyId === p.id)
          const lastTxn = transactions.find(
            (t) => t.ref === p.id || (t.note && t.note.includes(p.id))
          )

          const lastOnChainEvent = lastEvent
            ? `${lastEvent.type} @ ${lastEvent.createdAt.toISOString()}`
            : lastTxn
            ? `TOKEN_MINT @ ${lastTxn.createdAt.toISOString()}`
            : null

          const lastUpdateCandidates = [
            p.updatedAt,
            p.approvedAt,
            p.rejectedAt,
            lastEvent?.createdAt,
            lastTxn?.createdAt,
          ]
            .filter(Boolean)
            .map((d) => (d as Date).getTime())

          const lastUpdateDate = lastUpdateCandidates.length
            ? new Date(Math.max(...lastUpdateCandidates)).toISOString()
            : p.createdAt.toISOString()

          return {
            propertyId: p.id,
            deedNumber: p.deedNumber,
            ownerName: p.ownerName,
            totalSupply,
            distributedTokens,
            investorsCount,
            lastOnChainEvent,
            lastUpdateDate,
          }
        })

      res.json(ledger)
    } catch (err) {
      next(err)
    }
  }
)

// ---------------------------------------------------------------------------
// GET /api/regulator/aml-alerts
// Minimal AML engine with a few heuristic rules
// ---------------------------------------------------------------------------
regulatorRouter.get(
  '/aml-alerts',
  ...regulatorOnly,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [properties, holdings, orders, transactions, users] = await Promise.all([
        prisma.property.findMany({
          select: { id: true, title: true, totalTokens: true },
        }),
        prisma.holding.findMany({
          include: { user: true, property: true },
        }),
        prisma.order.findMany({
          orderBy: { createdAt: 'asc' },
        }),
        prisma.transaction.findMany({
          orderBy: { createdAt: 'asc' },
        }),
        prisma.user.findMany({
          select: { id: true, email: true, createdAt: true },
        }),
      ])

      type Alert = {
        id: string
        type: string
        severity: 'high' | 'medium' | 'low'
        message: string
        userId?: string
        userEmail?: string
        propertyId?: string
        propertyTitle?: string
        createdAt: string
        details?: any
      }

      const high: Alert[] = []
      const medium: Alert[] = []
      const low: Alert[] = []

      const pushAlert = (alert: Alert) => {
        if (alert.severity === 'high') high.push(alert)
        else if (alert.severity === 'medium') medium.push(alert)
        else low.push(alert)
      }

      const propertyMap = new Map(properties.map((p) => [p.id, p]))
      const userMap = new Map(users.map((u) => [u.id, u]))

      // Rule 1: High-value single investor (> 15% of property)
      for (const h of holdings) {
        const prop = propertyMap.get(h.propertyId)
        if (!prop || !prop.totalTokens) continue
        const pct = (h.tokens / prop.totalTokens) * 100
        if (pct > 15) {
          pushAlert({
            id: `high-single-${h.id}`,
            type: 'HIGH_SINGLE_INVESTOR',
            severity: 'high',
            message: `Investor holds ${pct.toFixed(2)}% of property ${prop.title}`,
            userId: h.userId,
            userEmail: h.user.email,
            propertyId: h.propertyId,
            propertyTitle: h.property.title,
            createdAt: h.createdAt.toISOString(),
            details: { percentage: pct, tokens: h.tokens },
          })
        }
      }

      // Rule 2: Rapid purchases (< 60s between purchases for same user+property)
      const ordersByUserProp = new Map<string, typeof orders>()
      for (const o of orders) {
        const key = `${o.userId}:${o.propertyId}`
        if (!ordersByUserProp.has(key)) ordersByUserProp.set(key, [])
        ordersByUserProp.get(key)!.push(o)
      }

      for (const [, list] of ordersByUserProp.entries()) {
        list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        for (let i = 1; i < list.length; i++) {
          const prev = list[i - 1]
          const curr = list[i]
          const diffSec =
            (curr.createdAt.getTime() - prev.createdAt.getTime()) / 1000
          if (diffSec < 60) {
            const prop = propertyMap.get(curr.propertyId)
            const user = userMap.get(curr.userId)
            pushAlert({
              id: `rapid-${curr.id}`,
              type: 'RAPID_PURCHASES',
              severity: 'medium',
              message: `Multiple purchases within ${Math.round(
                diffSec
              )} seconds for the same property`,
              userId: curr.userId,
              userEmail: user?.email,
              propertyId: curr.propertyId,
              propertyTitle: prop?.title,
              createdAt: curr.createdAt.toISOString(),
              details: { previousOrderId: prev.id, currentOrderId: curr.id },
            })
          }
        }
      }

      // Rule 3 & 4: Suspicious transfers / large token movements
      for (const tx of transactions) {
        if (tx.type === TransactionType.TOKEN_TRANSFER) {
          // Large transfers
          if (tx.amount >= 1000) {
            const user = userMap.get(tx.userId)
            pushAlert({
              id: `transfer-${tx.id}`,
              type: 'SUSPICIOUS_TRANSFER',
              severity: 'medium',
              message: `Large token transfer of ${tx.amount} tokens detected`,
              userId: tx.userId,
              userEmail: user?.email,
              createdAt: tx.createdAt.toISOString(),
              details: { ref: tx.ref, note: tx.note },
            })
          }
        } else if (tx.type === TransactionType.TOKEN_MINT && tx.amount >= 0.2) {
          const user = userMap.get(tx.userId)
          pushAlert({
            id: `mint-${tx.id}`,
            type: 'LARGE_MINT',
            severity: tx.amount > 10000 ? 'high' : 'medium',
            message: `Large token mint of ${tx.amount} tokens recorded`,
            userId: tx.userId,
            userEmail: user?.email,
            createdAt: tx.createdAt.toISOString(),
            details: { ref: tx.ref, note: tx.note },
          })
        }
      }

      // Rule 5: New wallets transacting big values
      const NEW_USER_DAYS = 7
      const newUserCutoff = Date.now() - NEW_USER_DAYS * 24 * 60 * 60 * 1000

      for (const tx of transactions) {
        const user = userMap.get(tx.userId)
        if (!user) continue
        const isNew = user.createdAt.getTime() >= newUserCutoff
        if (isNew && tx.amount >= 5000) {
          pushAlert({
            id: `new-wallet-${tx.id}`,
            type: 'NEW_WALLET_LARGE_VALUE',
            severity: 'high',
            message: `New user with large token activity of ${tx.amount} tokens`,
            userId: tx.userId,
            userEmail: user.email,
            createdAt: tx.createdAt.toISOString(),
            details: { userCreatedAt: user.createdAt, ref: tx.ref },
          })
        }
      }

      res.json({ high, medium, low })
    } catch (err) {
      next(err)
    }
  }
)

export default regulatorRouter