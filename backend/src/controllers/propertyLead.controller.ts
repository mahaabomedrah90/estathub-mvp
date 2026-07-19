import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { scoreLead } from '../lib/propertyLeadScoring'
import { logAdminAction, AuditAction } from '../lib/auditService'
import {
  buildPropertyLeadKey, uploadPropertyLeadDocument, getSignedPropertyLeadUrl,
  detectMimeFromMagic, getDocsBucket, isLegacyLocalUrl, isS3Key,
  SIGNED_URL_TTL_SECONDS, DocsNotConfiguredError,
} from '../lib/propertyLeadS3'

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
// Statuses an admin may set via the generic status PATCH. CONVERTED_TO_PROPERTY is
// intentionally excluded — conversion happens on a separate path (Phase 6, not built).
const ADMIN_SETTABLE_STATUSES = ['UNDER_REVIEW', 'NEEDS_INFO', 'ACCEPTED', 'REJECTED', 'READY_FOR_FINAL_REVIEW', 'FINAL_APPROVED'] as const
// Allowed admin status transitions (from -> [to]). NEEDS_INFO leaves only via the
// owner resubmit endpoint (Phase 1). FINAL_APPROVED/REJECTED/CONVERTED are terminal.
const ADMIN_STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW:                    ['UNDER_REVIEW'],
  UNDER_REVIEW:           ['NEEDS_INFO', 'ACCEPTED', 'REJECTED'],
  NEEDS_INFO:             [], // exits only via owner resubmit (NEEDS_INFO -> UNDER_REVIEW)
  ACCEPTED:               ['READY_FOR_FINAL_REVIEW', 'REJECTED'],
  READY_FOR_FINAL_REVIEW: ['FINAL_APPROVED', 'ACCEPTED', 'NEEDS_INFO', 'REJECTED'],
  FINAL_APPROVED:         [],
  REJECTED:               [],
  CONVERTED_TO_PROPERTY:  [],
}

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
// Phase 2a: memoryStorage → private S3 (NOT local disk). The buffer is
// magic-byte validated then uploaded via propertyLeadS3. Client-declared mime is
// only a first gate; detectMimeFromMagic is authoritative.
const LEAD_UPLOAD_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
const leadUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (LEAD_UPLOAD_MIMES.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Invalid file type'))
  },
})

// Collect every document reference stored on a lead (legacy URL strings AND new
// S3-key strings/objects), so signed-URL endpoints can verify a requested key
// actually belongs to the lead before signing it.
function leadDocumentRefs(lead: { imageUrls?: unknown; deedImageUrl?: unknown }): string[] {
  const refs: string[] = []
  const imgs = Array.isArray(lead.imageUrls) ? lead.imageUrls : []
  for (const it of imgs) {
    if (typeof it === 'string') refs.push(it)
    else if (it && typeof it === 'object' && typeof (it as any).key === 'string') refs.push((it as any).key)
  }
  if (typeof lead.deedImageUrl === 'string' && lead.deedImageUrl) refs.push(lead.deedImageUrl)
  return refs
}

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
  async (req: Request & { file?: any; user?: any }, res: Response) => {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'no_file', message: 'لم يتم استلام أي ملف.' })
    }
    // Authoritative server-side content check (do not trust client mimetype).
    const detected = detectMimeFromMagic(req.file.buffer)
    if (!detected) {
      return res.status(415).json({ error: 'unsupported_file_type', message: 'صيغة الملف غير مدعومة. المسموح: JPG أو PNG أو WEBP أو PDF.' })
    }
    if (!getDocsBucket()) {
      return res.status(500).json({ error: 'storage_not_configured', message: 'Document storage is not configured' })
    }
    // Optional leadId: use the lead-scoped key prefix ONLY if the caller is
    // authorized for that lead; otherwise fall back to the pending prefix.
    let leadId: string | undefined = toStr(req.body?.leadId)
    if (leadId) {
      const role = normalizedRole(req)
      const scope = role === 'ADMIN'
        ? { id: leadId }
        : { id: leadId, ownerId: req.user!.userId, tenantId: req.user!.tenantId }
      const owns = await prisma.propertyLead.findFirst({ where: scope, select: { id: true } })
      if (!owns) leadId = undefined
    }
    const key = buildPropertyLeadKey({ ownerId: req.user!.userId, leadId, originalName: req.file.originalname })
    try {
      await uploadPropertyLeadDocument({ buffer: req.file.buffer, key, contentType: detected })
    } catch (e: any) {
      if (e instanceof DocsNotConfiguredError) {
        return res.status(500).json({ error: 'storage_not_configured', message: 'Document storage is not configured' })
      }
      console.error('❌ PropertyLead upload S3 error:', e?.message)
      return res.status(500).json({ error: 'upload_failed', message: 'تعذّر رفع الملف. حاول مرة أخرى.' })
    }
    // New shape: store the KEY (never a public URL). fileUrl:null for BC.
    return res.json({
      key,
      filename: req.file.originalname,
      mimeType: detected,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      fileUrl: null,
    })
  }
)

