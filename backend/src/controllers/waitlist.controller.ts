import { Router, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { prisma } from '../lib/prisma'
import { sendEmail, getAdminEmail } from '../lib/emailService'
import { auth } from '../middleware/auth'

export const waitlistRouter = Router()
export const waitingListAdminRouter = Router()

const MAX_CONTACT_LENGTH = 254
const MAX_AMOUNT_LENGTH = 32
const MAX_LANGUAGE_LENGTH = 10
const MAX_SOURCE_LENGTH = 64
const MAX_EXPORT_ROWS = 5000

const waitlistRegistrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'waitlist_rate_limit_exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
})

function normalizeContact(value: string): string {
  const trimmed = value.trim()
  if (trimmed.includes('@')) return trimmed.toLowerCase()
  return trimmed.replace(/[\s().-]+/g, '')
}

function resemblesEmailOrPhone(value: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  const phonePattern = /^\+?\d{7,15}$/
  return emailPattern.test(value) || phonePattern.test(value)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function requireAdmin(req: Request & { user?: any }, res: Response): boolean {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'admin_access_required' })
    return false
  }
  return true
}

function riyadhDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find(part => part.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

// Riyadh is UTC+03:00 year-round. Week boundaries follow the Saudi Sunday start.
export function getRiyadhPeriodStarts(now = new Date()) {
  const { year, month, day } = riyadhDateParts(now)
  const today = new Date(Date.UTC(year, month - 1, day) - 3 * 60 * 60 * 1000)
  const localDayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  const week = new Date(today.getTime() - localDayOfWeek * 24 * 60 * 60 * 1000)
  const monthStart = new Date(Date.UTC(year, month - 1, 1) - 3 * 60 * 60 * 1000)
  return { today, week, month: monthStart }
}

function buildWhere(query: Request['query']) {
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, MAX_CONTACT_LENGTH) : ''
  const source = typeof query.source === 'string' ? query.source.trim().slice(0, MAX_SOURCE_LENGTH) : ''
  const where: any = {}
  if (q) where.contact = { contains: q, mode: 'insensitive' }
  if (source) where.source = source
  return where
}

function csvCell(value: unknown): string {
  let text = String(value ?? '')
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

waitlistRouter.post('/', waitlistRegistrationLimiter, async (req: Request, res: Response) => {
  try {
    const { contact, amount = '', language = 'en', source = 'home' } = req.body

    if (!contact || typeof contact !== 'string' || contact.trim().length === 0) {
      return res.status(400).json({ error: 'contact_required' })
    }
    if (
      typeof amount !== 'string' ||
      typeof language !== 'string' ||
      typeof source !== 'string' ||
      contact.trim().length > MAX_CONTACT_LENGTH ||
      amount.trim().length > MAX_AMOUNT_LENGTH ||
      language.trim().length > MAX_LANGUAGE_LENGTH ||
      source.trim().length > MAX_SOURCE_LENGTH
    ) {
      return res.status(400).json({ error: 'invalid_waitlist_fields' })
    }

    const normalizedContact = normalizeContact(contact)
    if (!resemblesEmailOrPhone(normalizedContact)) {
      return res.status(400).json({ error: 'invalid_contact' })
    }
    const normalizedAmount = amount.trim()
    const normalizedLanguage = language.trim() || 'en'
    const normalizedSource = (source.trim() || 'home').toLowerCase()
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(normalizedSource)) {
      return res.status(400).json({ error: 'invalid_source' })
    }

    const lead = await prisma.waitlistLead.create({
      data: {
        contact: normalizedContact,
        amount: normalizedAmount,
        language: normalizedLanguage,
        source: normalizedSource,
      },
    })

    // Non-blocking admin notification — failure must not affect response
    const adminEmail = await getAdminEmail(prisma).catch(() => 'admin@alwsm.sa')
    const safeContact = escapeHtml(normalizedContact)
    const safeAmount = escapeHtml(normalizedAmount || '—')
    const safeLanguage = escapeHtml(normalizedLanguage)
    const safeSource = escapeHtml(normalizedSource)
    sendEmail({
      to: adminEmail,
      subject: `New waitlist sign-up — ${normalizedSource}`,
      html: `<p>New waitlist lead:</p><ul><li><b>Contact:</b> ${safeContact}</li><li><b>Amount:</b> ${safeAmount}</li><li><b>Language:</b> ${safeLanguage}</li><li><b>Source:</b> ${safeSource}</li><li><b>Time:</b> ${new Date().toISOString()}</li></ul>`,
      text: `New waitlist lead\nContact: ${normalizedContact}\nAmount: ${normalizedAmount || '—'}\nSource: ${normalizedSource}`,
    }).catch((err) => {
      console.error('⚠️ Waitlist email notification failed (non-blocking):', err?.message)
    })

    return res.status(201).json({ success: true, id: lead.id })
  } catch (e: any) {
    console.error('❌ Waitlist lead save failed:', e?.message)
    return res.status(500).json({ error: 'waitlist_save_failed' })
  }
})

waitingListAdminRouter.get('/export', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return

  try {
    const where = buildWhere(req.query)
    const rows = await prisma.waitlistLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_ROWS,
      select: {
        id: true,
        contact: true,
        amount: true,
        language: true,
        source: true,
        createdAt: true,
      },
    })
    const header = ['ID', 'Contact', 'Investment Range', 'Language', 'Source', 'Registered At']
    const csv = [
      header.map(csvCell).join(','),
      ...rows.map(row => [
        row.id,
        row.contact,
        row.amount,
        row.language,
        row.source,
        row.createdAt.toISOString(),
      ].map(csvCell).join(',')),
    ].join('\r\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="waiting-list-${new Date().toISOString().slice(0, 10)}.csv"`)
    res.setHeader('X-Export-Limit', String(MAX_EXPORT_ROWS))
    return res.status(200).send(`\uFEFF${csv}`)
  } catch (e: any) {
    console.error('❌ Waitlist export failed:', e?.message)
    return res.status(500).json({ error: 'failed_to_export_waiting_list' })
  }
})

waitingListAdminRouter.get('/', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return

  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const skip = (page - 1) * limit
    const where = buildWhere(req.query)
    const starts = getRiyadhPeriodStarts()

    const [total, today, week, month, filteredTotal, registrations, sourceRows] = await Promise.all([
      prisma.waitlistLead.count(),
      prisma.waitlistLead.count({ where: { createdAt: { gte: starts.today } } }),
      prisma.waitlistLead.count({ where: { createdAt: { gte: starts.week } } }),
      prisma.waitlistLead.count({ where: { createdAt: { gte: starts.month } } }),
      prisma.waitlistLead.count({ where }),
      prisma.waitlistLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          contact: true,
          amount: true,
          language: true,
          source: true,
          createdAt: true,
        },
      }),
      prisma.waitlistLead.findMany({
        distinct: ['source'],
        orderBy: { source: 'asc' },
        select: { source: true },
      }),
    ])

    return res.json({
      summary: { total, today, week, month },
      data: registrations,
      sources: sourceRows.map(row => row.source),
      pagination: {
        total: filteredTotal,
        page,
        limit,
        pages: Math.ceil(filteredTotal / limit),
      },
    })
  } catch (e: any) {
    console.error('❌ Failed to list waiting-list registrations:', e?.message)
    return res.status(500).json({ error: 'failed_to_list_waiting_list' })
  }
})
