import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import pkg from '@prisma/client'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'

dotenv.config()
const app = express()
const { PrismaClient, PropertyStatus, OrderStatus, Role, TransactionType } = pkg
const prisma = new PrismaClient()

app.use(express.json())
app.use(morgan('dev'))
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))

function signToken(user) {
  const payload = { id: user.id, email: user.email, role: user.role }
  return jwt.sign(payload, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' })
}

// Admin/Owner: mint tokens to an investor for a property (simulated issuance)
// Body: { userEmail?: string, userId?: number, tokens: number }
app.post('/api/properties/:id/mint', auth(true), requireRole([Role.ADMIN, Role.OWNER]), async (req, res) => {
  try {
    const pid = Number(req.params.id)
    const { userEmail, userId, tokens } = req.body || {}
    const qty = Number(tokens)
    if (!Number.isFinite(pid) || !Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: 'invalid input' })

    let targetUser = null
    if (userId) {
      targetUser = await prisma.user.findUnique({ where: { id: Number(userId) } })
    } else if (userEmail) {
      targetUser = await prisma.user.findUnique({ where: { email: String(userEmail).toLowerCase().trim() } })
    }
    if (!targetUser) return res.status(404).json({ error: 'target user not found' })

    const prop = await prisma.property.findUnique({ where: { id: pid } })
    if (!prop) return res.status(404).json({ error: 'property not found' })
    if (prop.remainingTokens < qty) return res.status(400).json({ error: 'insufficient remaining supply' })

    await prisma.$transaction(async tx => {
      await tx.property.update({ where: { id: pid }, data: { remainingTokens: { decrement: qty } } })
      await tx.holding.upsert({
        where: { userId_propertyId: { userId: targetUser.id, propertyId: pid } },
        update: { tokens: { increment: qty } },
        create: { userId: targetUser.id, propertyId: pid, tokens: qty },
      })
      await tx.transaction.create({ data: { userId: targetUser.id, type: TransactionType.TOKEN_MINT, amount: qty * (prop.tokenPrice || 0) } })
    })

    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'failed to mint' })
  }
})
}

function auth(required = false) {
  return (req, res, next) => {
    const h = req.headers.authorization || ''
    const token = h.startsWith('Bearer ') ? h.slice(7) : null
    if (!token) {
      if (required) return res.status(401).json({ error: 'unauthorized' })
      return next()
    }
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'devsecret')
      return next()
    } catch {
      if (required) return res.status(401).json({ error: 'unauthorized' })
      return next()
    }
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'forbidden' })
    next()
  }
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = (req.body?.email || '').toLowerCase().trim()
    if (!email) return res.status(400).json({ error: 'email required' })
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, role: Role.INVESTOR },
    })
    const token = signToken(user)
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } })
  } catch {
    res.status(500).json({ error: 'login failed' })
  }
})

app.get('/api/properties', async (_req, res) => {
  try {
    const list = await prisma.property.findMany({ orderBy: { id: 'asc' } })
    const mapped = list.map(p => ({
      id: p.id,
      title: p.title,
      monthlyYield: p.monthlyYield,
      tokensAvailable: p.remainingTokens,
      totalValue: p.totalValue,
      tokenPrice: p.tokenPrice,
      totalTokens: p.totalTokens,
      status: p.status,
    }))
    res.json(mapped)
  } catch (e) {
    res.status(500).json({ error: 'Failed to load properties' })
  }
})

app.get('/api/properties/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' })
  try {
    const p = await prisma.property.findUnique({ where: { id } })
    if (!p) return res.status(404).json({ error: 'Not found' })
    return res.json({
      id: p.id,
      title: p.title,
      monthlyYield: p.monthlyYield,
      tokensAvailable: p.remainingTokens,
      totalValue: p.totalValue,
      tokenPrice: p.tokenPrice,
      totalTokens: p.totalTokens,
      status: p.status,
    })
  } catch (e) {
    res.status(500).json({ error: 'Failed to load property' })
  }
})

app.post('/api/properties', async (req, res) => {
  try {
    const { title, totalValue, tokenPrice, totalTokens, monthlyYield, status } = req.body || {}
    if (!title || totalTokens == null) return res.status(400).json({ error: 'title and totalTokens are required' })
    const created = await prisma.property.create({
      data: {
        title,
        totalValue: Number(totalValue ?? 0),
        tokenPrice: Number(tokenPrice ?? 0),
        totalTokens: Number(totalTokens),
        remainingTokens: Number(totalTokens),
        monthlyYield: Number(monthlyYield ?? 0),
        status: status ?? PropertyStatus.DRAFT,
      },
    })
    return res.status(201).json({
      id: created.id,
      title: created.title,
      monthlyYield: created.monthlyYield,
      tokensAvailable: created.remainingTokens,
      totalValue: created.totalValue,
      tokenPrice: created.tokenPrice,
      totalTokens: created.totalTokens,
      status: created.status,
    })
  } catch (e) {
    res.status(500).json({ error: 'Failed to create property' })
  }
})