// GET /api/property-leads/:id/documents/url?key=<encodedKey> — owner gets a
// short-lived signed URL for ONE of their own lead's documents. Legacy local
// URLs are returned as-is (marked legacy). Arbitrary keys are never signed.
propertyLeadRouter.get('/:id/documents/url', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireOwner(req, res)) return
  try {
    const key = typeof req.query.key === 'string' ? req.query.key : ''
    if (!key) return res.status(400).json({ error: 'missing_key', message: 'المستند غير محدد.' })
    const lead = await prisma.propertyLead.findFirst({
      where: { id: req.params.id, ownerId: req.user!.userId, tenantId: req.user!.tenantId },
      select: { imageUrls: true, deedImageUrl: true },
    })
    if (!lead) return res.status(404).json({ error: 'property_lead_not_found' })
    if (!leadDocumentRefs(lead).includes(key)) return res.status(403).json({ error: 'document_not_on_lead' })
    if (isLegacyLocalUrl(key)) return res.json({ url: key, legacy: true })
    if (!isS3Key(key)) return res.status(400).json({ error: 'invalid_document_reference' })
    const url = await getSignedPropertyLeadUrl(key)
    return res.json({ url, expiresIn: SIGNED_URL_TTL_SECONDS })
  } catch (e: any) {
    if (e instanceof DocsNotConfiguredError) return res.status(500).json({ error: 'storage_not_configured', message: 'Document storage is not configured' })
    console.error('❌ PropertyLead owner document url error:', e?.message)
    return res.status(500).json({ error: 'document_url_failed', message: 'تعذّر فتح المستند. حاول مرة أخرى.' })
  }
})

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

    // Record the owner resubmit in the shared audit trail so the admin review
    // timeline is complete (NEEDS_INFO → UNDER_REVIEW). adminId is null (owner actor).
    // Safe: logAdminAction never throws.
    await logAdminAction({
      admin:      null,
      action:     AuditAction.PROPERTY_LEAD_RESUBMITTED,
      targetType: 'PropertyLead',
      targetId:   existing.id,
      metadata:   { fromStatus: 'NEEDS_INFO', toStatus: 'UNDER_REVIEW', actor: 'owner', ownerId: req.user!.userId },
      req,
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

    // Conversion is never performed via the generic status PATCH (separate path, Phase 6).
    if (status === 'CONVERTED_TO_PROPERTY') {
      return res.status(409).json({ error: 'conversion_not_allowed_here', message: 'التحويل إلى عقار يتم من خلال مسار مستقل' })
    }
    if (!ADMIN_SETTABLE_STATUSES.includes(status)) {
      return res.status(400).json({
        error: 'invalid_status',
        message: `الحالة غير مسموحة. المسموح: ${ADMIN_SETTABLE_STATUSES.join(', ')}`,
        allowed: ADMIN_SETTABLE_STATUSES,
      })
    }

    const existing = await prisma.propertyLead.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, status: true, propertyName: true, ownerId: true,
        listingDraft: true, feeSnapshot: true, feesLockedAt: true,
      },
    })
    if (!existing) return res.status(404).json({ error: 'property_lead_not_found' })

    // Enforce the allowed transition map for the lead's current status.
    const allowedTo = ADMIN_STATUS_TRANSITIONS[existing.status] || []
    if (!allowedTo.includes(status)) {
      return res.status(409).json({
        error: 'invalid_status_transition',
        message: `لا يمكن تغيير الحالة من "${existing.status}" إلى "${status}".`,
        from: existing.status,
        to: status,
        allowed: allowedTo,
      })
    }

    // FINAL_APPROVED requires listing + fee data. Phase 5/6 not built yet, so this
    // blocks until listingDraft + feeSnapshot + feesLockedAt are all present.
    if (status === 'FINAL_APPROVED') {
      if (!existing.listingDraft || !existing.feeSnapshot || !existing.feesLockedAt) {
        return res.status(409).json({
          error: 'final_approval_requirements_missing',
          message: 'لا يمكن الاعتماد النهائي قبل استكمال بيانات الإدراج والرسوم',
        })
      }
    }

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

    // Audit trail via the existing AdminAuditLog (no new table). Never blocks the
    // response — logAdminAction swallows its own errors internally.
    await logAdminAction({
      admin:      { userId: req.user!.userId, email: req.user!.email },
      action:     AuditAction.PROPERTY_LEAD_STATUS_CHANGE,
      targetType: 'PropertyLead',
      targetId:   existing.id,
      metadata:   {
        fromStatus: existing.status,
        toStatus:   status,
        note:       typeof reviewNotes === 'string' ? reviewNotes : null,
        propertyName: existing.propertyName ?? null,
        ownerId:    existing.ownerId ?? null,
      },
      req,
    })

    return res.json({ success: true, lead: updated })
  } catch (e: any) {
    console.error('❌ PropertyLead status update error:', e)
    return res.status(500).json({ error: 'property_lead_status_update_failed' })
  }
})

