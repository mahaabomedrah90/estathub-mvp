import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Loader2, ArrowRight, Upload, FileText, CheckCircle2, ShieldCheck, Building2, Coins } from 'lucide-react'
import { fetchJson, authHeader } from '../../lib/api'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const UPLOAD_ERROR_BY_STATUS = {
  401: 'انتهت جلستك أو لم تسجّل الدخول. سجّل الدخول كمالك ثم حاول مجدداً.',
  403: 'ليست لديك صلاحية رفع هذا الملف. يرجى تسجيل الدخول كمالك أو التواصل مع الدعم.',
  413: 'حجم الملف يتجاوز 10 ميجابايت.',
  415: 'صيغة الملف غير مدعومة. المسموح: JPG أو PNG أو WEBP أو PDF.',
  500: 'تعذر رفع الملف حاليًا. يرجى المحاولة لاحقًا.',
}

const PROPERTY_TYPES = { land: 'أرض', apartment: 'شقة', building: 'عمارة', villa: 'فيلا', warehouse: 'مستودع', farm: 'مزرعة', commercial: 'تجاري', other: 'أخرى' }
const CITIES = { riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام', khobar: 'الخبر', mecca: 'مكة المكرمة', medina: 'المدينة المنورة' }
const typeLabel = (v) => v ? (PROPERTY_TYPES[v] || v) : 'غير محدد'
const cityLabel = (v) => v ? (CITIES[v] || v) : 'غير محدد'
const fmtSar = (n) => (n || n === 0) ? Number(n).toLocaleString('en-US') + ' ر.س' : 'غير محدد'
const fmtNum = (n) => (n || n === 0) ? Number(n).toLocaleString('en-US') : 'غير محدد'

// Statuses where the acceptance has already been submitted (read-only completion view).
const COMPLETED_STATUSES = ['OWNER_FINAL_ACCEPTED', 'FINAL_APPROVED', 'CONVERTED_TO_PROPERTY']

const SUBMIT_ERROR_BY_CODE = {
  acceptance_required: 'يجب قبول جميع الإقرارات قبل إرسال الموافقة النهائية.',
  fee_payment_proof_required: 'يرجى إرفاق إيصال السداد أو إدخال مرجع التحويل قبل إرسال الموافقة.',
  invalid_receipt_key: 'إيصال السداد غير صالح. يرجى رفع الإيصال مرة أخرى.',
  note_too_long: 'الملاحظات يجب ألا تتجاوز 1000 حرف.',
}

export default function OwnerFinalAcceptance() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [pkg, setPkg] = useState(null)
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)

  const [agree1, setAgree1] = useState(false)   // data accuracy
  const [agree2, setAgree2] = useState(false)   // listing agreement
  const [agree3, setAgree3] = useState(false)   // fee terms
  const [note, setNote] = useState('')
  const [receipt, setReceipt] = useState(null)  // { key, name }
  const [paymentRef, setPaymentRef] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true); setLoadError(''); setAlreadyCompleted(false)
      try {
        const data = await fetchJson(`/api/property-leads/${id}/final-acceptance`, { headers: authHeader() })
        if (!alive) return
        setPkg(data)
        if (COMPLETED_STATUSES.includes(data?.lead?.status)) setAlreadyCompleted(true)
      } catch (e) {
        if (!alive) return
        const code = e?.status
        if (code === 409) setLoadError('حزمة الموافقة النهائية غير متاحة لهذا الطلب في حالته الحالية.')
        else if (code === 401 || code === 403) setLoadError('ليست لديك صلاحية الوصول لهذا الطلب. يرجى تسجيل الدخول كمالك.')
        else if (code === 404) setLoadError('لم يتم العثور على الطلب.')
        else setLoadError('تعذّر تحميل حزمة الموافقة النهائية. حاول مرة أخرى.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [id])

  const onUploadReceipt = async (e) => {
    const file = (e.target.files || [])[0]
    e.target.value = ''
    if (!file) return
    setUploadError(''); setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API_BASE}/api/property-leads/upload`, { method: 'POST', headers: authHeader(), body: fd })
      if (!res.ok) throw new Error(UPLOAD_ERROR_BY_STATUS[res.status] || 'تعذّر رفع الملف. حاول مرة أخرى.')
      const json = await res.json().catch(() => ({}))
      if (!json.key) throw new Error('تعذّر رفع الملف. حاول مرة أخرى.')
      setReceipt({ key: json.key, name: json.filename || file.name })
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const preparationFee = Number(pkg?.feeView?.preparationFee) || 0
  const feeRequired = !!pkg?.feeProofRequired
  const hasProof = !!receipt?.key || !!paymentRef.trim()
  const canSubmit = agree1 && agree2 && agree3 && (!feeRequired || hasProof) && !submitting

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitError(''); setSubmitting(true)
    try {
      await fetchJson(`/api/property-leads/${id}/final-acceptance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          agreementAccepted: true,
          acknowledgmentAccepted: true,
          feeTermsAccepted: true,
          ownerResponseNote: note.trim() || undefined,
          feeReceiptKey: receipt?.key || undefined,
          feePaymentReference: paymentRef.trim() || undefined,
        }),
      })
      setDone(true)
    } catch (err) {
      const code = err?.data?.error
      if (code === 'already_accepted') { setDone(true); return }
      setSubmitError(SUBMIT_ERROR_BY_CODE[code] || err?.message || 'تعذّر إرسال الموافقة النهائية. حاول مرة أخرى.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-brand-accent" size={44} /></div>
  }

  if (loadError) {
    return (
      <div className="space-y-4 max-w-xl">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="font-bold text-amber-800 mb-1">تعذّر فتح حزمة الموافقة النهائية</p>
          <p className="text-sm text-amber-700">{loadError}</p>
        </div>
        <button onClick={() => navigate('/owner/requests')} className="inline-flex items-center gap-2 text-brand-accent font-semibold">
          <ArrowRight size={16} /> العودة إلى طلباتي
        </button>
      </div>
    )
  }

  // Completion state (already accepted, or just submitted now).
  if (done || alreadyCompleted) {
    return (
      <div className="space-y-5 max-w-xl">
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-6 text-center">
          <CheckCircle2 className="mx-auto text-sky-600 mb-3" size={48} />
          <h1 className="text-xl font-bold text-brand-primary mb-2">اكتملت موافقتك النهائية</h1>
          <p className="text-sm text-sky-800 leading-relaxed">
            تم إرسال موافقتك النهائية لفريق الوسم. سيقوم الفريق باستكمال الاعتماد النهائي.
          </p>
        </div>
        <button
          onClick={() => navigate('/owner/requests')}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-accent text-white rounded-xl font-semibold hover:bg-brand-accent/90 transition-colors"
        >
          <ArrowRight size={16} /> العودة إلى طلباتي
        </button>
      </div>
    )
  }

  const lead = pkg?.lead || {}
  const ld = pkg?.listingDraft || {}
  const card = 'bg-white border border-border-soft rounded-2xl shadow-card p-5'
  const h2 = 'font-bold text-brand-primary flex items-center gap-2 mb-3'
  const row = (label, value) => (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border-soft/60 last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-semibold text-brand-primary" dir="auto">{value}</span>
    </div>
  )

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      {/* A. Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-primary">مراجعة الاتفاقية والدفع</h1>
        <p className="text-text-muted mt-1">
          راجع بيانات الإدراج ورسوم التجهيز ثم أكّد موافقتك النهائية لإرسال الطلب لفريق الوسم.
        </p>
      </div>

      {/* B. Property summary */}
      <section className={card}>
        <h2 className={h2}><Building2 size={16} className="text-brand-accent" /> بيانات العقار</h2>
        {row('اسم العقار', lead.propertyName || 'غير محدد')}
        {row('نوع العقار', typeLabel(lead.propertyType))}
        {row('المدينة', cityLabel(lead.city))}
        {row('الحي', lead.district || 'غير محدد')}
        {(lead.requestedPrice || lead.requestedPrice === 0) && row('السعر المطلوب', fmtSar(lead.requestedPrice))}
        {lead.shortDescription && (
          <p className="text-sm text-text-body leading-relaxed mt-3 pt-3 border-t border-border-soft/60">{lead.shortDescription}</p>
        )}
      </section>

      {/* C. Listing draft */}
      <section className={card}>
        <h2 className={h2}><Coins size={16} className="text-brand-accent" /> بيانات الإدراج</h2>
        {row('القيمة الإجمالية', fmtSar(ld.totalValue))}
        {row('سعر الحصة', fmtSar(ld.tokenPrice))}
        {row('عدد الحصص', fmtNum(ld.totalTokens))}
        {(ld.remainingTokens || ld.remainingTokens === 0) && row('الحصص المتاحة', fmtNum(ld.remainingTokens))}
        {row('العائد الشهري', (ld.monthlyYield || ld.monthlyYield === 0) ? `${ld.monthlyYield}%` : 'غير محدد')}
        {(ld.expectedROI || ld.expectedROI === 0) && row('العائد السنوي المتوقع', `${ld.expectedROI}%`)}
        {ld.notes && <p className="text-xs text-text-muted leading-relaxed mt-3 pt-3 border-t border-border-soft/60">{ld.notes}</p>}
      </section>

      {/* D. Fee section */}
      <section className={card}>
        <h2 className={h2}><Coins size={16} className="text-brand-accent" /> رسوم تجهيز العقار</h2>
        {preparationFee > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">المبلغ المطلوب</span>
              <span className="text-lg font-bold text-brand-primary" dir="ltr">{fmtSar(preparationFee)}</span>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              يلزم إرفاق إيصال السداد أو إدخال مرجع التحويل قبل إرسال الموافقة.
            </p>
          </div>
        ) : (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">
            لا توجد رسوم تجهيز مطلوبة لهذا الطلب.
          </p>
        )}
      </section>

      {/* E. Agreement / acknowledgment placeholders (DRAFT — pending legal review) */}
      <section className={card}>
        <h2 className={h2}><ShieldCheck size={16} className="text-brand-accent" /> الاتفاقية والإقرار</h2>
        <div className="bg-surface-muted border border-border-soft rounded-lg p-3 space-y-1.5">
          <p className="text-xs font-bold text-amber-700">مسودة إقرار — خاضعة للمراجعة القانونية</p>
          <p className="text-xs text-text-body leading-relaxed">أقر بصحة البيانات والمستندات المقدمة المتعلقة بالعقار.</p>
          <p className="text-xs text-text-body leading-relaxed">أوافق على متابعة إجراءات إدراج العقار عبر منصة الوسم وفق البيانات المعروضة.</p>
          <p className="text-xs text-text-body leading-relaxed">أوافق على رسوم التجهيز وآلية السداد الموضحة أعلاه، إن وجدت.</p>
        </div>
      </section>

      {/* G. Payment proof (only when preparationFee > 0) */}
      {preparationFee > 0 && (
        <section className={card}>
          <h2 className={h2}><FileText size={16} className="text-brand-accent" /> إثبات السداد</h2>
          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-sm text-red-700 flex items-center gap-2 mb-3">
              <AlertCircle size={15} /> {uploadError}
            </div>
          )}
          <label className="block text-sm font-medium text-text-body mb-1">إيصال السداد</label>
          {receipt ? (
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex items-center gap-2 text-brand-accent text-sm font-medium">
                <FileText size={16} /> {receipt.name}
              </span>
              <button type="button" onClick={() => setReceipt(null)} className="text-red-600 text-sm">إزالة</button>
            </div>
          ) : (
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border-soft text-sm text-text-body hover:border-brand-accent cursor-pointer mb-3">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} رفع الإيصال (PDF/صورة)
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onUploadReceipt} disabled={uploading} />
            </label>
          )}
          <label className="block text-sm font-medium text-text-body mb-1 mt-2">أو مرجع التحويل</label>
          <input
            type="text"
            value={paymentRef}
            onChange={e => setPaymentRef(e.target.value)}
            placeholder="رقم/مرجع عملية التحويل"
            maxLength={200}
            className="w-full px-3 py-2.5 rounded-xl border border-border-soft focus:border-brand-accent focus:outline-none text-sm"
          />
          {!hasProof && (
            <p className="text-xs text-text-muted mt-2">أدخل مرجع التحويل أو ارفع الإيصال لتفعيل زر الإرسال.</p>
          )}
        </section>
      )}

      {/* F. Required checkboxes */}
      <section className={card}>
        <h2 className={h2}><CheckCircle2 size={16} className="text-brand-accent" /> الإقرارات المطلوبة</h2>
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm text-text-body cursor-pointer">
            <input type="checkbox" checked={agree1} onChange={e => setAgree1(e.target.checked)} className="w-4 h-4 mt-0.5 accent-brand-accent" />
            أقر بصحة بيانات العقار والمستندات المقدمة.
          </label>
          <label className="flex items-start gap-2 text-sm text-text-body cursor-pointer">
            <input type="checkbox" checked={agree2} onChange={e => setAgree2(e.target.checked)} className="w-4 h-4 mt-0.5 accent-brand-accent" />
            أوافق على اتفاقية إدراج العقار مع منصة الوسم.
          </label>
          <label className="flex items-start gap-2 text-sm text-text-body cursor-pointer">
            <input type="checkbox" checked={agree3} onChange={e => setAgree3(e.target.checked)} className="w-4 h-4 mt-0.5 accent-brand-accent" />
            أوافق على رسوم التجهيز وآلية السداد الموضحة أعلاه.
          </label>
        </div>
      </section>

      {/* H. Owner note */}
      <section className={card}>
        <label className="block text-sm font-bold text-brand-primary mb-1">ملاحظات إضافية لفريق الوسم</label>
        <textarea
          rows={3}
          maxLength={1000}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="اكتب أي ملاحظات إضافية..."
          className="w-full px-3 py-2.5 rounded-xl border border-border-soft focus:border-brand-accent focus:outline-none text-sm"
        />
        <p className="text-xs text-text-muted text-left">{note.length}/1000</p>
      </section>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2">
          <AlertCircle className="text-red-600" size={20} /><span className="text-red-700">{submitError}</span>
        </div>
      )}

      {/* I. Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 px-7 py-3 bg-brand-accent text-white rounded-xl font-semibold hover:bg-brand-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
          تأكيد الموافقة وإرسالها لفريق الوسم
        </button>
        <button type="button" onClick={() => navigate('/owner/requests')} className="px-5 py-3 text-text-muted font-medium">إلغاء</button>
      </div>
    </form>
  )
}
