import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { getFileUrl } from '../middleware/roles'
import { scoreLead } from '../lib/propertyLeadScoring'

// ============================================================================
// PropertyLead API — preliminary owner opportunity submissions
// ----------------------------------------------------------------------------
// Two routers:
//   propertyLeadRouter       →  /api/property-leads         (OWNER)
//   propertyLeadAdminRouter  →  /api/admin/property-leads   (ADMIN)
//
// A lead is intentionally decoupled from the Property model / tokenization.
// This controller never creates a Property and never calls property submit
// logic. Internal scores are ADMIN-only and are never returned to owners.
// ============================================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ALLOWED_STATUS_UPDATES = ['UNDER_REVIEW', 'NEEDS_INFO', 'ACCEPTED', 'REJECTED'] as const

// Owner-facing projection — exposes review feedback (adminStatus, reviewNotes,
// reviewedAt) so owners see the team's decision, but deliberately EXCLUDES the
// internal-only fields (qualificationScore, tokenizationSuitabilityScore,
// internalRecommendation, reviewedBy, ownerId, tenantId).
const OWNER_SAFE_SELECT = {
  id: true,
  applicantType: true, fullName: true, companyName: true, phone: true, email: true,
  propertyName: true, propertyType: true, city: true, district: true, googleMapsUrl: true,
  landArea: true, buildingArea: true, buildingYear: true, requestedPrice: true, isPriceNegotiable: true,
  isLeased: true, annualRent: true, leaseExpiryDate: true,
  hasMortgage: true, hasOwnershipPartner: true, hasLegalDispute: true, noLegalIssues: true,
  shortDescription: true, imageUrls: true, deedImageUrl: true,
  dataAccuracyConfirmed: true, reviewConsentConfirmed: true, noAcceptanceGuaranteeConfirmed: true,
  status: true, adminStatus: true, reviewNotes: true,
  createdAt: true, updatedAt: true, reviewedAt: true,
} as const

// Admin list projection — includes internal scores.
const ADMIN_LIST_SELECT = {
  id: true,
  applicantType: true, fullName: true, companyName: true, phone: true, email: true,
  propertyName: true, propertyType: true, city: true, district: true,
  requestedPrice: true, isLeased: true,
  hasMortgage: true, hasOwnershipPartner: true, hasLegalDispute: true, noLegalIssues: true,
  qualificationScore: true, tokenizationSuitabilityScore: true, internalRecommendation: true,
  status: true, adminStatus: true, createdAt: true,
} as const

// ─── coercion helpers ───────────────────────────────────────────────────────
function toBool(v: unknown): boolean | undefined {
  if (v === true || v === 'true' || v === 1 || v === '1') return true
  if (v === false || v === 'false' || v === 0 || v === '0') return false
  return undefined
}
function toNum(v: unknown): number | undefined {
  if (v === '' || v === null || v === undefined) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN // NaN signals "provided but invalid"
}
function toStr(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  const s = String(v).trim()
  return s === '' ? undefined : s
}

// ─── role guards (CASE-INSENSITIVE — real JWTs may carry OWNER/owner/etc.) ────
function normalizedRole(req: Request & { user?: any }): string {
  return String(req.user?.role || '').toUpperCase()
}
// Safe production-debug log: endpoint + userId + normalized role + decision only.
// Never logs tokens or secrets. Emitted on DENY to surface unexpected role values.
function logDeny(req: Request & { user?: any }, role: string, need: string): void {
  console.warn(`[propertyLead] DENY ${req.method} ${req.originalUrl} user=${req.user?.userId || '-'} role=${role || '-'} need=${need}`)
}
function requireOwner(req: Request & { user?: any }, res: Response): boolean {
  const role = normalizedRole(req)
  if (role !== 'OWNER') {
    logDeny(req, role, 'OWNER')
    res.status(403).json({ error: 'owner_access_required' })
    return false
  }
  return true
}
function requireAdmin(req: Request & { user?: any }, res: Response): boolean {
  const role = normalizedRole(req)
  if (role !== 'ADMIN') {
    logDeny(req, role, 'ADMIN')
    res.status(403).json({ error: 'admin_access_required' })
    return false
  }
  return true
}

