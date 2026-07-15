import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Send, Loader, CheckCircle2, AlertCircle,
  User, Coins, Image as ImageIcon, FileCheck, X, UploadCloud
} from 'lucide-react'
import { fetchJson, authHeader } from '../../lib/api'

// ============================================================================
// OwnerOpportunityLeadForm — طلب التقديم المبدئي للفرصة العقارية
// A lightweight, owner-facing preliminary submission based on the approved
// prototype (owner_onboarding_final.html). Posts to POST /api/property-leads.
// This is NOT the full property wizard: no tokenization / IBAN / valuation /
// ROI / token price. Internal admin scores are never requested or displayed.
// ============================================================================

const API_BASE = import.meta.env.VITE_API_BASE || ''
const TOTAL_STEPS = 5 // 4 input steps + success
const MAX_IMAGES = 5
const MAX_FILE_MB = 10
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const STEP_META = [
  { n: 1, title: 'بيانات المالك',              subtitle: 'معلومات التواصل والعقار الأساسية', icon: User },
  { n: 2, title: 'البيانات المالية والقانونية', subtitle: 'السعر والحالة المالية والقانونية', icon: Coins },
  { n: 3, title: 'صور العقار',                  subtitle: 'أضف صورة الصك وصور العقار (اختياري)', icon: ImageIcon },
  { n: 4, title: 'التأكيد والموافقة',           subtitle: 'مراجعة الإقرارات وإرسال الطلب',     icon: FileCheck },
]

const PROPERTY_TYPES = [
  { value: 'land',      label: 'أرض' },
  { value: 'apartment', label: 'شقة' },
  { value: 'building',  label: 'عمارة' },
  { value: 'warehouse', label: 'مستودع' },
  { value: 'farm',      label: 'مزرعة' },
  { value: 'other',     label: 'أخرى' },
]
const CITIES = [
  { value: 'riyadh', label: 'الرياض' },
  { value: 'jeddah', label: 'جدة' },
  { value: 'dammam', label: 'الدمام' },
  { value: 'khobar', label: 'الخبر' },
]

const EMPTY = {
  applicantType: '', companyName: '', fullName: '', email: '', phone: '',
  propertyName: '', propertyType: '', googleMapsUrl: '', city: '', district: '',
  landArea: '', buildingYear: '', shortDescription: '',
  requestedPrice: '', isPriceNegotiable: false,
  isLeased: null, annualRent: '', leaseExpiryDate: '',
  hasMortgage: null, hasOwnershipPartner: null, hasLegalDispute: null, noLegalIssues: false,
}

export default function OwnerOpportunityLeadForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [data, setData] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [images, setImages] = useState([])       // [{ url, name }]
  const [deed, setDeed] = useState(null)         // { url, name } | null
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const topRef = useRef(null)

  const set = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const scrollToFirstError = () => {
    setTimeout(() => {
      const el = document.querySelector('[data-error="true"]')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      else topRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 40)
  }

  // ── validation ─────────────────────────────────────────────────────────────
  const validateStep = (s) => {
    const e = {}
    if (s === 1) {
      if (!data.applicantType) e.applicantType = 'الرجاء اختيار صفة مقدّم الطلب'
      if (!data.fullName.trim()) e.fullName = 'الرجاء إدخال الاسم الكامل'
      if (!data.phone.trim()) e.phone = 'الرجاء إدخال رقم الجوال'
      if (data.email.trim() && !EMAIL_RE.test(data.email.trim())) e.email = 'صيغة البريد الإلكتروني غير صحيحة'
      if (!data.propertyName.trim()) e.propertyName = 'الرجاء إدخال اسم/عنوان العقار'
      if (!data.propertyType) e.propertyType = 'الرجاء اختيار نوع العقار'
      if (!data.googleMapsUrl.trim()) e.googleMapsUrl = 'الرجاء لصق رابط الموقع من خرائط قوقل'
      if (!data.city) e.city = 'الرجاء اختيار المدينة'
      if (!data.district.trim()) e.district = 'الرجاء إدخال الحي'
      if (!data.shortDescription.trim()) e.shortDescription = 'الرجاء إدخال وصف مختصر للعقار'
    }
    if (s === 2) {
      const price = Number(data.requestedPrice)
      if (!data.requestedPrice || !Number.isFinite(price) || price <= 0) e.requestedPrice = 'أدخل السعر المطلوب كرقم موجب'
      if (data.isLeased === true && data.annualRent) {
        const rent = Number(data.annualRent)
        if (!Number.isFinite(rent) || rent <= 0) e.annualRent = 'قيمة الإيجار السنوي يجب أن تكون رقماً موجباً'
      }
    }
    if (s === 4) {
      if (!data.dataAccuracyConfirmed) e.dataAccuracyConfirmed = 'مطلوب'
      if (!data.reviewConsentConfirmed) e.reviewConsentConfirmed = 'مطلوب'
      if (!data.noAcceptanceGuaranteeConfirmed) e.noAcceptanceGuaranteeConfirmed = 'مطلوب'
    }
    setErrors(e)
    if (Object.keys(e).length) { scrollToFirstError(); return false }
    return true
  }

  const next = () => {
    if (!validateStep(step)) return
    setStep(s => Math.min(TOTAL_STEPS, s + 1))
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  const back = () => {
    setStep(s => Math.max(1, s - 1))
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // ── uploads (dedicated lead endpoint; store returned URLs only) ─────────────
  const UPLOAD_ERROR_BY_STATUS = {
    401: 'انتهت جلستك أو لم تسجّل الدخول. سجّل الدخول كمالك ثم حاول مجدداً.',
    403: 'ليست لديك صلاحية رفع هذا الملف. يرجى تسجيل الدخول كمالك أو التواصل مع الدعم.',
    413: `حجم الملف يتجاوز ${MAX_FILE_MB} ميجابايت.`,
    415: 'صيغة الملف غير مدعومة. المسموح: JPG أو PNG أو WEBP أو PDF.',
  }
  const uploadOne = async (file, documentType) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('documentType', documentType)
    let res
    try {
      res = await fetch(`${API_BASE}/api/property-leads/upload`, {
        method: 'POST', headers: authHeader(), body: fd,
      })
    } catch {
      throw new Error('تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مجدداً.')
    }
    if (!res.ok) {
      throw new Error(UPLOAD_ERROR_BY_STATUS[res.status] || 'تعذّر رفع الملف. حاول مرة أخرى.')
    }
    const json = await res.json().catch(() => ({}))
    if (!json.fileUrl) throw new Error('تعذّر رفع الملف. حاول مرة أخرى.')
    return { url: json.fileUrl, name: file.name }
  }

  const onPickImages = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setUploadError('')
    if (images.length + files.length > MAX_IMAGES) {
      setUploadError(`الحد الأقصى ${MAX_IMAGES} صور للعقار`)
      return
    }
    setUploading(true)
    try {
      const uploaded = []
      for (const f of files) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
          setUploadError('صيغة غير مدعومة. المسموح: JPG أو PNG'); continue
        }
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
          setUploadError(`حجم الملف يتجاوز ${MAX_FILE_MB}MB: ${f.name}`); continue
        }
        uploaded.push(await uploadOne(f, 'leadPropertyImage'))
      }
      setImages(prev => [...prev, ...uploaded])
    } catch (err) {
      setUploadError(err?.message || 'تعذّر رفع الصور. حاول مرة أخرى.')
    } finally {
      setUploading(false)
    }
  }

  const onPickDeed = async (e) => {
    const file = (e.target.files || [])[0]
    e.target.value = ''
    if (!file) return
    setUploadError('')
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      setUploadError('صيغة الصك غير مدعومة. المسموح: JPG أو PNG أو PDF'); return
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setUploadError(`حجم ملف الصك يتجاوز ${MAX_FILE_MB}MB`); return
    }
    setUploading(true)
    try {
      setDeed(await uploadOne(file, 'leadDeed'))
    } catch (err) {
      setUploadError(err?.message || 'تعذّر رفع صورة الصك. حاول مرة أخرى.')
    } finally {
      setUploading(false)
    }
  }

  // ── submit ───────────────────────────────────────────────────────────────
  const buildPayload = () => {
    const p = {
      applicantType: data.applicantType,
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      propertyName: data.propertyName.trim(),
      propertyType: data.propertyType,
      city: data.city,
      district: data.district.trim(),
      googleMapsUrl: data.googleMapsUrl.trim(),
      requestedPrice: Number(data.requestedPrice),
      shortDescription: data.shortDescription.trim(),
      dataAccuracyConfirmed: true,
      reviewConsentConfirmed: true,
      noAcceptanceGuaranteeConfirmed: true,
      isPriceNegotiable: !!data.isPriceNegotiable,
      noLegalIssues: !!data.noLegalIssues,
    }
    if (data.companyName.trim()) p.companyName = data.companyName.trim()
    if (data.email.trim()) p.email = data.email.trim()
    if (data.landArea) p.landArea = Number(data.landArea)
    if (data.buildingYear) p.buildingYear = Number(data.buildingYear)
    if (data.isLeased !== null) p.isLeased = data.isLeased
    if (data.isLeased === true && data.annualRent) p.annualRent = Number(data.annualRent)
    if (data.isLeased === true && data.leaseExpiryDate) p.leaseExpiryDate = data.leaseExpiryDate
    if (data.hasMortgage !== null) p.hasMortgage = data.hasMortgage
    if (data.hasOwnershipPartner !== null) p.hasOwnershipPartner = data.hasOwnershipPartner
    if (data.hasLegalDispute !== null) p.hasLegalDispute = data.hasLegalDispute
    if (images.length) p.imageUrls = images.map(i => i.url)
    if (deed) p.deedImageUrl = deed.url
    return p
  }

  const submit = async () => {
    if (!validateStep(4)) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await fetchJson('/api/property-leads', {
        method: 'POST',
        headers: { ...authHeader() },
        body: JSON.stringify(buildPayload()),
      })
      setStep(5)
      topRef.current?.scrollIntoView({ behavior: 'smooth' })
    } catch (err) {
      setSubmitError(err?.data?.message || 'تعذّر إرسال الطلب. تحقق من اتصالك وحاول مرة أخرى.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetAll = () => {
    setData(EMPTY); setImages([]); setDeed(null); setErrors({})
    setSubmitError(''); setUploadError(''); setStep(1)
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const percent = Math.round((step / TOTAL_STEPS) * 100)

  return (
    <div className="min-h-screen bg-surface-base py-8" dir="rtl">
      <div className="max-w-2xl mx-auto px-4" ref={topRef}>
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-sm font-semibold text-brand-accent tracking-widest mb-1">ALWSM · الوسم</p>
          <h1 className="text-3xl font-bold text-brand-primary mb-2">طلب تقديم فرصة عقارية</h1>
          <p className="text-text-muted">مرحبًا بكم في الوسم — شارك فرصتك الاستثمارية للمراجعة المبدئية</p>
        </div>

        {/* Progress (hidden on success) */}
        {step < 5 && (
          <div className="bg-surface-card rounded-2xl shadow-card p-4 mb-6">
            <div className="flex items-center justify-between text-sm font-semibold text-text-muted mb-2">
              <span>الخطوة {step} من {TOTAL_STEPS}</span>
              <span>{percent}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
              <div className="h-full rounded-full bg-brand-accent transition-all duration-500" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-surface-card rounded-2xl shadow-card p-6 sm:p-8 mb-6">
          {step <= 4 && <StepHeader meta={STEP_META[step - 1]} />}

          {step === 1 && <Step1 data={data} set={set} errors={errors} />}
          {step === 2 && <Step2 data={data} set={set} errors={errors} />}
          {step === 3 && (
            <Step3
              images={images} deed={deed} uploading={uploading} uploadError={uploadError}
              onPickImages={onPickImages} onPickDeed={onPickDeed}
              removeImage={(i) => setImages(prev => prev.filter((_, idx) => idx !== i))}
              removeDeed={() => setDeed(null)}
            />
          )}
          {step === 4 && <Step4 data={data} set={set} errors={errors} submitError={submitError} />}
          {step === 5 && <SuccessStep onReset={resetAll} onGoProperties={() => navigate('/owner/properties')} />}
        </div>

        {/* Navigation */}
        {step <= 4 && (
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={back}
              disabled={step === 1}
              className="flex items-center gap-2 px-6 py-3 border border-border-soft text-text-muted rounded-xl font-medium hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight size={18} /> رجوع
            </button>

            {step < 4 ? (
              <button
                onClick={next}
                disabled={uploading}
                className="flex items-center gap-2 px-8 py-3 bg-brand-accent text-white rounded-xl font-semibold hover:bg-brand-accent/90 disabled:opacity-50 transition-all shadow-lg"
              >
                التالي <ArrowLeft size={18} />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 bg-brand-accent text-white rounded-xl font-semibold hover:bg-brand-accent/90 disabled:opacity-50 transition-all shadow-lg"
              >
                {submitting ? (<><Loader className="animate-spin" size={18} /> جارٍ الإرسال...</>) : (<><Send size={18} /> إرسال الطلب</>)}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── shared sub-components ─────────────────────────────────────────────────────
function StepHeader({ meta }) {
  const Icon = meta.icon
  return (
    <div className="flex items-center gap-4 pb-5 mb-6 border-b border-border-soft">
      <div className="w-12 h-12 bg-brand-accent-soft rounded-2xl flex items-center justify-center flex-shrink-0">
        <Icon className="text-brand-accent" size={24} />
      </div>
      <div>
        <h2 className="text-xl font-bold text-brand-primary">{meta.title}</h2>
        <p className="text-sm text-text-muted mt-0.5">{meta.subtitle}</p>
      </div>
    </div>
  )
}

function Field({ label, required, error, children, hint }) {
  return (
    <div data-error={error ? 'true' : undefined}>
      <label className="block text-sm font-semibold text-text-body mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

const inputCls =
  'w-full border border-border-soft rounded-xl px-4 py-3 bg-surface-card focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors'

function TextInput({ value, onChange, error, ...rest }) {
  return <input value={value} onChange={e => onChange(e.target.value)} className={`${inputCls} ${error ? 'border-red-400' : ''}`} {...rest} />
}
function SelectInput({ value, onChange, error, options, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={`${inputCls} ${error ? 'border-red-400' : ''}`}>
      <option value="">{placeholder || 'اختر...'}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
function YesNo({ value, onChange }) {
  const opts = [{ v: false, l: 'لا' }, { v: true, l: 'نعم' }]
  return (
    <div className="flex gap-2">
      {opts.map(o => (
        <button
          key={String(o.v)} type="button" onClick={() => onChange(o.v)}
          className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
            value === o.v ? 'border-brand-accent bg-brand-accent-soft text-brand-primary' : 'border-border-soft bg-surface-card text-text-muted hover:border-brand-accent/50'
          }`}
        >{o.l}</button>
      ))}
    </div>
  )
}

// ── Step 1 ───────────────────────────────────────────────────────────────────
function Step1({ data, set, errors }) {
  const isDeveloper = data.applicantType === 'developer'
  return (
    <div className="space-y-5">
      <Field label="صفة مقدّم الطلب" required error={errors.applicantType}>
        <SelectInput value={data.applicantType} onChange={v => set('applicantType', v)} error={errors.applicantType}
          options={[{ value: 'owner', label: 'مالك' }, { value: 'developer', label: 'مطوّر عقاري' }]} />
      </Field>

      {isDeveloper && (
        <Field label="اسم الشركة">
          <TextInput value={data.companyName} onChange={v => set('companyName', v)} placeholder="شركة ..." />
        </Field>
      )}

      <Field label="الاسم الكامل" required error={errors.fullName}>
        <TextInput value={data.fullName} onChange={v => set('fullName', v)} error={errors.fullName} placeholder="محمد علي الأحمد" />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="البريد الإلكتروني" error={errors.email}>
          <TextInput type="email" value={data.email} onChange={v => set('email', v)} error={errors.email} placeholder="your@email.com" dir="ltr" />
        </Field>
        <Field label="الجوال" required error={errors.phone}>
          <TextInput type="tel" value={data.phone} onChange={v => set('phone', v)} error={errors.phone} placeholder="05xxxxxxxx" dir="ltr" />
        </Field>
      </div>

      <Field label="اسم/عنوان العقار" required error={errors.propertyName}>
        <TextInput value={data.propertyName} onChange={v => set('propertyName', v)} error={errors.propertyName} placeholder="عمارة سكنية - حي العليا" />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="نوع العقار" required error={errors.propertyType}>
          <SelectInput value={data.propertyType} onChange={v => set('propertyType', v)} error={errors.propertyType} options={PROPERTY_TYPES} />
        </Field>
        <Field label="المدينة" required error={errors.city}>
          <SelectInput value={data.city} onChange={v => set('city', v)} error={errors.city} options={CITIES} />
        </Field>
      </div>

      <Field label="موقع العقار على خرائط قوقل" required error={errors.googleMapsUrl} hint="الصق رابط الموقع من خرائط قوقل (maps.app.goo.gl)">
        <TextInput type="url" value={data.googleMapsUrl} onChange={v => set('googleMapsUrl', v)} error={errors.googleMapsUrl} placeholder="https://maps.app.goo.gl/..." dir="ltr" />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="الحي" required error={errors.district}>
          <TextInput value={data.district} onChange={v => set('district', v)} error={errors.district} placeholder="العليا، الروضة..." />
        </Field>
        <Field label="المساحة (م²)">
          <TextInput type="number" min="0" value={data.landArea} onChange={v => set('landArea', v)} placeholder="250" />
        </Field>
        <Field label="عمر العقار (سنوات)">
          <TextInput type="number" min="0" value={data.buildingYear} onChange={v => set('buildingYear', v)} placeholder="5" />
        </Field>
      </div>

      <Field label="وصف مختصر للعقار" required error={errors.shortDescription}>
        <textarea value={data.shortDescription} onChange={e => set('shortDescription', e.target.value)} rows={4}
          className={`${inputCls} ${errors.shortDescription ? 'border-red-400' : ''}`}
          placeholder="نبذة مختصرة عن العقار وموقعه ومميزاته..." />
      </Field>
    </div>
  )
}

// ── Step 2 ───────────────────────────────────────────────────────────────────
function Step2({ data, set, errors }) {
  return (
    <div className="space-y-6">
      <Field label="السعر المطلوب (ريال)" required error={errors.requestedPrice}>
        <TextInput type="number" min="0" value={data.requestedPrice} onChange={v => set('requestedPrice', v)} error={errors.requestedPrice} placeholder="2500000" />
      </Field>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={data.isPriceNegotiable} onChange={e => set('isPriceNegotiable', e.target.checked)}
          className="w-5 h-5 accent-brand-accent" />
        <span className="text-sm text-text-body">السعر قابل للتفاوض</span>
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="هل العقار مؤجَّر حالياً؟"><YesNo value={data.isLeased} onChange={v => set('isLeased', v)} /></Field>
        <Field label="هل العقار مرهون؟"><YesNo value={data.hasMortgage} onChange={v => set('hasMortgage', v)} /></Field>
      </div>

      {data.isLeased === true && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-brand-accent/30 bg-brand-accent-soft/40 p-4">
          <Field label="قيمة الإيجار السنوي (ريال)" error={errors.annualRent}>
            <TextInput type="number" min="0" value={data.annualRent} onChange={v => set('annualRent', v)} error={errors.annualRent} placeholder="120000" />
          </Field>
          <Field label="تاريخ انتهاء عقد الإيجار">
            <TextInput type="date" value={data.leaseExpiryDate} onChange={v => set('leaseExpiryDate', v)} />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="هل يوجد شريك في الملكية؟"><YesNo value={data.hasOwnershipPartner} onChange={v => set('hasOwnershipPartner', v)} /></Field>
        <Field label="هل يوجد نزاع قانوني على العقار؟"><YesNo value={data.hasLegalDispute} onChange={v => set('hasLegalDispute', v)} /></Field>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={data.noLegalIssues} onChange={e => set('noLegalIssues', e.target.checked)}
          className="w-5 h-5 accent-brand-accent" />
        <span className="text-sm text-text-body">أقر بعدم وجود مشاكل قانونية على العقار</span>
      </label>
    </div>
  )
}

// ── Step 3 ───────────────────────────────────────────────────────────────────
function Dropzone({ title, sub, inputId, accept, onChange, multiple }) {
  return (
    <>
      <input id={inputId} type="file" accept={accept} multiple={multiple} onChange={onChange} className="hidden" />
      <label htmlFor={inputId}
        className="block border-2 border-dashed border-brand-accent/40 rounded-2xl p-6 text-center cursor-pointer hover:border-brand-accent hover:bg-brand-accent-soft/30 transition-all">
        <UploadCloud className="mx-auto text-brand-accent mb-2" size={32} />
        <p className="text-sm text-text-body font-medium">{title}</p>
        <p className="text-xs text-text-muted mt-1">{sub}</p>
      </label>
    </>
  )
}

function Step3({ images, deed, uploading, uploadError, onPickImages, onPickDeed, removeImage, removeDeed }) {
  return (
    <div className="space-y-6">
      <div className="bg-brand-accent-soft border border-brand-accent/30 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="text-brand-accent flex-shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-brand-primary leading-relaxed">إرفاق صورة الصك وصور واضحة للعقار يسرّع المراجعة المبدئية (اختياري في هذه المرحلة).</p>
      </div>

      {/* Deed */}
      <div>
        <label className="block text-sm font-semibold text-text-body mb-2">صورة الصك</label>
        {deed ? (
          <div className="flex items-center justify-between rounded-xl border border-border-soft px-4 py-3 bg-surface-muted">
            <span className="text-sm text-text-body truncate">📄 {deed.name}</span>
            <button type="button" onClick={removeDeed} className="text-red-500 hover:text-red-700"><X size={18} /></button>
          </div>
        ) : (
          <Dropzone title="انقر لإرفاق صورة الصك" sub="JPG, PNG, PDF — حتى 10MB" inputId="lead-deed" accept="image/jpeg,image/png,application/pdf" onChange={onPickDeed} />
        )}
      </div>

      {/* Images */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-text-body">صور العقار</label>
          <span className="text-xs text-text-muted">{images.length} / {MAX_IMAGES}</span>
        </div>
        {images.length < MAX_IMAGES && (
          <Dropzone title="انقر لإضافة صور العقار" sub={`JPG, PNG — حتى ${MAX_IMAGES} صور`} inputId="lead-images" accept="image/jpeg,image/png,image/webp" multiple onChange={onPickImages} />
        )}
        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                <img src={`${API_BASE}${img.url}`} alt={img.name} className="w-full h-24 object-cover rounded-xl border border-border-soft" />
                <button type="button" onClick={() => removeImage(i)}
                  className="absolute top-2 left-2 p-1.5 bg-brand-primary/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-brand-accent"><Loader className="animate-spin" size={16} /> جارٍ رفع الملفات...</div>
      )}
      {uploadError && (
        <div className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={16} /> {uploadError}</div>
      )}
    </div>
  )
}

// ── Step 4 ───────────────────────────────────────────────────────────────────
function Declaration({ checked, onChange, error, children }) {
  return (
    <label data-error={error ? 'true' : undefined}
      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
        checked ? 'border-brand-accent bg-brand-accent-soft' : error ? 'border-red-300' : 'border-border-soft hover:border-brand-accent/50'
      }`}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-5 h-5 accent-brand-accent mt-0.5 flex-shrink-0" />
      <span className="text-sm text-text-body leading-relaxed">{children}</span>
    </label>
  )
}

function Step4({ data, set, errors, submitError }) {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        ⚠ تأكد من صحة جميع البيانات قبل الإرسال. إرسال الطلب لا يضمن قبول الفرصة.
      </div>

      <Declaration checked={!!data.dataAccuracyConfirmed} onChange={v => set('dataAccuracyConfirmed', v)} error={errors.dataAccuracyConfirmed}>
        أقر بأن جميع البيانات المُدخلة صحيحة وكاملة.
      </Declaration>
      <Declaration checked={!!data.reviewConsentConfirmed} onChange={v => set('reviewConsentConfirmed', v)} error={errors.reviewConsentConfirmed}>
        أوافق على مراجعة الطلب ومشاركة البيانات مع فريق الوسم لأغراض التقييم.
      </Declaration>
      <Declaration checked={!!data.noAcceptanceGuaranteeConfirmed} onChange={v => set('noAcceptanceGuaranteeConfirmed', v)} error={errors.noAcceptanceGuaranteeConfirmed}>
        أقر بأن إرسال هذا الطلب لا يترتب عليه قبول الفرصة أو إدراجها في المنصة.
      </Declaration>

      {(errors.dataAccuracyConfirmed || errors.reviewConsentConfirmed || errors.noAcceptanceGuaranteeConfirmed) && (
        <p className="text-sm text-red-600">الرجاء الموافقة على جميع الإقرارات للمتابعة.</p>
      )}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle size={18} /> {submitError}
        </div>
      )}
    </div>
  )
}

// ── Step 5 (success) ─────────────────────────────────────────────────────────
function SuccessStep({ onReset, onGoProperties }) {
  const stages = [
    { n: 1, label: 'مرحلة القبول الأولي', current: true },
    { n: 2, label: 'مرحلة الدراسة التفصيلية', current: false },
    { n: 3, label: 'مرحلة الترميز والإدراج', current: false },
  ]
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-brand-accent rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
        <CheckCircle2 className="text-white" size={36} />
      </div>
      <h2 className="text-2xl font-bold text-brand-primary mb-2">تم إرسال طلب التقديم المبدئي بنجاح</h2>
      <p className="text-text-muted leading-relaxed mb-6">
        سيقوم فريق الوسم بمراجعة الطلب مبدئيًا وفق معايير الوسم، وفي حال اجتياز التقييم الأولي سيتم التواصل معكم لاستكمال الدراسة التفصيلية.
      </p>

      <div className="bg-brand-accent-soft border border-brand-accent/30 rounded-2xl p-5 text-right mb-6">
        <p className="font-semibold text-brand-primary mb-3">مراحل الفرصة:</p>
        <div className="space-y-2">
          {stages.map(s => (
            <div key={s.n} className={`flex items-center gap-3 p-2.5 rounded-xl ${s.current ? 'bg-surface-card border border-brand-accent' : ''}`}>
              <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${s.current ? 'bg-brand-accent text-white' : 'bg-surface-muted text-text-muted'}`}>{s.n}</span>
              <span className={`text-sm font-semibold ${s.current ? 'text-brand-primary' : 'text-text-muted'}`}>{s.label}</span>
              {s.current && <span className="text-xs text-brand-accent font-semibold mr-auto">● المرحلة الحالية</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={onGoProperties} className="flex-1 px-6 py-3 border border-border-soft text-text-body rounded-xl font-medium hover:bg-surface-muted transition-colors">
          العودة إلى أصولي
        </button>
        <button onClick={onReset} className="flex-1 px-6 py-3 bg-brand-accent text-white rounded-xl font-semibold hover:bg-brand-accent/90 transition-colors">
          تقديم فرصة أخرى
        </button>
      </div>
    </div>
  )
}
