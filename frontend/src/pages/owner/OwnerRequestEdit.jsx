import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Loader2, ArrowRight, Upload, X, FileText, Send } from 'lucide-react'
import { fetchJson, authHeader, apiUrl } from '../../lib/api'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const MAX_IMAGES = 5

const PROPERTY_TYPES = [
  { v: 'land', l: 'أرض' }, { v: 'apartment', l: 'شقة' }, { v: 'building', l: 'عمارة' },
  { v: 'villa', l: 'فيلا' }, { v: 'warehouse', l: 'مستودع' }, { v: 'farm', l: 'مزرعة' },
  { v: 'commercial', l: 'تجاري' }, { v: 'other', l: 'أخرى' },
]
const CITIES = [
  { v: 'riyadh', l: 'الرياض' }, { v: 'jeddah', l: 'جدة' }, { v: 'dammam', l: 'الدمام' },
  { v: 'khobar', l: 'الخبر' }, { v: 'mecca', l: 'مكة المكرمة' }, { v: 'medina', l: 'المدينة المنورة' },
]
const APPLICANT_TYPES = [{ v: 'owner', l: 'مالك' }, { v: 'developer', l: 'مطوّر عقاري' }]

const UPLOAD_ERROR_BY_STATUS = {
  401: 'انتهت جلستك أو لم تسجّل الدخول. سجّل الدخول كمالك ثم حاول مجدداً.',
  403: 'ليست لديك صلاحية رفع هذا الملف. يرجى تسجيل الدخول كمالك أو التواصل مع الدعم.',
  413: 'حجم الملف يتجاوز 10 ميجابايت.',
  415: 'صيغة الملف غير مدعومة. المسموح: JPG أو PNG أو WEBP أو PDF.',
  500: 'تعذر رفع الملف حاليًا. يرجى المحاولة لاحقًا.',
}

async function uploadOne(file) {
  const fd = new FormData()
  fd.append('file', file)
  let res
  try {
    res = await fetch(apiUrl('/api/property-leads/upload'), { method: 'POST', headers: authHeader(), body: fd })
  } catch {
    throw new Error('تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مجدداً.')
  }
  if (!res.ok) throw new Error(UPLOAD_ERROR_BY_STATUS[res.status] || 'تعذّر رفع الملف. حاول مرة أخرى.')
  const json = await res.json().catch(() => ({}))
  // Phase 2a: backend returns an S3 document object (key, not a public URL).
  if (!json.key) throw new Error('تعذّر رفع الملف. حاول مرة أخرى.')
  return { key: json.key, filename: json.filename || file.name, mimeType: json.mimeType, size: json.size, uploadedAt: json.uploadedAt, name: json.filename || file.name }
}

// A document ref may be: a legacy local URL string ("/api/uploads/..."), an S3
// key string ("property-leads/..."), or a new upload object { key, name }.
const isLegacyRef = (ref) => typeof ref === 'string' && ref.startsWith('/api/uploads')
const refToKey = (ref) => (typeof ref === 'string' ? ref : (ref && ref.key) || '')

// Owner may edit/resubmit a lead that is NEEDS_INFO (respond to an info request) or
// READY_FOR_FINAL_REVIEW (supplement info/documents during final-review preparation).
const EDITABLE_STATUSES = ['NEEDS_INFO', 'READY_FOR_FINAL_REVIEW']