// GET /api/admin/property-leads/:id/audit-history — admin-only review timeline for one lead.
// Reads from the existing AdminAuditLog (targetType='PropertyLead', targetId=leadId). No new table.
propertyLeadAdminRouter.get('/:id/audit-history', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return
  try {
    const entries = await prisma.adminAuditLog.findMany({
      where: { targetType: 'PropertyLead', targetId: req.params.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, action: true, adminId: true, adminEmail: true,
        metadata: true, createdAt: true,
      },
    })
    return res.json(entries)
  } catch (e: any) {
    console.error('❌ PropertyLead audit-history error:', e)
    return res.status(500).json({ error: 'property_lead_audit_history_failed' })
  }
})

// GET /api/admin/property-leads/:id/documents/url?key=<encodedKey> — admin gets a
// short-lived signed URL for ONE of a lead's documents. Key must belong to the
// lead (never sign arbitrary keys). Legacy local URLs returned as-is.
propertyLeadAdminRouter.get('/:id/documents/url', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return
  try {
    const key = typeof req.query.key === 'string' ? req.query.key : ''
    if (!key) return res.status(400).json({ error: 'missing_key', message: 'المستند غير محدد.' })
    const lead = await prisma.propertyLead.findUnique({
      where: { id: req.params.id },
      select: { imageUrls: true, deedImageUrl: true },
    })
    if (!lead) return res.status(404).json({ error: 'property_lead_not_found' })
    if (!leadDocumentRefs(lead).includes(key)) return res.status(403).json({ error: 'document_not_on_lead' })
    if (isLegacyLocalUrl(key)) return res.json({ url: key, legacy: true })
    if (!isS3Key(key)) return res.status(400).json({ error: 'invalid_document_reference' })
    const url = await getSignedPropertyLeadUrl(key)
    return res.json({ url, expiresIn: SIGNED_URL_TTL_SECONDS })
  } catch (e: any) {
    if (e instanceof DocsNotConfiguredError) return res.status(500).json({ error: 'storage_not_configured', message: 'Document storage is not configured' })
    console.error('❌ PropertyLead admin document url error:', e?.message)
    return res.status(500).json({ error: 'document_url_failed', message: 'تعذّر فتح المستند. حاول مرة أخرى.' })
  }
})

