import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { requireRole } from '../middleware/roles'

export const platformPnlRouter = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getPlatformFeeRate(): Promise<number> {
  const setting = await prisma.settings.findUnique({ where: { key: 'platformFee' } })
  return parseFloat(setting?.value ?? '5')
}

function startOfDay(d: Date): Date {
  const r = new Date(d); r.setUTCHours(0, 0, 0, 0); return r
}
function endOfDay(d: Date): Date {
  const r = new Date(d); r.setUTCHours(23, 59, 59, 999); return r
}

function groupByMonth<T extends { date: Date | string }>(
  items: T[], getValue: (item: T) => number
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const item of items) {
    const key = new Date(item.date).toISOString().slice(0, 7) // YYYY-MM
    result[key] = (result[key] ?? 0) + getValue(item)
  }
  return result
}

function last12Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(d.toISOString().slice(0, 7))
  }
  return months
}

// ─── P&L Builder ──────────────────────────────────────────────────────────────

async function buildPnL(opts: {
  from?: Date
  to?: Date
  propertyId?: string
  revenueType?: string
  expenseCategory?: string
}) {
  const { from, to, propertyId, revenueType, expenseCategory } = opts

  const feeRate = await getPlatformFeeRate()

  const dateFilter = {
    ...(from && { gte: startOfDay(from) }),
    ...(to && { lte: endOfDay(to) }),
  }

  // ── 1. Orders → derived investment fee revenue ─────────────────────────────
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ['PAID', 'ISSUED'] },
      ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {}),
      ...(propertyId ? { propertyId } : {}),
    },
    include: {
      property: { select: { id: true, title: true, ownerId: true } },
      user: { select: { id: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const derivedInvestmentFees = orders.reduce((s, o) => s + o.amount * (feeRate / 100), 0)

  // ── 2. Manual revenue entries ──────────────────────────────────────────────
  const manualRevWhere: any = {}
  if (from || to) manualRevWhere.date = dateFilter
  if (propertyId) manualRevWhere.propertyId = propertyId
  if (revenueType && revenueType !== 'INVESTMENT_FEE') manualRevWhere.type = revenueType as any

  const manualRevenues = await prisma.platformRevenue.findMany({
    where: manualRevWhere,
    orderBy: { date: 'desc' },
  })

  const sum = (type: string) =>
    manualRevenues.filter((r: any) => r.type === type).reduce((s: number, r: any) => s + r.amount, 0)

  const ownerFees       = sum('OWNER_FEE')
  const managementFees  = sum('MANAGEMENT_FEE')
  const subscriptions   = sum('SUBSCRIPTION')
  const otherRevenue    = sum('OTHER')

  // Filter for display when revenueType filter is active
  const investmentFeeRevenue = revenueType && revenueType !== 'ALL' && revenueType !== 'INVESTMENT_FEE'
    ? 0
    : derivedInvestmentFees

  const totalRevenue = investmentFeeRevenue + ownerFees + managementFees + subscriptions + otherRevenue

  // Revenue breakdown
  const revBreakdown = [
    { type: 'INVESTMENT_FEE', label: 'Investment Transaction Fees', labelAr: 'رسوم عمليات الاستثمار', amount: investmentFeeRevenue },
    { type: 'OWNER_FEE',      label: 'Property Owner Fees',        labelAr: 'رسوم الملاك',            amount: ownerFees },
    { type: 'MANAGEMENT_FEE', label: 'Platform Management Fees',   labelAr: 'رسوم إدارة المنصة',      amount: managementFees },
    { type: 'SUBSCRIPTION',   label: 'Subscription Revenue',       labelAr: 'إيرادات الاشتراكات',     amount: subscriptions },
    { type: 'OTHER',          label: 'Other Revenue',              labelAr: 'إيرادات أخرى',            amount: otherRevenue },
  ].map(item => ({
    ...item,
    pct: totalRevenue > 0 ? +((item.amount / totalRevenue) * 100).toFixed(2) : 0,
  }))

  // ── 3. Expenses ────────────────────────────────────────────────────────────
  const expWhere: any = {}
  if (from || to) expWhere.date = dateFilter
  if (expenseCategory && expenseCategory !== 'ALL') expWhere.category = expenseCategory as any

  const expenses = await prisma.platformExpense.findMany({
    where: expWhere,
    orderBy: { date: 'desc' },
  })

  const expSum = (cat: string) =>
    expenses.filter((e: any) => e.category === cat).reduce((s: number, e: any) => s + e.amount, 0)

  const expByCategory = {
    TECHNOLOGY:           expSum('TECHNOLOGY'),
    OPERATIONS:           expSum('OPERATIONS'),
    MARKETING:            expSum('MARKETING'),
    PAYROLL:              expSum('PAYROLL'),
    PROFESSIONAL_SERVICES: expSum('PROFESSIONAL_SERVICES'),
    OTHER:                expSum('OTHER'),
  }
  const totalExpenses = (expenses as any[]).reduce((s: number, e: any) => s + e.amount, 0)

  const expBreakdown = [
    { category: 'TECHNOLOGY',            label: 'Technology',            labelAr: 'التقنية',             amount: expByCategory.TECHNOLOGY },
    { category: 'OPERATIONS',            label: 'Operations',            labelAr: 'العمليات',            amount: expByCategory.OPERATIONS },
    { category: 'MARKETING',             label: 'Marketing',             labelAr: 'التسويق',             amount: expByCategory.MARKETING },
    { category: 'PAYROLL',               label: 'Payroll',               labelAr: 'الرواتب',             amount: expByCategory.PAYROLL },
    { category: 'PROFESSIONAL_SERVICES', label: 'Professional Services', labelAr: 'الخدمات المهنية',    amount: expByCategory.PROFESSIONAL_SERVICES },
    { category: 'OTHER',                 label: 'Other Expenses',        labelAr: 'مصروفات أخرى',       amount: expByCategory.OTHER },
  ].map(item => ({
    ...item,
    pct: totalExpenses > 0 ? +((item.amount / totalExpenses) * 100).toFixed(2) : 0,
  }))

  const netProfit      = +(totalRevenue - totalExpenses).toFixed(2)
  const profitMarginPct = totalRevenue > 0 ? +((netProfit / totalRevenue) * 100).toFixed(2) : 0

  // ── 4. Active investors & properties ─────────────────────────────────────
  const activeInvestors  = new Set(orders.map((o: any) => o.userId)).size
  const activeProperties = new Set(orders.map((o: any) => o.propertyId)).size

  // ── 5. Monthly trend (last 12 months) ─────────────────────────────────────
  const months = last12Months()

  // Group order fees by month
  const orderFeeByMonth: Record<string, number> = {}
  for (const o of orders as any[]) {
    const key = new Date(o.createdAt).toISOString().slice(0, 7)
    orderFeeByMonth[key] = (orderFeeByMonth[key] ?? 0) + o.amount * (feeRate / 100)
  }

  // Group manual revenues by month
  const manualRevByMonth: Record<string, number> = {}
  for (const r of manualRevenues as any[]) {
    const key = new Date(r.date).toISOString().slice(0, 7)
    manualRevByMonth[key] = (manualRevByMonth[key] ?? 0) + r.amount
  }

  // Group expenses by month
  const expByMonth: Record<string, number> = {}
  for (const e of expenses as any[]) {
    const key = new Date(e.date).toISOString().slice(0, 7)
    expByMonth[key] = (expByMonth[key] ?? 0) + e.amount
  }

  const monthlyTrend = months.map(month => {
    const revenue = +((orderFeeByMonth[month] ?? 0) + (manualRevByMonth[month] ?? 0)).toFixed(2)
    const exp     = +(expByMonth[month] ?? 0).toFixed(2)
    return { month, revenue, expenses: exp, netProfit: +(revenue - exp).toFixed(2) }
  })

  // ── 6. Property profitability ─────────────────────────────────────────────
  const propMap = new Map<string, { id: string; title: string; orders: number; investors: Set<string>; revenue: number }>()
  for (const o of orders as any[]) {
    const pid = o.propertyId
    if (!propMap.has(pid)) {
      propMap.set(pid, { id: pid, title: o.property?.title ?? pid, orders: 0, investors: new Set(), revenue: 0 })
    }
    const entry = propMap.get(pid)!
    entry.orders += 1
    entry.investors.add(o.userId)
    entry.revenue += o.amount * (feeRate / 100)
  }
  // Add manual revenue linked to properties
  for (const r of manualRevenues as any[]) {
    if (r.propertyId && propMap.has(r.propertyId)) {
      propMap.get(r.propertyId)!.revenue += r.amount
    }
  }

  const propertyProfitability = [...propMap.values()].map(p => ({
    propertyId:      p.id,
    propertyTitle:   p.title,
    orders:          p.orders,
    investorCount:   p.investors.size,
    revenue:         +p.revenue.toFixed(2),
    pctOfRevenue:    totalRevenue > 0 ? +((p.revenue / totalRevenue) * 100).toFixed(2) : 0,
    netContribution: +p.revenue.toFixed(2), // no direct cost allocation per property
  }))

  // ── 7. Cash flow (platform only, not investor/owner flows) ─────────────────
  // Inflows = platform fee revenues collected (same as totalRevenue)
  // Outflows = total expenses
  const cashInflows  = totalRevenue
  const cashOutflows = totalExpenses
  const closingBalance = +(cashInflows - cashOutflows).toFixed(2)

  // ── 8. Reconciliation ─────────────────────────────────────────────────────
  const revenueSourcesTotal = +(investmentFeeRevenue + ownerFees + managementFees + subscriptions + otherRevenue).toFixed(2)
  const expenseSourcesTotal = +(Object.values(expByCategory).reduce((s, v) => s + v, 0)).toFixed(2)

  return {
    generatedAt: new Date(),
    period: { from: from ?? null, to: to ?? null },
    feeRate,
    summary: {
      totalRevenue:      +totalRevenue.toFixed(2),
      totalExpenses:     +totalExpenses.toFixed(2),
      netProfit,
      profitMarginPct,
      activeInvestors,
      activeProperties,
    },
    revenue: {
      investmentFees:   +investmentFeeRevenue.toFixed(2),
      ownerFees:        +ownerFees.toFixed(2),
      managementFees:   +managementFees.toFixed(2),
      subscriptions:    +subscriptions.toFixed(2),
      otherRevenue:     +otherRevenue.toFixed(2),
      total:            +totalRevenue.toFixed(2),
      breakdown:        revBreakdown,
      manualEntries:    manualRevenues,
    },
    expenses: {
      technology:           +expByCategory.TECHNOLOGY.toFixed(2),
      operations:           +expByCategory.OPERATIONS.toFixed(2),
      marketing:            +expByCategory.MARKETING.toFixed(2),
      payroll:              +expByCategory.PAYROLL.toFixed(2),
      professionalServices: +expByCategory.PROFESSIONAL_SERVICES.toFixed(2),
      otherExpenses:        +expByCategory.OTHER.toFixed(2),
      total:                +totalExpenses.toFixed(2),
      breakdown:            expBreakdown,
      entries:              expenses,
    },
    monthlyTrend,
    propertyProfitability,
    cashFlow: {
      openingBalance: 0, // not derivable from current schema without historical state
      inflows:        +cashInflows.toFixed(2),
      outflows:       +cashOutflows.toFixed(2),
      closingBalance,
    },
    reconciliation: {
      revenueSourcesTotal,
      revenueKpi:         +totalRevenue.toFixed(2),
      expenseSourcesTotal,
      expenseKpi:         +totalExpenses.toFixed(2),
      netProfit,
      revenueBalanced:    Math.abs(revenueSourcesTotal - totalRevenue) < 0.01,
      expenseBalanced:    Math.abs(expenseSourcesTotal - totalExpenses) < 0.01,
      fullyBalanced:      Math.abs(revenueSourcesTotal - totalRevenue) < 0.01 && Math.abs(expenseSourcesTotal - totalExpenses) < 0.01,
    },
  }
}

// ─── GET /api/admin/platform-pnl ──────────────────────────────────────────────

platformPnlRouter.get(
  '/admin/platform-pnl',
  auth(true),
  requireRole(['ADMIN']),
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const { from: fromStr, to: toStr, propertyId, revenueType, expenseCategory } = req.query as Record<string, string>
      const from = fromStr ? new Date(fromStr) : undefined
      const to   = toStr   ? new Date(toStr)   : undefined
      const data = await buildPnL({ from, to, propertyId, revenueType, expenseCategory })
      return res.json({ success: true, data })
    } catch (e: any) {
      console.error('❌ platform-pnl GET:', e?.message)
      return res.status(500).json({ error: 'failed_to_build_pnl' })
    }
  }
)

