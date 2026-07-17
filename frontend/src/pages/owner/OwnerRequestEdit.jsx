import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Loader2, ArrowRight, Upload, X, FileText, Send } from 'lucide-react'
import { fetchJson, authHeader } from '../../lib/api'

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
}

async function uploadOne(file) {
  const fd = new FormData()
  fd.append('file', file)
  let res
  try {
    res = await fetch(`${API_BASE}/api/property-leads/upload`, { method: 'POST', headers: authHeader(), body: fd })
  } catch {
    throw new Error('تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مجدداً.')
  }
  if (!res.ok) throw new Error(UPLOAD_ERROR_BY_STATUS[res.status] || 'تعذّر رفع الملف. حاول مرة أخرى.')
  const json = await res.json().catch(() => ({}))
  if (!json.fileUrl) throw new Error('تعذّر رفع الملف. حاول مرة أخرى.')
  return json.fileUrl
}

// Owner may only edit/resubmit a lead that is currently NEEDS_INFO.
const EDITABLE_STATUS = 'NEEDS_INFO'

export default function OwnerRequestEdit() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [lead, setLead] = useState(null)
  const [form, setForm] = useState(null)
  const [images, setImages] = useState([])       // array of url strings
  const [deedUrl, setDeedUrl] = useState('')
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
        const url = await uploadOne(file)
        setImages(prev => (prev.length >= MAX_IMAGES ? prev : [...prev, url]))
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
    try { setDeedUrl(await uploadOne(file)) }
    catch (err) { setUploadError(err.message) }
    finally { setUploading('') }
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
        }),
      })
      navigate('/owner/requests', { state: { message: 'تم إعادة إرسال الطلب للمراجعة' } })
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

  // Guard: only NEEDS_INFO leads are editable.
  const statusKey = lead?.adminStatus || lead?.status
  if (statusKey !== EDITABLE_STATUS) {
    return (
      <div className="space-y-4 max-w-xl">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="font-bold text-amber-800 mb-1">لا يمكن تعديل هذا الطلب حالياً</p>
          <p className="text-sm text-amber-700">
            التعديل متاح فقط عندما يطلب فريق الوسم معلومات إضافية. الطلب حالياً قيد الدراسة أو تمّت معالجته.
          </p>
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
        <h1 className="text-2xl font-bold text-brand-primary">تحديث طلب التقديم</h1>
        <p className="text-text-muted mt-1">عدّل البيانات المطلوبة وأعد إرسال الطلب لفريق الوسم.</p>
      </div>

      {/* Admin note */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle size={18} className="text-orange-600" />
          <p className="font-bold text-orange-800">ملاحظات فريق الوسم</p>
        </div>
        <p className="text-sm text-orange-800 whitespace-pre-line">
          {lead.reviewNotes || 'طُلبت معلومات إضافية. يرجى مراجعة بيانات الطلب واستكمال ما ينقص ثم إعادة الإرسال.'}
        </p>
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
            {images.map((url, i) => (
              <div key={i} className="relative">
                <img src={`${API_BASE}${url}`} alt="" className="w-24 h-24 object-cover rounded-xl border border-border-soft" />
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
              <a href={`${API_BASE}${deedUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-brand-accent text-sm font-medium">
                <FileText size={16} /> عرض الصك المرفوع
              </a>
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
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} إعادة إرسال الطلب
        </button>
        <button type="button" onClick={() => navigate('/owner/requests')} className="px-5 py-3 text-text-muted font-medium">إلغاء</button>
      </div>
    </form>
  )
}