// ─── Phase 5: listing draft + fee snapshot (admin finalization) ──────────────
const FINALIZATION_EDITABLE_STATUSES = ['ACCEPTED', 'READY_FOR_FINAL_REVIEW']
const round2 = (n: number) => Math.round(n * 100) / 100

// Validate + normalize the admin-entered tokenomics/listing draft.
function validateListingDraft(input: any):
  | { ok: false; error: string; field?: string }
  | { ok: true; data: any; warnings: string[] } {
  const b = input || {}
  const totalValue = toNum(b.totalValue)
  const tokenPrice = toNum(b.tokenPrice)
  const totalTokens = toNum(b.totalTokens)
  const monthlyYield = toNum(b.monthlyYield)
  if (totalValue === undefined || !Number.isFinite(totalValue) || totalValue <= 0) return { ok: false, error: 'invalid_total_value', field: 'totalValue' }
  if (tokenPrice === undefined || !Number.isFinite(tokenPrice) || tokenPrice <= 0) return { ok: false, error: 'invalid_token_price', field: 'tokenPrice' }
  if (totalTokens === undefined || !Number.isFinite(totalTokens) || totalTokens <= 0 || !Number.isInteger(totalTokens)) return { ok: false, error: 'invalid_total_tokens', field: 'totalTokens' }
  if (monthlyYield === undefined || !Number.isFinite(monthlyYield) || monthlyYield < 0) return { ok: false, error: 'invalid_monthly_yield', field: 'monthlyYield' }
  let remainingTokens = toNum(b.remainingTokens)
  if (remainingTokens === undefined) remainingTokens = totalTokens
  else if (!Number.isFinite(remainingTokens) || !Number.isInteger(remainingTokens) || remainingTokens < 0 || remainingTokens > totalTokens) return { ok: false, error: 'invalid_remaining_tokens', field: 'remainingTokens' }
  const expectedROI = toNum(b.expectedROI)
  if (expectedROI !== undefined && (!Number.isFinite(expectedROI) || expectedROI < 0)) return { ok: false, error: 'invalid_expected_roi', field: 'expectedROI' }
  const notes = toStr(b.notes)
  const warnings: string[] = []
  // Warning only (do not block): totalValue vs tokenPrice * totalTokens.
  if (Math.abs(totalValue - tokenPrice * totalTokens) > 0.01) warnings.push('القيمة النهائية لا تساوي سعر الحصة × عدد الحصص.')
  return {
    ok: true,
    data: { totalValue, tokenPrice, totalTokens, remainingTokens, monthlyYield, expectedROI: expectedROI ?? null, notes: notes ?? null },
    warnings,
  }
}