// ─── file upload (lead property images + deed) ──────────────────────────────
// LOCAL to this controller so the legacy /api/properties/upload-document is not
// modified. Accepts image or PDF (deed), 10 MB max, stored in the same
// uploads/properties dir served via getFileUrl().
const LEAD_UPLOAD_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
const leadUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, 'uploads/properties/'),
    filename: (_req, file, cb) => {
      const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`
      cb(null, `lead-${suffix}${path.extname(file.originalname)}`)
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (LEAD_UPLOAD_MIMES.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Invalid file type'))
  },
})

// ════════════════════════════════════════════════════════════════════════════
// OWNER ROUTER  →  /api/property-leads
// ════════════════════════════════════════════════════════════════════════════
export const propertyLeadRouter = Router()

// POST /api/property-leads — owner submits a preliminary opportunity
propertyLeadRouter.post('/', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireOwner(req, res)) return
  try {
    const b = req.body || {}

    // --- required string fields ---
    const requiredStr = [
      'applicantType', 'fullName', 'phone',
      'propertyName', 'propertyType', 'city', 'district',
      'googleMapsUrl', 'shortDescription',
    ]
    const missing = requiredStr.filter(k => !toStr(b[k]))

    // --- requestedPrice (required, positive) ---
    const requestedPrice = toNum(b.requestedPrice)
    if (requestedPrice === undefined) missing.push('requestedPrice')

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'missing_required_fields',
        message: 'يرجى تعبئة جميع الحقول المطلوبة.',
        fields: missing,
      })
    }
    if (!Number.isFinite(requestedPrice as number) || (requestedPrice as number) <= 0) {
      return res.status(400).json({ error: 'invalid_requested_price', message: 'السعر المطلوب يجب أن يكون رقماً موجباً.', field: 'requestedPrice' })
    }

    // --- declarations (all three must be true) ---
    if (toBool(b.dataAccuracyConfirmed) !== true ||
        toBool(b.reviewConsentConfirmed) !== true ||
        toBool(b.noAcceptanceGuaranteeConfirmed) !== true) {
      return res.status(400).json({
        error: 'declarations_required',
        message: 'يجب الموافقة على جميع الإقرارات قبل الإرسال.',
      })
    }

    // --- optional field validation ---
    const email = toStr(b.email)
    if (email && !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'invalid_email', message: 'صيغة البريد الإلكتروني غير صحيحة.', field: 'email' })
    }

    const annualRent = toNum(b.annualRent)
    if (annualRent !== undefined && (!Number.isFinite(annualRent) || annualRent <= 0)) {
      return res.status(400).json({ error: 'invalid_annual_rent', message: 'قيمة الإيجار السنوي يجب أن تكون رقماً موجباً.', field: 'annualRent' })
    }

    let imageUrls: string[] | undefined
    if (b.imageUrls !== undefined && b.imageUrls !== null) {
      if (!Array.isArray(b.imageUrls)) {
        return res.status(400).json({ error: 'invalid_images', message: 'صيغة الصور غير صحيحة.', field: 'imageUrls' })
      }
      if (b.imageUrls.length > 5) {
        return res.status(400).json({ error: 'too_many_images', message: 'الحد الأقصى 5 صور.', field: 'imageUrls' })
      }
      imageUrls = b.imageUrls.map((u: unknown) => String(u)).filter(Boolean)
    }

    const landArea     = toNum(b.landArea)
    const buildingArea = toNum(b.buildingArea)
    const buildingYear = toNum(b.buildingYear)

    // Reject numeric fields that were provided but unparseable
    for (const [k, v] of Object.entries({ landArea, buildingArea, buildingYear })) {
      if (typeof v === 'number' && Number.isNaN(v)) {
        return res.status(400).json({ error: 'invalid_number', message: `قيمة غير صحيحة للحقل ${k}.`, field: k })
      }
    }

    let leaseExpiryDate: Date | undefined
    if (toStr(b.leaseExpiryDate)) {
      const d = new Date(b.leaseExpiryDate)
      if (!Number.isNaN(d.getTime())) leaseExpiryDate = d
    }

    // --- assemble normalized lead data ---
    const leadInput = {
      applicantType: toStr(b.applicantType),
      fullName:      toStr(b.fullName),
      companyName:   toStr(b.companyName),
      phone:         toStr(b.phone),
      email,
      propertyName:  toStr(b.propertyName),
      propertyType:  toStr(b.propertyType),
      city:          toStr(b.city),
      district:      toStr(b.district),
      googleMapsUrl: toStr(b.googleMapsUrl),
      landArea:      landArea ?? null,
      buildingArea:  buildingArea ?? null,
      buildingYear:  buildingYear != null ? Math.trunc(buildingYear as number) : null,
      requestedPrice: requestedPrice as number,
      isPriceNegotiable:   toBool(b.isPriceNegotiable) ?? null,
      isLeased:            toBool(b.isLeased) ?? null,
      annualRent:          annualRent ?? null,
      leaseExpiryDate:     leaseExpiryDate ?? null,
      hasMortgage:         toBool(b.hasMortgage) ?? null,
      hasOwnershipPartner: toBool(b.hasOwnershipPartner) ?? null,
      hasLegalDispute:     toBool(b.hasLegalDispute) ?? null,
      noLegalIssues:       toBool(b.noLegalIssues) ?? null,
      shortDescription:    toStr(b.shortDescription),
      imageUrls:           imageUrls ?? undefined,
      deedImageUrl:        toStr(b.deedImageUrl) ?? null,
    }

    // --- internal scoring (admin-only) ---
    const scores = scoreLead(leadInput)

    const lead = await prisma.propertyLead.create({
      data: {
        ...leadInput,
        dataAccuracyConfirmed: true,
        reviewConsentConfirmed: true,
        noAcceptanceGuaranteeConfirmed: true,
        qualificationScore: scores.qualificationScore,
        tokenizationSuitabilityScore: scores.tokenizationSuitabilityScore,
        internalRecommendation: scores.internalRecommendation,
        status: 'NEW',
        adminStatus: 'NEW',
        ownerId: req.user!.userId,
        tenantId: req.user!.tenantId,
      },
      select: { id: true, status: true, createdAt: true },
    })

    // Owner-safe response — no scores.
    return res.status(201).json({
      id: lead.id,
      status: lead.status,
      createdAt: lead.createdAt,
      message: 'تم استلام طلب التقديم المبدئي للفرصة العقارية. سيراجعه فريق الوسم ويتواصل معك.',
    })
  } catch (e: any) {
    console.error('❌ PropertyLead create error:', e)
    return res.status(500).json({ error: 'property_lead_create_failed' })
  }
})

// GET /api/property-leads/mine — owner sees ONLY their own leads
// POST /api/property-leads/upload — OWNER/ADMIN upload one lead image or deed file.
// Returns { fileUrl }. Decoupled from the legacy /api/properties/upload-document
// (which sits behind a different edge path). Never creates a Property.
propertyLeadRouter.post(
  '/upload',
  auth(true),
  (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    const role = normalizedRole(req)
    if (role !== 'OWNER' && role !== 'ADMIN') {
      logDeny(req, role, 'OWNER|ADMIN')
      return res.status(403).json({
        error: 'upload_forbidden',
        message: 'ليست لديك صلاحية رفع هذا الملف. يرجى تسجيل الدخول كمالك أو التواصل مع الدعم.',
      })
    }
    next()
  },
  (req: Request, res: Response, next: NextFunction) => {
    leadUpload.single('file')(req, res, (err: any) => {
      if (!err) return next()
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'file_too_large', message: 'حجم الملف يتجاوز 10 ميجابايت.' })
      }
      if (String(err.message || '').includes('Invalid file type')) {
        return res.status(415).json({ error: 'unsupported_file_type', message: 'صيغة الملف غير مدعومة. المسموح: JPG أو PNG أو WEBP أو PDF.' })
      }
      return res.status(400).json({ error: 'upload_error', message: 'تعذّر رفع الملف. حاول مرة أخرى.' })
    })
  },
  (req: Request & { file?: any }, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'no_file', message: 'لم يتم استلام أي ملف.' })
    }
    return res.json({ fileUrl: getFileUrl(req.file.filename), fileName: req.file.originalname })
  }
)

propertyLeadRouter.get('/mine', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireOwner(req, res)) return
  try {
    const leads = await prisma.propertyLead.findMany({
      where: { ownerId: req.user!.userId, tenantId: req.user!.tenantId },
      orderBy: { createdAt: 'desc' },
      select: OWNER_SAFE_SELECT,
    })
    return res.json(leads)
  } catch (e: any) {
    console.error('❌ PropertyLead list (mine) error:', e)
    return res.status(500).json({ error: 'property_lead_list_failed' })
  }
})

// GET /api/property-leads/:id — owner views ONE of their OWN leads (to pre-fill the edit form).
// Registered AFTER /mine and /upload so those literal routes still match first.
// Owner-safe projection only (never exposes internal scores). Returns 404 if the lead
// is missing OR not owned by the caller (do not leak existence of other owners' leads).
propertyLeadRouter.get('/:id', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireOwner(req, res)) return
  try {
    const lead = await prisma.propertyLead.findFirst({
      where: { id: req.params.id, ownerId: req.user!.userId, tenantId: req.user!.tenantId },
      select: OWNER_SAFE_SELECT,
    })
    if (!lead) return res.status(404).json({ error: 'property_lead_not_found' })
    return res.json(lead)
  } catch (e: any) {
    console.error('❌ PropertyLead owner detail error:', e)
    return res.status(500).json({ error: 'property_lead_detail_failed' })
  }
})

// PATCH /api/property-leads/:id/resubmit — owner updates a NEEDS_INFO lead and resubmits it.
// Owner-only, own-lead-only, allowed ONLY when the lead is currently NEEDS_INFO.
// Sets status/adminStatus back to UNDER_REVIEW (existing enum — NO migration).
// STRICT field allowlist: owner can never touch ownerId, tenantId, status/adminStatus directly,
// reviewNotes, reviewedBy, reviewedAt, or internal scores. Last admin reviewNotes is preserved
// for context. Internal scores are recomputed server-side (owner never sees/controls them).
propertyLeadRouter.patch('/:id/resubmit', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireOwner(req, res)) return
  try {
    const existing = await prisma.propertyLead.findFirst({
      where: { id: req.params.id, ownerId: req.user!.userId, tenantId: req.user!.tenantId },
      select: { id: true, status: true },
    })
    if (!existing) return res.status(404).json({ error: 'property_lead_not_found' })
    if (existing.status !== 'NEEDS_INFO') {
      return res.status(409).json({
        error: 'lead_not_editable',
        message: 'لا يمكن تعديل هذا الطلب في حالته الحالية. التعديل متاح فقط عندما يطلب فريق الوسم معلومات إضافية.',
        currentStatus: existing.status,
      })
    }

    const b = req.body || {}

    // --- required string fields (same contract as create) ---
    const requiredStr = ['applicantType', 'fullName', 'phone', 'propertyName', 'propertyType', 'city', 'district', 'googleMapsUrl', 'shortDescription']
    const missing = requiredStr.filter(k => !toStr(b[k]))
    const requestedPrice = toNum(b.requestedPrice)
    if (requestedPrice === undefined) missing.push('requestedPrice')
    if (missing.length > 0) {
      return res.status(400).json({ error: 'missing_required_fields', message: 'يرجى تعبئة جميع الحقول المطلوبة.', fields: missing })
    }
    if (!Number.isFinite(requestedPrice as number) || (requestedPrice as number) <= 0) {
      return res.status(400).json({ error: 'invalid_requested_price', message: 'السعر المطلوب يجب أن يكون رقماً موجباً.', field: 'requestedPrice' })
    }
    const email = toStr(b.email)
    if (email && !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'invalid_email', message: 'صيغة البريد الإلكتروني غير صحيحة.', field: 'email' })
    }
    const annualRent = toNum(b.annualRent)
    if (annualRent !== undefined && (!Number.isFinite(annualRent) || annualRent <= 0)) {
      return res.status(400).json({ error: 'invalid_annual_rent', message: 'قيمة الإيجار السنوي يجب أن تكون رقماً موجباً.', field: 'annualRent' })
    }
    let imageUrls: string[] | undefined
    if (b.imageUrls !== undefined && b.imageUrls !== null) {
      if (!Array.isArray(b.imageUrls)) return res.status(400).json({ error: 'invalid_images', message: 'صيغة الصور غير صحيحة.', field: 'imageUrls' })
      if (b.imageUrls.length > 5) return res.status(400).json({ error: 'too_many_images', message: 'الحد الأقصى 5 صور.', field: 'imageUrls' })
      imageUrls = b.imageUrls.map((u: unknown) => String(u)).filter(Boolean)
    }
    const landArea = toNum(b.landArea)
    const buildingArea = toNum(b.buildingArea)
    const buildingYear = toNum(b.buildingYear)
    for (const [k, v] of Object.entries({ landArea, buildingArea, buildingYear })) {
      if (typeof v === 'number' && Number.isNaN(v)) {
        return res.status(400).json({ error: 'invalid_number', message: `قيمة غير صحيحة للحقل ${k}.`, field: k })
      }
    }
    let leaseExpiryDate: Date | undefined
    if (toStr(b.leaseExpiryDate)) {
      const d = new Date(b.leaseExpiryDate)
      if (!Number.isNaN(d.getTime())) leaseExpiryDate = d
    }

    // --- STRICT owner-editable allowlist (mirrors the create form fields) ---
    const leadInput = {
      applicantType: toStr(b.applicantType),
      fullName:      toStr(b.fullName),
      companyName:   toStr(b.companyName),
      phone:         toStr(b.phone),
      email,
      propertyName:  toStr(b.propertyName),
      propertyType:  toStr(b.propertyType),
      city:          toStr(b.city),
      district:      toStr(b.district),
      googleMapsUrl: toStr(b.googleMapsUrl),
      landArea:      landArea ?? null,
      buildingArea:  buildingArea ?? null,
      buildingYear:  buildingYear != null ? Math.trunc(buildingYear as number) : null,
      requestedPrice: requestedPrice as number,
      isPriceNegotiable:   toBool(b.isPriceNegotiable) ?? null,
      isLeased:            toBool(b.isLeased) ?? null,
      annualRent:          annualRent ?? null,
      leaseExpiryDate:     leaseExpiryDate ?? null,
      hasMortgage:         toBool(b.hasMortgage) ?? null,
      hasOwnershipPartner: toBool(b.hasOwnershipPartner) ?? null,
      hasLegalDispute:     toBool(b.hasLegalDispute) ?? null,
      noLegalIssues:       toBool(b.noLegalIssues) ?? null,
      shortDescription:    toStr(b.shortDescription),
      // Documents: skip when not sent (protect existing docs from accidental clearing).
      imageUrls:           imageUrls ?? undefined,
      deedImageUrl:        toStr(b.deedImageUrl) ?? undefined,
    }

    // Recompute internal scores server-side against the updated data. Admin-only; never returned.
    const scores = scoreLead(leadInput)

    const updated = await prisma.propertyLead.update({
      where: { id: existing.id },
      data: {
        ...leadInput,
        qualificationScore: scores.qualificationScore,
        tokenizationSuitabilityScore: scores.tokenizationSuitabilityScore,
        internalRecommendation: scores.internalRecommendation,
        // Back into the review queue (kept in sync, mirrors create + admin status PATCH).
        status: 'UNDER_REVIEW',
        adminStatus: 'UNDER_REVIEW',
        // reviewNotes / reviewedBy / reviewedAt intentionally NOT touched (preserve admin context).
        // ownerId / tenantId never change. updatedAt auto-updates via @updatedAt.
      },
      select: { id: true, status: true, updatedAt: true },
    })

    return res.json({
      success: true,
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
      message: 'تم إعادة إرسال الطلب للمراجعة',
    })
  } catch (e: any) {
    console.error('❌ PropertyLead resubmit error:', e)
    return res.status(500).json({ error: 'property_lead_resubmit_failed' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTER  →  /api/admin/property-leads
// ════════════════════════════════════════════════════════════════════════════
export const propertyLeadAdminRouter = Router()

// GET /api/admin/property-leads — admin lists all leads
propertyLeadAdminRouter.get('/', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const where = status ? { status: status as any } : {}
    const leads = await prisma.propertyLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: ADMIN_LIST_SELECT,
    })
    return res.json(leads)
  } catch (e: any) {
    console.error('❌ PropertyLead admin list error:', e)
    return res.status(500).json({ error: 'property_lead_admin_list_failed' })
  }
})

// GET /api/admin/property-leads/:id — admin views full lead
propertyLeadAdminRouter.get('/:id', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return
  try {
    const lead = await prisma.propertyLead.findUnique({ where: { id: req.params.id } })
    if (!lead) return res.status(404).json({ error: 'property_lead_not_found' })
    return res.json(lead)
  } catch (e: any) {
    console.error('❌ PropertyLead admin detail error:', e)
    return res.status(500).json({ error: 'property_lead_detail_failed' })
  }
})

// PATCH /api/admin/property-leads/:id/status — admin updates review status
propertyLeadAdminRouter.patch('/:id/status', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return
  try {
    const { status, reviewNotes } = req.body || {}
    if (!ALLOWED_STATUS_UPDATES.includes(status)) {
      return res.status(400).json({
        error: 'invalid_status',
        message: `الحالة غير مسموحة. المسموح: ${ALLOWED_STATUS_UPDATES.join(', ')}`,
        allowed: ALLOWED_STATUS_UPDATES,
      })
    }

    const existing = await prisma.propertyLead.findUnique({ where: { id: req.params.id }, select: { id: true } })
    if (!existing) return res.status(404).json({ error: 'property_lead_not_found' })

    const updated = await prisma.propertyLead.update({
      where: { id: req.params.id },
      data: {
        status: status as any,
        adminStatus: status,
        reviewNotes: typeof reviewNotes === 'string' ? reviewNotes : undefined,
        reviewedAt: new Date(),
        reviewedBy: req.user!.userId,
      },
    })
    return res.json({ success: true, lead: updated })
  } catch (e: any) {
    console.error('❌ PropertyLead status update error:', e)
    return res.status(500).json({ error: 'property_lead_status_update_failed' })
  }
})
