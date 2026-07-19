import React, { useState, useEffect, useCallback } from 'react'
import {
  Building2, User, MapPin, Coins, Loader2, AlertCircle, CheckCircle2,
  XCircle, RefreshCw, X, Calendar, Eye, ClipboardList, Info, FileText, Gavel, Clock
} from 'lucide-react'
import { authHeader, fetchJson } from '../../lib/api'

// ============================================================================
// AdminPropertyLeads — review queue for preliminary opportunity submissions.
// Separate from the Property workflow. Review-only: change status + notes.
// No convert-to-property, no editing of lead data.
// ============================================================================

const API_BASE = import.meta.env.VITE_API_BASE || ''

const STATUS = {
  NEW:                    { label: 'تم استلام الطلب',      cls: 'bg-blue-100 text-blue-800 border-blue-200',         dot: 'bg-blue-500' },
  UNDER_REVIEW:           { label: 'قيد الدراسة',          cls: 'bg-amber-100 text-amber-800 border-amber-200',      dot: 'bg-amber-500' },
  NEEDS_INFO:             { label: 'مطلوب معلومات إضافية', cls: 'bg-orange-100 text-orange-800 border-orange-200',   dot: 'bg-orange-500' },
  ACCEPTED:               { label: 'قبول مبدئي',           cls: 'bg-green-100 text-green-800 border-green-200',       dot: 'bg-green-500' },
  READY_FOR_FINAL_REVIEW: { label: 'جاهز للاعتماد النهائي', cls: 'bg-teal-100 text-teal-800 border-teal-200',         dot: 'bg-teal-500' },
  FINAL_APPROVED:         { label: 'اعتماد نهائي',         cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  REJECTED:               { label: 'مرفوض',               cls: 'bg-red-100 text-red-800 border-red-200',            dot: 'bg-red-500' },
  CONVERTED_TO_PROPERTY:  { label: 'تم تحويله إلى عقار',   cls: 'bg-indigo-100 text-indigo-800 border-indigo-200',   dot: 'bg-indigo-500' },
}
const REC = {
  PROCEED:               { label: 'المضي قدمًا',      cls: 'bg-green-50 text-green-700 border-green-200' },
  NEED_MORE_INFORMATION: { label: 'معلومات إضافية',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  REJECT:                { label: 'غير مناسب',        cls: 'bg-red-50 text-red-700 border-red-200' },
}
const PROPERTY_TYPES = { land: 'أرض', apartment: 'شقة', building: 'عمارة', warehouse: 'مستودع', farm: 'مزرعة', other: 'أخرى' }
const CITIES = { riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام', khobar: 'الخبر' }
const APPLICANT = { owner: 'مالك', developer: 'مطوّر عقاري' }

// Phase 5 — listing/tokenomics + fee inputs (admin finalization form)
const FIN_LISTING_FIELDS = [
  { k: 'totalValue',   label: 'القيمة النهائية للعقار (ر.س)' },
  { k: 'tokenPrice',   label: 'سعر الحصة (ر.س)' },
  { k: 'totalTokens',  label: 'عدد الحصص' },
  { k: 'monthlyYield', label: 'العائد الشهري المتوقع (%)' },
  { k: 'expectedROI',  label: 'العائد السنوي المتوقع (%) — اختياري' },
]
const FIN_FEE_FIELDS = [
  { k: 'platformFeePct',     label: 'نسبة رسوم المنصة (%)' },
  { k: 'managementFeePct',   label: 'نسبة رسوم الإدارة (%) — اختياري' },
  { k: 'tokenizationFeePct', label: 'نسبة رسوم الترميز/الإعداد (%) — اختياري' },
  { k: 'vatPct',             label: 'ضريبة القيمة المضافة (%) — اختياري' },
]

const FILTERS = [
  { value: 'all',                    label: 'الكل' },
  { value: 'NEW',                    label: 'تم استلام الطلب' },
  { value: 'UNDER_REVIEW',           label: 'قيد الدراسة' },
  { value: 'NEEDS_INFO',             label: 'مطلوب معلومات إضافية' },
  { value: 'ACCEPTED',               label: 'قبول مبدئي' },
  { value: 'READY_FOR_FINAL_REVIEW', label: 'جاهز للاعتماد النهائي' },
  { value: 'FINAL_APPROVED',         label: 'اعتماد نهائي' },
  { value: 'REJECTED',               label: 'مرفوض' },
]

// Owner-facing meaning of each admin action (product copy)
// Admin actions available FROM each status (mirrors the backend transition map).
// CONVERTED_TO_PROPERTY is never offered here — conversion is a separate path (Phase 6).
const ADMIN_ACTIONS = {
  NEW: [
    { to: 'UNDER_REVIEW', label: 'بدء الدراسة', icon: ClipboardList, cls: 'bg-amber-500 hover:bg-amber-600' },
  ],
  UNDER_REVIEW: [
    { to: 'NEEDS_INFO', label: 'طلب معلومات إضافية', icon: Info,         cls: 'bg-orange-500 hover:bg-orange-600' },
    { to: 'ACCEPTED',   label: 'قبول مبدئي',         icon: CheckCircle2, cls: 'bg-green-600 hover:bg-green-700' },
    { to: 'REJECTED',   label: 'رفض',                icon: XCircle,      cls: 'bg-red-600 hover:bg-red-700' },
  ],
  ACCEPTED: [
    { to: 'READY_FOR_FINAL_REVIEW', label: 'تجهيز للاعتماد النهائي', icon: ClipboardList, cls: 'bg-teal-600 hover:bg-teal-700' },
    { to: 'REJECTED',               label: 'رفض',                    icon: XCircle,       cls: 'bg-red-600 hover:bg-red-700' },
  ],
  READY_FOR_FINAL_REVIEW: [
    { to: 'FINAL_APPROVED', label: 'اعتماد نهائي',         icon: CheckCircle2, cls: 'bg-emerald-700 hover:bg-emerald-800' },
    { to: 'NEEDS_INFO',     label: 'طلب معلومات إضافية',   icon: Info,         cls: 'bg-orange-500 hover:bg-orange-600' },
    { to: 'ACCEPTED',       label: 'إرجاع لقبول مبدئي',    icon: RefreshCw,    cls: 'bg-gray-500 hover:bg-gray-600' },
    { to: 'REJECTED',       label: 'رفض',                  icon: XCircle,      cls: 'bg-red-600 hover:bg-red-700' },
  ],
  NEEDS_INFO: [               // owner can resubmit, and admin can also progress it manually
    { to: 'UNDER_REVIEW', label: 'بدء المراجعة', icon: ClipboardList, cls: 'bg-amber-500 hover:bg-amber-600' },
    { to: 'ACCEPTED',     label: 'قبول مبدئي',    icon: CheckCircle2,  cls: 'bg-green-600 hover:bg-green-700' },
    { to: 'REJECTED',     label: 'رفض',           icon: XCircle,       cls: 'bg-red-600 hover:bg-red-700' },
  ],
  FINAL_APPROVED: [],         // terminal
  REJECTED: [],               // terminal
  CONVERTED_TO_PROPERTY: [],  // terminal
}

const statusLabel = (k) => (k && STATUS[k]?.label) || k || '—'
// A document ref may be a legacy local URL string, an S3 key string, or a { key } object.
const isLegacyRef = (ref) => typeof ref === 'string' && ref.startsWith('/api/uploads')
const refToKey = (ref) => (typeof ref === 'string' ? ref : (ref && ref.key) || '')
const fmtSar = (n) => (n || n === 0) ? Number(n).toLocaleString('en-US') + ' ر.س' : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

function StatusBadge({ status }) {
  const c = STATUS[status] || STATUS.NEW
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{c.label}
    </span>
  )
}
function RecBadge({ rec }) {
  if (!rec) return <span className="text-xs text-gray-300">—</span>
  const c = REC[rec] || { label: rec, cls: 'bg-gray-50 text-gray-600 border-gray-200' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${c.cls}`}>{c.label}</span>
}
function ScorePill({ value, label }) {
  const v = Number(value) || 0
  const color = v >= 70 ? 'text-green-600' : v >= 40 ? 'text-amber-600' : 'text-red-600'
  const bar = v >= 70 ? 'bg-green-500' : v >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="min-w-[64px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">{label}</span>
        <span className={`text-xs font-bold ${color}`}>{v}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mt-0.5">
        <div className={`h-full ${bar}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}
function LegalChips({ lead }) {
  const chips = []
  if (lead.hasMortgage) chips.push({ t: 'مرهون', c: 'bg-red-50 text-red-600' })
  if (lead.hasOwnershipPartner) chips.push({ t: 'شريك', c: 'bg-amber-50 text-amber-700' })
  if (lead.hasLegalDispute) chips.push({ t: 'نزاع', c: 'bg-red-50 text-red-600' })
  if (lead.noLegalIssues) chips.push({ t: 'سليم', c: 'bg-green-50 text-green-700' })
  if (!chips.length) return <span className="text-xs text-gray-300">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map(ch => <span key={ch.t} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ch.c}`}>{ch.t}</span>)}
    </div>
  )
}

// ── Detail slide-over ─────────────────────────────────────────────────────────
function DetailPanel({ id, onClose, onUpdated, showToast }) {
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(null)
  const [history, setHistory] = useState([])
  const [fin, setFin] = useState(null)        // GET /finalization response
  const [finForm, setFinForm] = useState(null) // editable inputs
  const [finSaving, setFinSaving] = useState(false)
  const [converting, setConverting] = useState(false)
  const setFinField = (k, v) => setFinForm(f => ({ ...f, [k]: v }))

  const loadHistory = useCallback(async () => {
    try {
      const h = await fetchJson(`/api/admin/property-leads/${id}/audit-history`, { headers: authHeader() })
      setHistory(Array.isArray(h) ? h : [])
    } catch {
      setHistory([])
    }
  }, [id])

  const loadFinalization = useCallback(async () => {
    try {
      const f = await fetchJson(`/api/admin/property-leads/${id}/finalization`, { headers: authHeader() })
      setFin(f)
      const ld = f.listingDraft || {}
      const fs = f.feeSnapshot || {}
      setFinForm({
        totalValue: ld.totalValue ?? '', tokenPrice: ld.tokenPrice ?? '', totalTokens: ld.totalTokens ?? '',
        monthlyYield: ld.monthlyYield ?? '', expectedROI: ld.expectedROI ?? '', listingNotes: ld.notes ?? '',
        platformFeePct: fs.platformFeePct ?? (f.defaultFeeInputs?.platformFeePct ?? ''),
        managementFeePct: fs.managementFeePct ?? '', tokenizationFeePct: fs.tokenizationFeePct ?? '', vatPct: fs.vatPct ?? '',
        feeNotes: fs.notes ?? '',
      })
    } catch {
      setFin(null); setFinForm(null)
    }
  }, [id])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true); setError('')
      try {
        const data = await fetchJson(`/api/admin/property-leads/${id}`, { headers: authHeader() })
        if (!alive) return
        setLead(data); setNotes(data.reviewNotes || '')
      } catch {
        if (alive) setError('تعذّر تحميل تفاصيل الطلب.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    loadHistory()
    loadFinalization()
    return () => { alive = false }
  }, [id, loadHistory, loadFinalization])

  const saveFinalization = async () => {
    setFinSaving(true)
    try {
      const f = finForm
      const num = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v))
      const res = await fetchJson(`/api/admin/property-leads/${id}/finalization`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          listingDraft: { totalValue: num(f.totalValue), tokenPrice: num(f.tokenPrice), totalTokens: num(f.totalTokens), monthlyYield: num(f.monthlyYield), expectedROI: num(f.expectedROI), notes: f.listingNotes || undefined },
          feeSnapshot: { platformFeePct: num(f.platformFeePct), managementFeePct: num(f.managementFeePct), tokenizationFeePct: num(f.tokenizationFeePct), vatPct: num(f.vatPct), notes: f.feeNotes || undefined },
        }),
      })
      showToast('success', 'تم حفظ بيانات الإدراج والرسوم')
      if (Array.isArray(res?.warnings) && res.warnings.length) showToast('error', res.warnings[0])
      loadFinalization()
      loadHistory()
    } catch (err) {
      showToast('error', err?.data?.message || 'تعذّر حفظ بيانات الإدراج والرسوم.')
    } finally {
      setFinSaving(false)
    }
  }

  // Phase 6 — convert a FINAL_APPROVED lead into an actual Property (admin only).
  const convertLead = async () => {
    setConverting(true)
    try {
      const res = await fetchJson(`/api/admin/property-leads/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
      })
      showToast('success', res?.message || 'تم تحويل الطلب إلى عقار')
      try {
        const data = await fetchJson(`/api/admin/property-leads/${id}`, { headers: authHeader() })
        setLead(data)
      } catch { /* keep current lead */ }
      loadHistory()
      onUpdated()
    } catch (err) {
      showToast('error', err?.data?.message || 'تعذّر تحويل الطلب إلى عقار.')
    } finally {
      setConverting(false)
    }
  }

  const updateStatus = async (status) => {
    setSaving(status)
    try {
      const res = await fetchJson(`/api/admin/property-leads/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ status, reviewNotes: notes }),
      })
      setLead(res.lead)
      showToast('success', 'تم تحديث حالة الطلب بنجاح')
      loadHistory()
      onUpdated()
    } catch (err) {
      // Surface the backend's Arabic message when present (e.g. the FINAL_APPROVED
      // requirements guard or an invalid transition), otherwise a generic message.
      showToast('error', err?.data?.message || 'تعذّر تحديث حالة الطلب. حاول مرة أخرى.')
    } finally {
      setSaving(null)
    }
  }

  // Open a lead document: legacy URLs directly; S3 keys via a short-lived
  // admin-scoped signed URL (admin endpoint enforces the key belongs to the lead).
  const openDoc = async (ref) => {
    if (isLegacyRef(ref)) { window.open(`${API_BASE}${ref}`, '_blank', 'noopener'); return }
    const key = refToKey(ref)
    if (!key) return
    try {
      const r = await fetchJson(`/api/admin/property-leads/${id}/documents/url?key=${encodeURIComponent(key)}`, { headers: authHeader() })
      if (r?.url) window.open(r.url, '_blank', 'noopener')
    } catch { /* keep UI simple */ }
  }

  const imageUrls = Array.isArray(lead?.imageUrls) ? lead.imageUrls : []

  return (
    <div className="fixed inset-0 z-50 flex justify-start" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl h-full bg-surface-base shadow-2xl overflow-y-auto">
        {/* header */}
        <div className="sticky top-0 z-10 bg-brand-primary text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 size={20} className="text-brand-accent" />
            <h2 className="text-lg font-bold">تفاصيل طلب الفرصة</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3"><Loader2 className="animate-spin text-brand-accent" size={26} /><span className="text-gray-500 text-sm">جارٍ التحميل...</span></div>
        ) : error ? (
          <div className="flex flex-col items-center py-24 gap-3"><AlertCircle className="text-red-400" size={30} /><p className="text-red-600 text-sm">{error}</p></div>
        ) : lead && (
          <div className="p-6 space-y-6">
            {/* status + scores */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={lead.status} />
              <RecBadge rec={lead.internalRecommendation} />
              <div className="flex gap-4 mr-auto">
                <ScorePill value={lead.qualificationScore} label="التأهيل" />
                <ScorePill value={lead.tokenizationSuitabilityScore} label="ملاءمة الترميز" />
              </div>
            </div>

            <Section icon={User} title="بيانات مقدّم الطلب">
              <Row label="الصفة" value={APPLICANT[lead.applicantType] || lead.applicantType} />
              <Row label="الاسم الكامل" value={lead.fullName} />
              <Row label="اسم الشركة" value={lead.companyName} />
              <Row label="الجوال" value={lead.phone} />
              <Row label="البريد الإلكتروني" value={lead.email} />
            </Section>

            <Section icon={MapPin} title="بيانات العقار">
              <Row label="اسم/عنوان العقار" value={lead.propertyName} />
              <Row label="نوع العقار" value={PROPERTY_TYPES[lead.propertyType] || lead.propertyType} />
              <Row label="المدينة" value={CITIES[lead.city] || lead.city} />
              <Row label="الحي" value={lead.district} />
              <Row label="المساحة (م²)" value={lead.landArea} />
              <Row label="عمر العقار (سنوات)" value={lead.buildingYear} />
              <Row label="الموقع على الخريطة" value={lead.googleMapsUrl} link />
            </Section>

            <Section icon={Coins} title="المعلومات المالية والقانونية">
              <Row label="السعر المطلوب" value={fmtSar(lead.requestedPrice)} />
              <Row label="قابل للتفاوض" value={lead.isPriceNegotiable == null ? '—' : (lead.isPriceNegotiable ? 'نعم' : 'لا')} />
              <Row label="مؤجَّر حالياً" value={lead.isLeased == null ? '—' : (lead.isLeased ? 'نعم' : 'لا')} />
              <Row label="الإيجار السنوي" value={lead.annualRent ? fmtSar(lead.annualRent) : '—'} />
              <Row label="مرهون" value={lead.hasMortgage == null ? '—' : (lead.hasMortgage ? 'نعم' : 'لا')} />
              <Row label="شريك في الملكية" value={lead.hasOwnershipPartner == null ? '—' : (lead.hasOwnershipPartner ? 'نعم' : 'لا')} />
              <Row label="نزاع قانوني" value={lead.hasLegalDispute == null ? '—' : (lead.hasLegalDispute ? 'نعم' : 'لا')} />
              <Row label="إقرار بعدم وجود مشاكل قانونية" value={lead.noLegalIssues ? 'نعم' : '—'} />
            </Section>

            <Section icon={FileText} title="الوصف">
              <p className="text-sm text-text-body leading-relaxed">{lead.shortDescription || '—'}</p>
            </Section>

            {(imageUrls.length > 0 || lead.deedImageUrl) && (
              <Section icon={Building2} title="الصور والمستندات">
                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                    {imageUrls.map((u, i) => (
                      isLegacyRef(u) ? (
                        <a key={i} href={`${API_BASE}${u}`} target="_blank" rel="noreferrer">
                          <img src={`${API_BASE}${u}`} alt={`صورة ${i + 1}`} className="w-full h-24 object-cover rounded-lg border border-border-soft hover:opacity-90" />
                        </a>
                      ) : (
                        <button key={i} type="button" onClick={() => openDoc(u)}
                          className="h-24 rounded-lg border border-border-soft bg-surface-muted flex flex-col items-center justify-center gap-1 text-brand-accent hover:border-brand-accent">
                          <FileText size={18} /><span className="text-[10px] text-text-muted">عرض الصورة</span>
                        </button>
                      )
                    ))}
                  </div>
                )}
                {lead.deedImageUrl && (
                  isLegacyRef(lead.deedImageUrl) ? (
                    <a href={`${API_BASE}${lead.deedImageUrl}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-brand-accent hover:underline font-medium">
                      <FileText size={16} /> عرض صورة الصك
                    </a>
                  ) : (
                    <button type="button" onClick={() => openDoc(lead.deedImageUrl)}
                      className="inline-flex items-center gap-2 text-sm text-brand-accent hover:underline font-medium">
                      <FileText size={16} /> عرض صورة الصك
                    </button>
                  )
                )}
              </Section>
            )}

            {/* review meta */}
            <div className="text-xs text-text-muted flex flex-wrap gap-x-6 gap-y-1">
              <span className="flex items-center gap-1"><Calendar size={12} /> أُرسل: {fmtDate(lead.createdAt)}</span>
              {lead.reviewedAt && <span className="flex items-center gap-1"><CheckCircle2 size={12} /> روجع: {fmtDate(lead.reviewedAt)}</span>}
              {lead.reviewedBy && <span>بواسطة: {lead.reviewedBy}</span>}
            </div>

            {/* Phase 5 — listing draft + fee snapshot (admin only) */}
            {['ACCEPTED', 'READY_FOR_FINAL_REVIEW'].includes(lead.status) && finForm && (() => {
              const tv = Number(finForm.totalValue) || 0
              const amt = (p) => { const n = Number(p); return Number.isFinite(n) && n > 0 ? Math.round(tv * n / 100 * 100) / 100 : 0 }
              const platformAmt = amt(finForm.platformFeePct)
              const mgmtAmt = finForm.managementFeePct !== '' ? amt(finForm.managementFeePct) : null
              const tokAmt = finForm.tokenizationFeePct !== '' ? amt(finForm.tokenizationFeePct) : null
              const feesSub = platformAmt + (mgmtAmt || 0) + (tokAmt || 0)
              const vatAmt = finForm.vatPct !== '' ? Math.round(feesSub * Number(finForm.vatPct) / 100 * 100) / 100 : null
              const totalFees = Math.round((feesSub + (vatAmt || 0)) * 100) / 100
              const amtByKey = { platformFeePct: platformAmt, managementFeePct: mgmtAmt, tokenizationFeePct: tokAmt, vatPct: vatAmt }
              const mismatch = finForm.totalValue && finForm.tokenPrice && finForm.totalTokens &&
                Math.abs(Number(finForm.totalValue) - Number(finForm.tokenPrice) * Number(finForm.totalTokens)) > 0.01
              const inputCls = 'w-full border border-border-soft rounded-lg px-2 py-1.5 text-sm focus:ring-1 focus:ring-brand-accent focus:border-brand-accent'
              return (
                <div className="rounded-2xl border border-border-soft bg-surface-card p-5 space-y-4">
                  <h3 className="text-sm font-bold text-brand-primary flex items-center gap-2"><Coins size={16} className="text-brand-accent" /> بيانات الإدراج والرسوم</h3>
                  {fin?.feesLockedAt && <p className="text-[11px] text-green-700">تم حفظ لقطة الرسوم بتاريخ {fmtDate(fin.feesLockedAt)}.</p>}

                  <div className="grid grid-cols-2 gap-3">
                    {FIN_LISTING_FIELDS.map(f => (
                      <label key={f.k} className="block">
                        <span className="block text-[11px] text-text-muted mb-0.5">{f.label}</span>
                        <input type="number" value={finForm[f.k]} onChange={e => setFinField(f.k, e.target.value)} className={inputCls} />
                      </label>
                    ))}
                  </div>
                  <input type="text" placeholder="ملاحظات الإدراج (اختياري)" value={finForm.listingNotes} onChange={e => setFinField('listingNotes', e.target.value)} className={inputCls} />
                  {mismatch && <p className="text-[11px] text-amber-600">تنبيه: القيمة النهائية لا تساوي سعر الحصة × عدد الحصص.</p>}

                  <div className="border-t border-border-soft pt-3 space-y-3">
                    <p className="text-xs font-bold text-brand-primary">رسوم الإدراج المعتمدة لهذا العقار (لقطة الرسوم)</p>
                    <div className="grid grid-cols-2 gap-3">
                      {FIN_FEE_FIELDS.map(f => (
                        <div key={f.k}>
                          <label className="block">
                            <span className="block text-[11px] text-text-muted mb-0.5">{f.label}</span>
                            <input type="number" value={finForm[f.k]} onChange={e => setFinField(f.k, e.target.value)} className={inputCls} />
                          </label>
                          <p className="text-[10px] text-text-muted mt-0.5">المبلغ: {amtByKey[f.k] != null ? fmtSar(amtByKey[f.k]) : '—'}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm font-bold text-brand-primary">إجمالي الرسوم: {fmtSar(totalFees)}</p>
                    <input type="text" placeholder="ملاحظات الرسوم (اختياري)" value={finForm.feeNotes} onChange={e => setFinField('feeNotes', e.target.value)} className={inputCls} />
                  </div>

                  <button onClick={saveFinalization} disabled={finSaving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-semibold hover:bg-brand-accent/90 transition-colors disabled:opacity-60">
                    {finSaving ? <Loader2 size={14} className="animate-spin" /> : <Coins size={14} />} حفظ بيانات الإدراج والرسوم
                  </button>
                </div>
              )
            })()}

            {/* actions */}
            <div className="rounded-2xl border border-border-soft bg-surface-card p-5">
              <h3 className="text-sm font-bold text-brand-primary flex items-center gap-2 mb-3"><Gavel size={16} /> إجراء المراجعة</h3>
              <label className="block text-xs font-semibold text-text-muted mb-1">ملاحظات المراجعة</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="اكتب ملاحظاتك للمالك أو للأرشيف الداخلي..."
                className="w-full border border-border-soft rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-accent focus:border-brand-accent resize-none mb-4" />
              <div className="grid grid-cols-2 gap-2">
                {(ADMIN_ACTIONS[lead.status] || []).map(a => {
                  const Icon = a.icon
                  return (
                    <button key={a.to} onClick={() => updateStatus(a.to)} disabled={!!saving}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${a.cls}`}>
                      {saving === a.to ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
                      {a.label}
                    </button>
                  )
                })}
              </div>
              {lead.status === 'NEEDS_INFO' && (
                <p className="text-xs text-text-muted mt-2">
                  يمكنك انتظار تحديث المالك أو متابعة المراجعة يدويًا.
                </p>
              )}
              {(ADMIN_ACTIONS[lead.status] || []).length === 0 && lead.status !== 'FINAL_APPROVED' && (
                <p className="text-xs text-text-muted">لا توجد إجراءات متاحة لهذه الحالة.</p>
              )}
              {lead.status === 'FINAL_APPROVED' && (
                <div className="mt-1">
                  <button onClick={convertLead} disabled={converting}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60">
                    {converting ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />} تحويل إلى عقار
                  </button>
                  <p className="text-[11px] text-text-muted mt-2">يُنشئ عقارًا بحالة مبدئية غير مرئية للمستثمرين حتى اعتماد الإدراج لاحقًا.</p>
                </div>
              )}
              <p className="text-[11px] text-text-muted mt-3 leading-relaxed">
                القبول المبدئي يعني الانتقال إلى الدراسة التفصيلية فقط — ولا يعني إدراج العقار أو ترميزه أو اعتماده للمستثمرين.
              </p>
            </div>

            {/* review history / audit timeline (read-only, admin-only) */}
            <div className="rounded-2xl border border-border-soft bg-surface-card p-5">
              <h3 className="text-sm font-bold text-brand-primary flex items-center gap-2 mb-3"><Clock size={16} className="text-brand-accent" /> سجل المراجعة</h3>
              {history.length === 0 ? (
                <p className="text-xs text-text-muted">لا يوجد سجل مراجعة بعد.</p>
              ) : (
                <ol className="space-y-3">
                  {history.map(h => {
                    const m = h.metadata || {}
                    const by = h.adminEmail || (m.actor === 'owner' ? 'المالك' : (h.adminId || '—'))
                    return (
                      <li key={h.id} className="border-r-2 border-brand-accent/40 pr-3">
                        <div className="text-sm font-semibold text-brand-primary">
                          تغيّر الحالة: <span className="font-normal text-text-muted">من</span> {statusLabel(m.fromStatus)} <span className="font-normal text-text-muted">إلى</span> {statusLabel(m.toStatus)}
                        </div>
                        {m.note && (
                          <div className="text-xs text-text-body mt-0.5"><span className="text-text-muted">ملاحظة:</span> {m.note}</div>
                        )}
                        {m.ownerResponseNote && (
                          <div className="text-xs text-text-body mt-1 bg-orange-50 border border-orange-200 rounded-lg p-2 whitespace-pre-line">
                            <span className="font-semibold text-orange-800">رد المالك:</span> {m.ownerResponseNote}
                          </div>
                        )}
                        <div className="text-[11px] text-text-muted mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                          <span>بواسطة: {by}</span>
                          <span>التاريخ: {fmtDate(h.createdAt)}</span>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-border-soft bg-surface-card p-5">
      <h3 className="text-sm font-bold text-brand-primary flex items-center gap-2 mb-3"><Icon size={16} className="text-brand-accent" /> {title}</h3>
      <div className="space-y-0">{children}</div>
    </div>
  )
}
function Row({ label, value, link }) {
  if (value === null || value === undefined || value === '') value = '—'
  return (
    <div className="flex gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-semibold text-text-muted w-40 flex-shrink-0">{label}</span>
      {link && value !== '—'
        ? <a href={value} target="_blank" rel="noreferrer" className="text-xs text-brand-accent hover:underline break-all">{value}</a>
        : <span className="text-xs text-text-body break-all">{String(value)}</span>}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminPropertyLeads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [detailId, setDetailId] = useState(null)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const url = filter === 'all' ? '/api/admin/property-leads' : `/api/admin/property-leads?status=${filter}`
      const data = await fetchJson(url, { headers: authHeader() })
      setLeads(Array.isArray(data) ? data : [])
    } catch {
      setError('تعذّر تحميل طلبات الفرص المبدئية.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500) }

  return (
    <div className="space-y-6" dir="rtl">
      {toast && (
        <div className={`fixed top-4 left-4 z-[60] flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{toast.msg}
        </div>
      )}

      {/* header */}
      <div className="bg-brand-primary text-white rounded-2xl p-8 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"><ClipboardList size={24} className="text-brand-accent" /></div>
          <div>
            <h1 className="text-2xl font-bold">طلبات الفرص المبدئية</h1>
            <p className="text-white/70 text-sm mt-1">مراجعة طلبات التقديم المبدئي للعقارات قبل الدراسة التفصيلية</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> تحديث
        </button>
      </div>

      {/* filters */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${filter === f.value ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-primary hover:text-brand-primary'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3"><Loader2 className="animate-spin text-brand-accent" size={28} /><span className="text-gray-500 text-sm">جارٍ التحميل...</span></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle className="text-red-400" size={32} /><p className="text-red-600 text-sm font-medium">{error}</p>
            <button onClick={load} className="text-sm text-brand-accent hover:underline font-medium">إعادة المحاولة</button>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center"><ClipboardList size={28} className="text-gray-400" /></div>
            <p className="text-gray-500 text-sm font-medium">لا توجد طلبات فرص مبدئية حتى الآن</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['مقدّم الطلب', 'العقار', 'الموقع', 'السعر', 'مؤجّر', 'الوضع القانوني', 'الدرجات', 'التوصية', 'الحالة', 'التاريخ', 'إجراء'].map(h => (
                    <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-gray-900">{l.fullName || '—'}</p>
                      <p className="text-xs text-gray-500">{APPLICANT[l.applicantType] || l.applicantType || '—'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-800">{l.propertyName || '—'}</p>
                      <p className="text-xs text-gray-500">{PROPERTY_TYPES[l.propertyType] || l.propertyType || '—'}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-xs text-gray-700">{CITIES[l.city] || l.city || '—'}</p>
                      <p className="text-xs text-gray-400">{l.district || ''}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap"><p className="text-sm font-bold text-gray-900">{fmtSar(l.requestedPrice)}</p></td>
                    <td className="px-4 py-4 text-xs text-gray-700">{l.isLeased == null ? '—' : (l.isLeased ? 'نعم' : 'لا')}</td>
                    <td className="px-4 py-4"><LegalChips lead={l} /></td>
                    <td className="px-4 py-4">
                      <div className="flex gap-3">
                        <ScorePill value={l.qualificationScore} label="تأهيل" />
                        <ScorePill value={l.tokenizationSuitabilityScore} label="ترميز" />
                      </div>
                    </td>
                    <td className="px-4 py-4"><RecBadge rec={l.internalRecommendation} /></td>
                    <td className="px-4 py-4"><StatusBadge status={l.status} /></td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">{fmtDate(l.createdAt)}</td>
                    <td className="px-4 py-4">
                      <button onClick={() => setDetailId(l.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-semibold rounded-lg transition-colors">
                        <Eye size={13} /> التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailId && (
        <DetailPanel id={detailId} onClose={() => setDetailId(null)} onUpdated={load} showToast={showToast} />
      )}
    </div>
  )
}
