import { Router, Request, Response, NextFunction } from 'express'
import { $Enums } from '@prisma/client'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import prisma from '../lib/prisma'
import { isFabricEnabled, submitMintTokens } from '../lib/fabric'
export const ordersRouter = Router()

function auth(required = true) {
  return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    const h = String(req.headers.authorization || '')
    const token = h.startsWith('Bearer ') ? h.slice(7) : ''
    if (!token) return required ? res.status(401).json({ error: 'unauthorized' }) : next()
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret')
      req.user = payload
      return next()
    } catch {
      return required ? res.status(401).json({ error: 'unauthorized' }) : next()
    }
  }
}

// POST /api/orders — create order for investor
ordersRouter.post('/api/orders', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    const userId = Number(req.user!.id)
    const { propertyId, tokens } = req.body || {}
    const pid = Number(propertyId)
    const qty = Number(tokens)
    if (!Number.isFinite(pid) || !Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: 'invalid_input' })

    const prop = await prisma.property.findUnique({ where: { id: pid } })
    if (!prop) return res.status(404).json({ error: 'property_not_found' })
    if (prop.remainingTokens < qty) return res.status(400).json({ error: 'insufficient_tokens' })

    const amount = (prop.tokenPrice || 0) * qty
    const order = await prisma.order.create({ data: { userId, propertyId: pid, tokens: qty, amount, status: $Enums.OrderStatus.PENDING } })
    return res.status(201).json({ id: order.id, amount: order.amount, status: order.status })
  } catch (e) {
    return res.status(500).json({ error: 'order_create_failed' })
  }
})

// POST /api/payments/confirm — confirm payment and issue tokens
ordersRouter.post('/api/payments/confirm', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    const oid = Number(req.body?.orderId)
    if (!Number.isFinite(oid)) return res.status(400).json({ error: 'invalid_orderId' })

    const order = await prisma.order.findUnique({ where: { id: oid }, include: { property: true } })
    if (!order) return res.status(404).json({ error: 'order_not_found' })
    if (order.status === $Enums.OrderStatus.ISSUED) return res.json({ ok: true })

    await prisma.$transaction(async tx => {
      // Calculate payment amount
      const amount = (order.property?.tokenPrice || 0) * (order.tokens || 0)

      // Ensure wallet exists and has sufficient balance
      const wallet = await tx.wallet.upsert({
        where: { userId: order.userId },
        update: {},
        create: { userId: order.userId },
      })
      if ((wallet.cashBalance || 0) < amount) {
        throw new Error('insufficient_balance')
      }

      // Mark order paid and debit wallet with a transaction record
      await tx.order.update({ where: { id: oid }, data: { status: $Enums.OrderStatus.PAID } })
      await tx.wallet.update({ where: { id: wallet.id }, data: { cashBalance: { decrement: amount } } })
      await tx.transaction.create({
        data: { userId: order.userId, type: $Enums.TransactionType.WITHDRAWAL, amount, ref: String(oid) },
      })

      // If Fabric is enabled, mint on-chain and capture txId
      let blockchainTxId: string | undefined
      if (isFabricEnabled()) {
        const out = await submitMintTokens({ propertyId: order.propertyId, userId: order.userId, tokens: order.tokens })
        blockchainTxId = out.txId
      }

      // Issue tokens off-chain: decrement property supply and credit holding
      await tx.property.update({ where: { id: order.propertyId }, data: { remainingTokens: { decrement: order.tokens } } })
      await tx.holding.upsert({
        where: { userId_propertyId: { userId: order.userId, propertyId: order.propertyId } },
        update: { tokens: { increment: order.tokens } },
        create: { userId: order.userId, propertyId: order.propertyId, tokens: order.tokens },
      })

      // Record on-chain mint as a Transaction if txId present
      if (blockchainTxId) {
        await tx.transaction.create({
          data: ({
            userId: order.userId,
            type: $Enums.TransactionType.TOKEN_MINT,
            amount: 0,
            ref: String(oid),
            blockchainTxId,
            note: 'Order minted on-chain',
          }) as any,
        })
      }

      // Certificate and finalize
      const code = crypto.randomUUID()
      await tx.certificate.create({ data: ({ code, userId: order.userId, propertyId: order.propertyId, orderId: order.id, blockchainTxId }) as any })
      await tx.order.update({ where: { id: oid }, data: { status: $Enums.OrderStatus.ISSUED } })
    })

    return res.json({ ok: true })
  } catch (e) {
    if (String((e as Error).message || '').includes('insufficient_balance')) {
      return res.status(400).json({ error: 'insufficient_balance' })
    }
    return res.status(500).json({ error: 'payment_confirm_failed' })
  }
})

export default ordersRouter