export default function OwnerRequestEdit() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [lead, setLead] = useState(null)
  const [form, setForm] = useState(null)
  const [images, setImages] = useState([])       // array of url strings
  const [deedUrl, setDeedUrl] = useState('')
  const [ownerResponseNote, setOwnerResponseNote] = useState('')
  const [uploading, setUploading] = useState('')  // '' | 'images' | 'deed'
  const [uploadError, setUploadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const imgInput = useRef(null)
  const deedInput = useRef(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true); setLoadError('')
      try {
        const data = await fetchJson(`/api/property-leads/${id}`, { headers: authHeader() })
        if (!alive) return
        setLead(data)
        setForm({
          applicantType: data.applicantType || 'owner',
          fullName: data.fullName || '',
          companyName: data.companyName || '',
          phone: data.phone || '',
          email: data.email || '',
          propertyName: data.propertyName || '',
          propertyType: data.propertyType || '',
          city: data.city || '',
          district: data.district || '',
          googleMapsUrl: data.googleMapsUrl || '',
          requestedPrice: data.requestedPrice ?? '',
          isPriceNegotiable: !!data.isPriceNegotiable,
          shortDescription: data.shortDescription || '',
          landArea: data.landArea ?? '',
          buildingArea: data.buildingArea ?? '',
          buildingYear: data.buildingYear ?? '',
          isLeased: !!data.isLeased,
          annualRent: data.annualRent ?? '',
          leaseExpiryDate: data.leaseExpiryDate ? String(data.leaseExpiryDate).slice(0, 10) : '',
          hasMortgage: !!data.hasMortgage,
          hasOwnershipPartner: !!data.hasOwnershipPartner,
          hasLegalDispute: !!data.hasLegalDispute,
          noLegalIssues: !!data.noLegalIssues,
        })
        setImages(Array.isArray(data.imageUrls) ? data.imageUrls.filter(Boolean) : [])
        setDeedUrl(data.deedImageUrl || '')
      } catch (e) {
        if (alive) setLoadError('تعذّر تحميل الطلب. تأكد من الرابط أو حاول مرة أخرى.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const onAddImages = async (e) => {
    const files = Array.from(e.target.files || [])
    if (imgInput.current) imgInput.current.value = ''
    if (!files.length) return
    setUploadError(''); setUploading('images')
    try {
      for (const file of files) {
        if (images.length >= MAX_IMAGES) { setUploadError(`الحد الأقصى ${MAX_IMAGES} صور.`); break }
        const doc = await uploadOne(file)
        setImages(prev => (prev.length >= MAX_IMAGES ? prev : [...prev, doc]))
      }
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading('')
    }
  }

  const onAddDeed = async (e) => {
    const file = (e.target.files || [])[0]
    if (deedInput.current) deedInput.current.value = ''
    if (!file) return
    setUploadError(''); setUploading('deed')
    try { const doc = await uploadOne(file); setDeedUrl(doc.key) }
    catch (err) { setUploadError(err.message) }
    finally { setUploading('') }
  }

  // Open a document: legacy URLs open directly; S3 keys are resolved to a
  // short-lived owner-scoped signed URL first (owner endpoint enforces ownership).
  const openDoc = async (ref) => {
    if (isLegacyRef(ref)) { window.open(`${API_BASE}${ref}`, '_blank', 'noopener'); return }
    const key = refToKey(ref)
    if (!key) return
    try {
      const r = await fetchJson(`/api/property-leads/${id}/documents/url?key=${encodeURIComponent(key)}`, { headers: authHeader() })
      if (r?.url) window.open(r.url, '_blank', 'noopener')
    } catch { /* surfaced elsewhere; keep UI simple */ }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitError(''); setSubmitting(true)
    try {
      await fetchJson(`/api/property-leads/${id}/resubmit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          ...form,
          imageUrls: images,
          deedImageUrl: deedUrl || undefined,
          ownerResponseNote: ownerResponseNote.trim() || undefined,
        }),
      })
      navigate('/owner/requests', { state: { message: isFinalReview ? 'تم إرسال معلومات الاعتماد النهائي' : 'تم إعادة إرسال الطلب للمراجعة' } })
    } catch (err) {
      setSubmitError(err?.message || 'تعذّر إعادة إرسال الطلب. حاول مرة أخرى.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-brand-accent" size={44} /></div>
  }
  if (loadError) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2">
          <AlertCircle className="text-red-600" size={20} /><span className="text-red-700">{loadError}</span>
        </div>
        <button onClick={() => navigate('/owner/requests')} className="text-brand-accent font-semibold">← العودة إلى طلباتي</button>
      </div>
    )
  }

  // Guard: only NEEDS_INFO or READY_FOR_FINAL_REVIEW leads are editable.
  const statusKey = lead?.adminStatus || lead?.status
  const isFinalReview = statusKey === 'READY_FOR_FINAL_REVIEW'
  if (!EDITABLE_STATUSES.includes(statusKey)) {
    return (
      <div className="space-y-4 max-w-xl">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="font-bold text-amber-800 mb-1">لا يمكن تعديل هذا الطلب حالياً</p>
          <p className="text-sm text-amber-700">لا يمكن تعديل هذا الطلب في حالته الحالية.</p>
        </div>
        <button onClick={() => navigate('/owner/requests')} className="inline-flex items-center gap-2 text-brand-accent font-semibold">
          <ArrowRight size={16} /> العودة إلى طلباتي
        </button>
      </div>
    )
  }

  const field = 'w-full px-3 py-2.5 rounded-xl border border-border-soft focus:border-brand-accent focus:outline-none text-sm'
  const lbl = 'block text-sm font-medium text-text-body mb-1'
  const Check = ({ k, label }) => (
    <label className="flex items-center gap-2 text-sm text-text-body cursor-pointer">
      <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} className="w-4 h-4 accent-brand-accent" />
      {label}
    </label>
  )

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-primary">
          {isFinalReview ? 'إضافة معلومات للاعتماد النهائي' : 'تحديث الطلب'}
        </h1>
        <p className="text-text-muted mt-1">
          {isFinalReview
            ? 'يمكنك إضافة التوضيحات أو المستندات المطلوبة أثناء دراسة الفرصة للاعتماد النهائي.'
            : 'عدّل البيانات المطلوبة وأعد إرسال الطلب لفريق الوسم.'}
        </p>
      </div>

      {/* Admin note (shown when there is a note, or always for the NEEDS_INFO flow) */}
      {(lead.reviewNotes || !isFinalReview) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={18} className="text-orange-600" />
            <p className="font-bold text-orange-800">ملاحظات فريق الوسم</p>
          </div>
          <p className="text-sm text-orange-800 whitespace-pre-line">
            {lead.reviewNotes || 'طُلبت معلومات إضافية. يرجى مراجعة بيانات الطلب واستكمال ما ينقص ثم إعادة الإرسال.'}
          </p>
        </div>
      )}

      {/* Owner response to the admin note */}
      <div className="bg-white border border-border-soft rounded-2xl shadow-card p-5 space-y-2">
        <label className="block text-sm font-bold text-brand-primary">ردك على ملاحظة فريق الوسم</label>
        <textarea
          rows={3}
          maxLength={1000}
          className="w-full px-3 py-2.5 rounded-xl border border-border-soft focus:border-brand-accent focus:outline-none text-sm"
          placeholder="اكتب التوضيح أو المعلومات المطلوبة..."
          value={ownerResponseNote}
          onChange={e => setOwnerResponseNote(e.target.value)}
        />
        <p className="text-xs text-text-muted text-left">{ownerResponseNote.length}/1000</p>
      </div>

      {/* Property basics */}
      <section className="bg-white border border-border-soft rounded-2xl shadow-card p-5 space-y-4">
        <h2 className="font-bold text-brand-primary">بيانات الفرصة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={lbl}>نوع مقدّم الطلب</label>
            <select className={field} value={form.applicantType} onChange={e => set('applicantType', e.target.value)}>
              {APPLICANT_TYPES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
          <div><label className={lbl}>الاسم الكامل</label>
            <input className={field} value={form.fullName} onChange={e => set('fullName', e.target.value)} /></div>
          <div><label className={lbl}>اسم الشركة (اختياري)</label>
            <input className={field} value={form.companyName} onChange={e => set('companyName', e.target.value)} /></div>
          <div><label className={lbl}>رقم الجوال</label>
            <input className={field} value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          <div><label className={lbl}>البريد الإلكتروني (اختياري)</label>
            <input className={field} value={form.email} onChange={e => set('email', e.target.value)} /></div>
          <div><label className={lbl}>اسم العقار</label>
            <input className={field} value={form.propertyName} onChange={e => set('propertyName', e.target.value)} /></div>
          <div><label className={lbl}>نوع العقار</label>
            <select className={field} value={form.propertyType} onChange={e => set('propertyType', e.target.value)}>
              <option value="">اختر…</option>
              {PROPERTY_TYPES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
          <div><label className={lbl}>المدينة</label>
            <select className={field} value={form.city} onChange={e => set('city', e.target.value)}>
              <option value="">اختر…</option>
              {CITIES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
          <div><label className={lbl}>الحي</label>
            <input className={field} value={form.district} onChange={e => set('district', e.target.value)} /></div>
          <div><label className={lbl}>رابط الموقع (Google Maps)</label>
            <input className={field} value={form.googleMapsUrl} onChange={e => set('googleMapsUrl', e.target.value)} /></div>
          <div><label className={lbl}>السعر المطلوب (ر.س)</label>
            <input type="number" className={field} value={form.requestedPrice} onChange={e => set('requestedPrice', e.target.value)} /></div>
          <div className="flex items-end"><Check k="isPriceNegotiable" label="السعر قابل للتفاوض" /></div>
        </div>
        <div><label className={lbl}>وصف مختصر</label>
          <textarea rows={3} className={field} value={form.shortDescription} onChange={e => set('shortDescription', e.target.value)} /></div>
      </section>

      {/* Details */}
      <section className="bg-white border border-border-soft rounded-2xl shadow-card p-5 space-y-4">
        <h2 className="font-bold text-brand-primary">تفاصيل إضافية</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className={lbl}>مساحة الأرض (م²)</label>
            <input type="number" className={field} value={form.landArea} onChange={e => set('landArea', e.target.value)} /></div>
          <div><label className={lbl}>مساحة البناء (م²)</label>
            <input type="number" className={field} value={form.buildingArea} onChange={e => set('buildingArea', e.target.value)} /></div>
          <div><label className={lbl}>عمر العقار (سنوات)</label>
            <input type="number" className={field} value={form.buildingYear} onChange={e => set('buildingYear', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Check k="isLeased" label="العقار مؤجَّر حالياً" />
          <div><label className={lbl}>الإيجار السنوي (ر.س)</label>
            <input type="number" className={field} value={form.annualRent} onChange={e => set('annualRent', e.target.value)} disabled={!form.isLeased} /></div>
          <div><label className={lbl}>تاريخ انتهاء العقد</label>
            <input type="date" className={field} value={form.leaseExpiryDate} onChange={e => set('leaseExpiryDate', e.target.value)} disabled={!form.isLeased} /></div>
        </div>
      </section>

      {/* Legal */}
      <section className="bg-white border border-border-soft rounded-2xl shadow-card p-5 space-y-3">
        <h2 className="font-bold text-brand-primary">الحالة النظامية</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Check k="hasMortgage" label="يوجد رهن على العقار" />
          <Check k="hasOwnershipPartner" label="يوجد شريك في الملكية" />
          <Check k="hasLegalDispute" label="يوجد نزاع قضائي" />
          <Check k="noLegalIssues" label="لا توجد أي مشاكل نظامية" />
        </div>
      </section>

      {/* Documents */}
      <section className="bg-white border border-border-soft rounded-2xl shadow-card p-5 space-y-4">
        <h2 className="font-bold text-brand-primary">المستندات</h2>
        {uploadError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle size={15} /> {uploadError}
          </div>
        )}
        {/* Images */}
        <div>
          <label className={lbl}>صور العقار ({images.length}/{MAX_IMAGES})</label>
          <div className="flex flex-wrap gap-3">
            {images.map((it, i) => (
              <div key={i} className="relative">
                {isLegacyRef(it) ? (
                  <img src={`${API_BASE}${it}`} alt="" className="w-24 h-24 object-cover rounded-xl border border-border-soft" />
                ) : (
                  <button type="button" onClick={() => openDoc(it)}
                    className="w-24 h-24 rounded-xl border border-border-soft bg-surface-muted flex flex-col items-center justify-center gap-1 text-brand-accent hover:border-brand-accent">
                    <FileText size={20} /><span className="text-[10px] text-text-muted">عرض الصورة</span>
                  </button>
                )}
                <button type="button" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-2 -left-2 bg-red-600 text-white rounded-full p-0.5"><X size={14} /></button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <button type="button" onClick={() => imgInput.current?.click()} disabled={uploading === 'images'}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-border-soft flex flex-col items-center justify-center text-text-muted hover:border-brand-accent">
                {uploading === 'images' ? <Loader2 size={20} className="animate-spin" /> : <><Upload size={18} /><span className="text-xs mt-1">إضافة</span></>}
              </button>
            )}
          </div>
          <input ref={imgInput} type="file" accept="image/*" multiple className="hidden" onChange={onAddImages} />
        </div>
        {/* Deed */}
        <div>
          <label className={lbl}>صك الملكية</label>
          {deedUrl ? (
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => openDoc(deedUrl)} className="inline-flex items-center gap-2 text-brand-accent text-sm font-medium">
                <FileText size={16} /> عرض الصك المرفوع
              </button>
              <button type="button" onClick={() => setDeedUrl('')} className="text-red-600 text-sm">إزالة</button>
            </div>
          ) : (
            <button type="button" onClick={() => deedInput.current?.click()} disabled={uploading === 'deed'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border-soft text-sm text-text-body hover:border-brand-accent">
              {uploading === 'deed' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} رفع الصك (PDF/صورة)
            </button>
          )}
          <input ref={deedInput} type="file" accept="image/*,application/pdf" className="hidden" onChange={onAddDeed} />
        </div>
      </section>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2">
          <AlertCircle className="text-red-600" size={20} /><span className="text-red-700">{submitError}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={submitting || uploading}
          className="inline-flex items-center gap-2 px-7 py-3 bg-brand-accent text-white rounded-xl font-semibold hover:bg-brand-accent/90 transition-all disabled:opacity-60">
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {isFinalReview ? 'إرسال معلومات الاعتماد النهائي' : 'إرسال الرد والتحديث'}
        </button>
        <button type="button" onClick={() => navigate('/owner/requests')} className="px-5 py-3 text-text-muted font-medium">إلغاء</button>
      </div>
    </form>
  )
}