// ─── POST /api/admin/platform-pnl/revenue ─────────────────────────────────────

platformPnlRouter.post(
  '/admin/platform-pnl/revenue',
  auth(true),
  requireRole(['ADMIN']),
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const { type, description, amount, propertyId, userId, date, notes } = req.body
      if (!type || !description || !amount || !date) {
        return res.status(400).json({ error: 'missing_required_fields', message: 'type, description, amount, date are required' })
      }
      const entry = await prisma.platformRevenue.create({
        data: {
          type,
          description,
          amount: parseFloat(amount),
          propertyId: propertyId || null,
          userId:     userId     || null,
          date:       new Date(date),
          createdBy:  req.user?.userId ?? null,
          notes:      notes || null,
        },
      })
      return res.status(201).json({ success: true, data: entry })
    } catch (e: any) {
      console.error('❌ platform-pnl POST revenue:', e?.message)
      return res.status(500).json({ error: 'failed_to_create_revenue_entry' })
    }
  }
)

// ─── POST /api/admin/platform-pnl/expense ─────────────────────────────────────

platformPnlRouter.post(
  '/admin/platform-pnl/expense',
  auth(true),
  requireRole(['ADMIN']),
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const { category, description, amount, vendor, date, notes, invoiceRef } = req.body
      if (!category || !description || !amount || !date) {
        return res.status(400).json({ error: 'missing_required_fields', message: 'category, description, amount, date are required' })
      }
      const entry = await prisma.platformExpense.create({
        data: {
          category,
          description,
          amount:     parseFloat(amount),
          vendor:     vendor     || null,
          date:       new Date(date),
          createdBy:  req.user?.userId ?? null,
          notes:      notes      || null,
          invoiceRef: invoiceRef || null,
        },
      })
      return res.status(201).json({ success: true, data: entry })
    } catch (e: any) {
      console.error('❌ platform-pnl POST expense:', e?.message)
      return res.status(500).json({ error: 'failed_to_create_expense_entry' })
    }
  }
)