// Build the fee snapshot from admin input; amounts computed server-side from
// totalValue (fees), VAT on the fees subtotal. Flexible Json — NOT a final
// accounting rule (source: admin_manual_phase5), admin-confirmable.
function buildFeeSnapshot(input: any, totalValue: number, admin: { userId?: string; email?: string }):
  | { ok: false; error: string; field?: string }
  | { ok: true; data: any } {
  const b = input || {}
  const platformFeePct = toNum(b.platformFeePct)
  const managementFeePct = toNum(b.managementFeePct)
  const tokenizationFeePct = toNum(b.tokenizationFeePct)
  const vatPct = toNum(b.vatPct)
  if (platformFeePct === undefined || !Number.isFinite(platformFeePct) || platformFeePct < 0 || platformFeePct > 100) {
    return { ok: false, error: 'invalid_fee_percentage', field: 'platformFeePct' }
  }
  for (const [k, v] of Object.entries({ managementFeePct, tokenizationFeePct, vatPct })) {
    if (v !== undefined && (!Number.isFinite(v) || v < 0 || v > 100)) return { ok: false, error: 'invalid_fee_percentage', field: k }
  }
  const platformFeeAmount = round2(totalValue * platformFeePct / 100)
  const managementFeeAmount = managementFeePct !== undefined ? round2(totalValue * managementFeePct / 100) : undefined
  const tokenizationFeeAmount = tokenizationFeePct !== undefined ? round2(totalValue * tokenizationFeePct / 100) : undefined
  const feesSubtotal = platformFeeAmount + (managementFeeAmount ?? 0) + (tokenizationFeeAmount ?? 0)
  const vatAmount = vatPct !== undefined ? round2(feesSubtotal * vatPct / 100) : undefined
  const totalFeesAmount = round2(feesSubtotal + (vatAmount ?? 0))
  const notes = toStr(b.notes)
  const data: any = {
    currency: 'SAR',
    basis: 'totalValue',
    vatBasis: 'feesSubtotal',
    platformFeePct, platformFeeAmount,
    totalFeesAmount,
    source: 'admin_manual_phase5',
    enteredBy: admin.userId ?? null,
    enteredAt: new Date().toISOString(),
  }
  if (managementFeePct !== undefined) { data.managementFeePct = managementFeePct; data.managementFeeAmount = managementFeeAmount }
  if (tokenizationFeePct !== undefined) { data.tokenizationFeePct = tokenizationFeePct; data.tokenizationFeeAmount = tokenizationFeeAmount }
  if (vatPct !== undefined) { data.vatPct = vatPct; data.vatAmount = vatAmount }
  if (notes) data.notes = notes
  return { ok: true, data }
}

// GET /api/admin/property-leads/:id/finalization — admin reads current listing/fee
// data + a default platform-fee input seeded from Settings.platformFee.
propertyLeadAdminRouter.get('/:id/finalization', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return
  try {
    const lead = await prisma.propertyLead.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, adminStatus: true, propertyName: true, requestedPrice: true, listingDraft: true, feeSnapshot: true, feesLockedAt: true },
    })
    if (!lead) return res.status(404).json({ error: 'property_lead_not_found' })
    let defaultPlatformFeePct: number | null = null
    try {
      const s = await prisma.settings.findUnique({ where: { key: 'platformFee' } })
      if (s?.value) { const n = parseFloat(s.value); if (Number.isFinite(n)) defaultPlatformFeePct = n }
    } catch { /* Settings optional */ }
    return res.json({
      lead: { id: lead.id, status: lead.status, adminStatus: lead.adminStatus, propertyName: lead.propertyName, requestedPrice: lead.requestedPrice },
      listingDraft: lead.listingDraft,
      feeSnapshot: lead.feeSnapshot,
      feesLockedAt: lead.feesLockedAt,
      defaultFeeInputs: { currency: 'SAR', platformFeePct: defaultPlatformFeePct },
    })
  } catch (e: any) {
    console.error('❌ PropertyLead finalization get error:', e?.message)
    return res.status(500).json({ error: 'finalization_get_failed' })
  }
})