app.post('/api/orders', auth(true), async (req, res) => {
  try {
    const userId = req.user.id
    const { propertyId, tokens } = req.body || {}
    const pid = Number(propertyId)
    const qty = Number(tokens)
    if (!Number.isFinite(pid) || !Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: 'invalid input' })
    const prop = await prisma.property.findUnique({ where: { id: pid } })
    if (!prop) return res.status(404).json({ error: 'property not found' })
    if (prop.remainingTokens < qty) return res.status(400).json({ error: 'insufficient tokens' })
    const amount = (prop.tokenPrice || 0) * qty
    const order = await prisma.order.create({ data: { userId, propertyId: pid, tokens: qty, amount, status: OrderStatus.PENDING } })
    res.status(201).json({ id: order.id, amount: order.amount, status: order.status })
  } catch {
    res.status(500).json({ error: 'failed to create order' })
  }
})

app.post('/api/payments/confirm', auth(true), async (req, res) => {
  try {
    const { orderId } = req.body || {}
    const oid = Number(orderId)
    if (!Number.isFinite(oid)) return res.status(400).json({ error: 'invalid orderId' })
    const order = await prisma.order.findUnique({ where: { id: oid }, include: { property: true } })
    if (!order) return res.status(404).json({ error: 'order not found' })
    if (order.status === OrderStatus.ISSUED) return res.json({ ok: true })
    await prisma.$transaction(async tx => {
      await tx.order.update({ where: { id: oid }, data: { status: OrderStatus.PAID } })
      await tx.property.update({ where: { id: order.propertyId }, data: { remainingTokens: { decrement: order.tokens } } })
      const holding = await tx.holding.upsert({
        where: { userId_propertyId: { userId: order.userId, propertyId: order.propertyId } },
        update: { tokens: { increment: order.tokens } },
        create: { userId: order.userId, propertyId: order.propertyId, tokens: order.tokens },
      })
      const code = crypto.randomUUID()
      await tx.certificate.create({ data: { code, userId: order.userId, propertyId: order.propertyId, orderId: order.id } })
      await tx.order.update({ where: { id: oid }, data: { status: OrderStatus.ISSUED } })
      return holding
    })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'failed to confirm payment' })
  }
})

app.get('/api/holdings/me', auth(true), async (req, res) => {
  try {
    const rows = await prisma.holding.findMany({ where: { userId: req.user.id }, include: { property: true } })
    const data = rows.map(r => ({ propertyId: r.propertyId, title: r.property.title, tokens: r.tokens }))
    res.json(data)
  } catch {
    res.status(500).json({ error: 'failed to load holdings' })
  }
})

// Wallet summary
app.get('/api/wallet', auth(true), async (req, res) => {
  try {
    // ensure wallet exists for user
    let wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } })
    if (!wallet) {
      wallet = await prisma.wallet.create({ data: { userId: req.user.id } })
    }
    const holdings = await prisma.holding.findMany({ where: { userId: req.user.id }, include: { property: true } })
    const mapped = holdings.map(h => ({
      propertyId: h.propertyId,
      title: h.property.title,
      tokens: h.tokens,
      tokenPrice: h.property.tokenPrice,
      value: (h.tokens || 0) * (h.property.tokenPrice || 0),
    }))
    const investedValue = mapped.reduce((s, x) => s + x.value, 0)
    const cashBalance = wallet.cashBalance || 0
    const totalValue = cashBalance + investedValue
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    res.json({
      walletId: wallet.walletId,
      cashBalance,
      investedValue,
      totalValue,
      holdings: mapped,
      transactions,
    })
  } catch (e) {
    res.status(500).json({ error: 'failed to load wallet' })
  }
})

// Deposit (simulated)
app.post('/api/wallet/deposit', auth(true), async (req, res) => {
  try {
    const amount = Number(req.body?.amount)
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'invalid amount' })
    const result = await prisma.$transaction(async tx => {
      const wallet = await tx.wallet.upsert({
        where: { userId: req.user.id },
        update: {},
        create: { userId: req.user.id },
      })
      const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { cashBalance: { increment: amount } } })
      await tx.transaction.create({ data: { userId: req.user.id, type: TransactionType.DEPOSIT, amount, ref: crypto.randomUUID() } })
      return updated
    })
    res.json({ cashBalance: result.cashBalance })
  } catch (e) {
    res.status(500).json({ error: 'failed to deposit' })
  }
})

// Withdraw (simulated)
app.post('/api/wallet/withdraw', auth(true), async (req, res) => {
  try {
    const amount = Number(req.body?.amount)
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'invalid amount' })
    const result = await prisma.$transaction(async tx => {
      const wallet = await tx.wallet.upsert({
        where: { userId: req.user.id },
        update: {},
        create: { userId: req.user.id },
      })
      if ((wallet.cashBalance || 0) < amount) throw new Error('insufficient')
      const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { cashBalance: { decrement: amount } } })
      await tx.transaction.create({ data: { userId: req.user.id, type: TransactionType.WITHDRAWAL, amount, ref: crypto.randomUUID() } })
      return updated
    })
    res.json({ cashBalance: result.cashBalance })
  } catch (e) {
    if (String(e.message).includes('insufficient')) return res.status(400).json({ error: 'insufficient balance' })
    res.status(500).json({ error: 'failed to withdraw' })
  }
})

const port = process.env.PORT || 5000
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