// ─── GET /api/admin/platform-pnl/revenues ─────────────────────────────────────

platformPnlRouter.get(
  '/admin/platform-pnl/revenues',
  auth(true),
  requireRole(['ADMIN']),
  async (_req: Request, res: Response) => {
    try {
      const revenues = await prisma.platformRevenue.findMany({ orderBy: { date: 'desc' } })
      return res.json({ success: true, data: revenues })
    } catch (e: any) {
      console.error('❌ platform-pnl GET revenues:', e?.message)
      return res.status(500).json({ error: 'failed_to_fetch_revenues' })
    }
  }
)

// ─── GET /api/admin/platform-pnl/expenses ─────────────────────────────────────

platformPnlRouter.get(
  '/admin/platform-pnl/expenses',
  auth(true),
  requireRole(['ADMIN']),
  async (_req: Request, res: Response) => {
    try {
      const expenses = await prisma.platformExpense.findMany({ orderBy: { date: 'desc' } })
      return res.json({ success: true, data: expenses })
    } catch (e: any) {
      console.error('❌ platform-pnl GET expenses:', e?.message)
      return res.status(500).json({ error: 'failed_to_fetch_expenses' })
    }
  }
)

// ─── DELETE /api/admin/platform-pnl/revenue/:id ───────────────────────────────

platformPnlRouter.delete(
  '/admin/platform-pnl/revenue/:id',
  auth(true),
  requireRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      await prisma.platformRevenue.delete({ where: { id: req.params.id } })
      return res.json({ success: true })
    } catch (e: any) {
      console.error('❌ platform-pnl DELETE revenue:', e?.message)
      return res.status(500).json({ error: 'failed_to_delete_revenue_entry' })
    }
  }
)

// ─── DELETE /api/admin/platform-pnl/expense/:id ───────────────────────────────

platformPnlRouter.delete(
  '/admin/platform-pnl/expense/:id',
  auth(true),
  requireRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      await prisma.platformExpense.delete({ where: { id: req.params.id } })
      return res.json({ success: true })
    } catch (e: any) {
      console.error('❌ platform-pnl DELETE expense:', e?.message)
      return res.status(500).json({ error: 'failed_to_delete_expense_entry' })
    }
  }
)