// PATCH /api/admin/property-leads/:id/finalization — admin saves the listing draft +
// fee snapshot; sets feesLockedAt. Allowed only for ACCEPTED / READY_FOR_FINAL_REVIEW.
// Does NOT create a Property and does NOT change status.
propertyLeadAdminRouter.patch('/:id/finalization', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return
  try {
    const existing = await prisma.propertyLead.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, propertyName: true, ownerId: true },
    })
    if (!existing) return res.status(404).json({ error: 'property_lead_not_found' })
    if (!FINALIZATION_EDITABLE_STATUSES.includes(existing.status)) {
      return res.status(409).json({
        error: 'finalization_not_allowed',
        message: 'لا يمكن تعديل بيانات الإدراج والرسوم في حالة الطلب الحالية.',
        currentStatus: existing.status,
      })
    }
    const ld = validateListingDraft(req.body?.listingDraft)
    if (!ld.ok) return res.status(400).json({ error: ld.error, field: ld.field, message: 'بيانات الإدراج غير صحيحة. تحقق من القيم المدخلة.' })
    const fs = buildFeeSnapshot(req.body?.feeSnapshot, ld.data.totalValue, { userId: req.user!.userId, email: req.user!.email })
    if (!fs.ok) return res.status(400).json({ error: fs.error, field: fs.field, message: 'بيانات الرسوم غير صحيحة. تحقق من النسب المدخلة (0–100).' })

    const updated = await prisma.propertyLead.update({
      where: { id: existing.id },
      data: {
        listingDraft: ld.data as any,
        feeSnapshot: fs.data as any,
        feesLockedAt: new Date(),
      },
      select: { id: true, status: true, listingDraft: true, feeSnapshot: true, feesLockedAt: true },
    })

    await logAdminAction({
      admin:      { userId: req.user!.userId, email: req.user!.email },
      action:     AuditAction.PROPERTY_LEAD_FINALIZATION_UPDATED,
      targetType: 'PropertyLead',
      targetId:   existing.id,
      metadata:   {
        totalValue: ld.data.totalValue,
        totalTokens: ld.data.totalTokens,
        totalFeesAmount: (fs.data as any).totalFeesAmount,
        note: toStr(req.body?.note) ?? null,
        propertyName: existing.propertyName ?? null,
      },
      req,
    })

    return res.json({
      success: true,
      listingDraft: updated.listingDraft,
      feeSnapshot: updated.feeSnapshot,
      feesLockedAt: updated.feesLockedAt,
      warnings: ld.warnings,
    })
  } catch (e: any) {
    console.error('❌ PropertyLead finalization update error:', e?.message)
    return res.status(500).json({ error: 'finalization_update_failed' })
  }
})

// POST /api/admin/property-leads/:id/convert — admin converts a FINAL_APPROVED lead
// into an actual Property (status PENDING, isDraft=false → NOT investor-visible).
// Idempotent (convertedPropertyId link), transactional. No minting/payment/listing.
propertyLeadAdminRouter.post('/:id/convert', auth(true), async (req: Request & { user?: any }, res: Response) => {
  if (!requireAdmin(req, res)) return
  try {
    const result = await prisma.$transaction(async (tx) => {
      const lead = await tx.propertyLead.findUnique({
        where: { id: req.params.id },
        select: {
          id: true, status: true, convertedPropertyId: true,
          propertyName: true, shortDescription: true, propertyType: true, city: true, district: true,
          landArea: true, buildingArea: true, buildingYear: true,
          ownerId: true, fullName: true, phone: true, email: true, tenantId: true,
          imageUrls: true, deedImageUrl: true,
          listingDraft: true, feeSnapshot: true, feesLockedAt: true,
        },
      })
      if (!lead) return { kind: 'not_found' as const }
      // Idempotency: already converted → return the linked Property, never create another.
      if (lead.convertedPropertyId) {
        const existing = await tx.property.findUnique({ where: { id: lead.convertedPropertyId } })
        return { kind: 'already' as const, propertyId: lead.convertedPropertyId, property: existing }
      }
      if (lead.status !== 'FINAL_APPROVED') return { kind: 'not_final' as const, status: lead.status }
      if (!lead.listingDraft || !lead.feeSnapshot || !lead.feesLockedAt) return { kind: 'missing_finalization' as const }

      const ld: any = lead.listingDraft
      const tv = Number(ld?.totalValue), tp = Number(ld?.tokenPrice), tt = Number(ld?.totalTokens), my = Number(ld?.monthlyYield)
      const rt = ld?.remainingTokens != null ? Number(ld.remainingTokens) : tt
      const roi = ld?.expectedROI != null ? Number(ld.expectedROI) : 0
      if (!(tv > 0) || !(tp > 0) || !Number.isInteger(tt) || !(tt > 0) || !(my >= 0) ||
          !Number.isInteger(rt) || rt < 0 || rt > tt || !(roi >= 0)) {
        return { kind: 'bad_tokenomics' as const }
      }
      if (!lead.propertyName) return { kind: 'missing_property_name' as const }

      // Image references (S3 keys or legacy URLs) carried over as metadata; deed goes to deedDocumentUrl.
      const imageRefs = leadDocumentRefs({ imageUrls: lead.imageUrls, deedImageUrl: null })

      const property = await tx.property.create({
        data: {
          title: lead.propertyName,
          description: lead.shortDescription ?? '',
          propertyDescription: lead.shortDescription ?? undefined,
          totalValue: tv, tokenPrice: tp, totalTokens: tt, remainingTokens: rt, monthlyYield: my, expectedROI: roi,
          status: 'PENDING',   // NOT investor-visible (investors see APPROVED only)
          isDraft: false,
          ownerId: lead.ownerId ?? undefined,
          ownerName: lead.fullName ?? '',
          ownerPhone: lead.phone ?? undefined,
          ownerEmail: lead.email ?? undefined,
          tenantId: lead.tenantId,
          city: lead.city ?? undefined,
          district: lead.district ?? '',
          propertyTypeDetailed: lead.propertyType ?? undefined,
          landArea: lead.landArea ?? undefined,
          builtArea: lead.buildingArea ?? undefined,
          buildingAge: lead.buildingYear ?? undefined,
          mainImagesUrls: imageRefs,
          deedDocumentUrl: typeof lead.deedImageUrl === 'string' ? lead.deedImageUrl : undefined,
          feeSnapshot: lead.feeSnapshot as any,
        },
      })

      await tx.propertyLead.update({
        where: { id: lead.id },
        data: { status: 'CONVERTED_TO_PROPERTY', adminStatus: 'CONVERTED_TO_PROPERTY', convertedPropertyId: property.id },
      })

      return { kind: 'created' as const, property, fromStatus: lead.status, propertyName: lead.propertyName, totalValue: tv, totalTokens: tt, tokenPrice: tp }
    })

    if (result.kind === 'not_found') return res.status(404).json({ error: 'property_lead_not_found' })
    if (result.kind === 'already') {
      return res.json({ success: true, alreadyConverted: true, propertyId: result.propertyId, property: result.property, message: 'الطلب محوّل إلى عقار مسبقًا.' })
    }
    if (result.kind === 'not_final') {
      return res.status(409).json({ error: 'not_final_approved', message: 'لا يمكن تحويل الطلب إلى عقار قبل الاعتماد النهائي', currentStatus: result.status })
    }
    if (result.kind === 'missing_finalization') {
      return res.status(409).json({ error: 'finalization_missing', message: 'لا يمكن تحويل الطلب قبل استكمال بيانات الإدراج والرسوم' })
    }
    if (result.kind === 'bad_tokenomics') {
      return res.status(400).json({ error: 'invalid_listing_tokenomics', message: 'بيانات الإدراج (الترميز) غير مكتملة أو غير صحيحة. راجع بيانات الإدراج ثم أعد المحاولة.' })
    }
    if (result.kind === 'missing_property_name') {
      return res.status(400).json({ error: 'missing_property_name', message: 'اسم العقار مطلوب للتحويل.' })
    }

    // created
    await logAdminAction({
      admin:      { userId: req.user!.userId, email: req.user!.email },
      action:     AuditAction.PROPERTY_LEAD_CONVERTED_TO_PROPERTY,
      targetType: 'PropertyLead',
      targetId:   req.params.id,
      metadata:   {
        leadId: req.params.id,
        propertyId: result.property.id,
        fromStatus: result.fromStatus,
        toStatus: 'CONVERTED_TO_PROPERTY',
        propertyName: result.propertyName,
        totalValue: result.totalValue,
        totalTokens: result.totalTokens,
        tokenPrice: result.tokenPrice,
      },
      req,
    })

    return res.status(201).json({
      success: true,
      propertyId: result.property.id,
      property: { id: result.property.id, title: result.property.title, status: result.property.status, isDraft: result.property.isDraft },
      message: 'تم تحويل الطلب إلى عقار',
    })
  } catch (e: any) {
    console.error('❌ PropertyLead convert error:', e?.message)
    return res.status(500).json({ error: 'property_lead_convert_failed', message: 'تعذّر تحويل الطلب إلى عقار. حاول مرة أخرى.' })
  }
})
