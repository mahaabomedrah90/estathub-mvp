import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { authHeader, fetchJson } from '../../lib/api'
import {
  PieChart, AlertCircle, AlertTriangle, Building2, Calendar, Coins, Check, ArrowRight, Loader2,
  ShieldCheck, Wallet, Users, Hash,
} from 'lucide-react'

// ─── Formatters ───────────────────────────────────────────────────────────────
// Always Western digits with comma grouping + exactly 2 decimals, so amounts
// render consistently and are never reversed under RTL. The currency label is
// kept as a separate element in the UI (not concatenated into the number).
const fmtSAR = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtInt = (n) => Number(n || 0).toLocaleString('en-US')
const fmtPct = (n) => `${Number(n || 0).toFixed(2)}%`
const fmtDateTime = (iso, isAr) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(isAr ? 'ar-SA' : 'en-GB', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return String(iso) }
}
const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function AdminDistributions() {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const tt = (ar, en) => (isAr ? ar : en)
  const dir = isAr ? 'rtl' : 'ltr'

  // Data
  const [properties, setProperties] = useState([])
  const [loadingProps, setLoadingProps] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Inputs
  const [propertyId, setPropertyId] = useState('')
  const [month, setMonth] = useState(currentMonth)
  const [grossIncome, setGrossIncome] = useState('')

  // Preview
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const previewRef = useRef(null)
  const confirmRef = useRef(null)

  // Workflow stage: 'input' | 'preview' | 'confirm' | 'done'
  const [stage, setStage] = useState('input')

  // Execution
  const [confirmText, setConfirmText] = useState('')
  const [executing, setExecuting] = useState(false)
  const [execError, setExecError] = useState('')
  const [result, setResult] = useState(null)
  const successRef = useRef(null)

  // ─── Load approved properties ──────────────────────────────────────────────
  const loadProperties = useCallback(async () => {
    setLoadingProps(true)
    setLoadError('')
    // authHeader() keeps the admin session consistent; later phases call
    // ADMIN-only endpoints that require the bearer token.
    const [res] = await Promise.allSettled([
      fetchJson('/api/properties?status=APPROVED', { headers: authHeader() }),
    ])
    if (res.status === 'fulfilled') {
      const v = res.value
      setProperties(Array.isArray(v) ? v : (Array.isArray(v?.data) ? v.data : []))
    } else {
      setProperties([])
      setLoadError(tt('تعذّر تحميل قائمة العقارات', 'Could not load the property list'))
    }
    setLoadingProps(false)
  }, [isAr])

  useEffect(() => { loadProperties() }, [loadProperties])

  // Any input change invalidates a prior preview/result (keeps the stepper honest).
  useEffect(() => {
    setPreview(null); setPreviewError(''); setStage('input')
    setConfirmText(''); setExecError(''); setResult(null)
  }, [propertyId, month, grossIncome])

  // ─── Preview ───────────────────────────────────────────────────────────────
  const canPreview = !!propertyId && !!month && Number(grossIncome) > 0 && !previewLoading

  const mapPreviewError = (e) => {
    const status = e?.status
    const code = e?.data?.code
    if (code === 'PROPERTY_NOT_ELIGIBLE') return tt('هذا العقار غير مؤهل للتوزيع (يجب أن يكون معتمداً).', 'This property is not eligible for distribution (must be APPROVED).')
    if (code === 'NO_HOLDERS') return tt('لا يوجد حاملو رموز لهذا العقار — لا يمكن التوزيع.', 'No token holders for this property — nothing to distribute.')
    if (status === 400) return e?.data?.message || tt('المدخلات غير صحيحة.', 'Invalid input.')
    if (status === 401 || status === 403) return tt('غير مصرّح. يرجى تسجيل الدخول كمسؤول.', 'Unauthorized. Please sign in as an admin.')
    if (!status) return tt('فشل الاتصال بالشبكة. حاول مجدداً.', 'Network failure. Please try again.')
    return e?.data?.message || tt('تعذّر حساب المعاينة.', 'Could not compute the preview.')
  }

  const handlePreview = async () => {
    if (!canPreview) return
    setPreviewLoading(true); setPreviewError(''); setPreview(null)
    try {
      const qs = new URLSearchParams({ propertyId, month, totalAmount: String(Number(grossIncome)) })
      const res = await fetchJson(`/api/admin/distributions/preview?${qs}`, { headers: authHeader() })
      setPreview(res?.preview || null)
      setStage('preview')
    } catch (e) {
      setPreviewError(mapPreviewError(e))
    } finally {
      setPreviewLoading(false)
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    }
  }

  // Stepper — currentStep advances as later phases add confirm/success.
  const steps = [
    { key: 'inputs', label: tt('البيانات', 'Inputs') },
    { key: 'preview', label: tt('المعاينة', 'Preview') },
    { key: 'confirm', label: tt('التأكيد', 'Confirm') },
    { key: 'done', label: tt('الإتمام', 'Done') },
  ]
  const currentStep = stage === 'done' ? 3 : stage === 'confirm' ? 2 : (stage === 'preview' ? 1 : 0)

  // ─── Workflow navigation (no API calls; preview data stays in memory) ──────
  const goToConfirm = () => {
    setStage('confirm'); setConfirmText(''); setExecError('')
    setTimeout(() => confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }
  const backToInputs = () => {
    setStage('input') // Step 1; entered values (property/month/gross) are retained
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0)
  }
  const backToPreview = () => {
    setStage('preview'); setConfirmText(''); setExecError('')
    setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  // ─── Execute ───────────────────────────────────────────────────────────────
  const canExecute = !!preview && confirmText === 'CONFIRM' && !executing

  const mapExecError = (e) => {
    const status = e?.status
    const code = e?.data?.code
    const msg = e?.data?.message || ''
    if (status === 409 || code === 'ALREADY_DISTRIBUTED')
      return tt('تم تنفيذ توزيع لهذا العقار عن هذا الشهر مسبقاً.', 'A distribution for this property and month has already been executed.')
    if (status === 400) {
      if (code === 'PROPERTY_NOT_ELIGIBLE') return tt('هذا العقار غير مؤهل للتوزيع (يجب أن يكون معتمداً).', 'This property is not eligible for distribution (must be APPROVED).')
      if (code === 'NO_HOLDERS') return tt('لا يوجد حاملو رموز لهذا العقار — لا يمكن التوزيع.', 'No token holders for this property — nothing to distribute.')
      return msg || tt('المدخلات غير صحيحة.', 'Invalid input.')
    }
    if (status === 401 || status === 403) return tt('غير مصرّح. يرجى تسجيل الدخول كمسؤول.', 'Unauthorized. Please sign in as an admin.')
    if (status === 500) return tt('خطأ في الخادم أثناء التنفيذ. لم يكتمل التوزيع.', 'Server error during execution. The distribution did not complete.')
    if (!status) return tt('فشل الاتصال بالشبكة. حاول مجدداً.', 'Network failure. Please try again.')
    return msg || tt('تعذّر تنفيذ التوزيع.', 'Could not execute the distribution.')
  }

  const handleExecute = async () => {
    if (!canExecute) return
    setExecuting(true); setExecError('')
    try {
      const res = await fetchJson('/api/admin/distributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ propertyId, month, totalAmount: Number(grossIncome) }),
      })
      setResult(res?.payout || null)
      setStage('done')
      setTimeout(() => successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    } catch (e) {
      setExecError(mapExecError(e)) // no page refresh; error shown inline
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div dir={dir} className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-brand-accent/10 rounded-xl flex items-center justify-center shrink-0">
          <PieChart className="text-brand-accent" size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tt('توزيع أرباح الإيجار', 'Rental Distribution')}</h1>
          <p className="text-sm text-gray-500">{tt('وزّع دخل الإيجار على المستثمرين بحسب حصصهم من الرموز', 'Distribute rental income to investors by token share')}</p>
        </div>
      </div>

      {/* Stepper */}
      <ol className="flex items-center w-full">
        {steps.map((s, i) => {
          const done = i < currentStep
          const active = i === currentStep
          return (
            <li key={s.key} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
              <div className="flex items-center gap-2">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  done ? 'bg-brand-accent text-white'
                    : active ? 'bg-brand-accent/10 text-brand-accent ring-2 ring-brand-accent'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {done ? <Check size={16} /> : i + 1}
                </span>
                <span className={`text-sm font-medium whitespace-nowrap ${active ? 'text-brand-accent' : done ? 'text-gray-700' : 'text-gray-400'}`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <span className={`flex-1 h-px mx-3 ${done ? 'bg-brand-accent' : 'bg-gray-200'}`} />}
            </li>
          )
        })}
      </ol>

      {/* Step 1 — Inputs */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">{tt('بيانات التوزيع', 'Distribution Inputs')}</h2>
        <p className="text-sm text-gray-400 mb-5">
          {tt('اختر العقار والشهر وإجمالي دخل الإيجار.', 'Select the property, month and gross rental income.')}
        </p>

        {loadError && (
          <div className="flex items-center justify-between gap-3 text-red-700 bg-red-50 rounded-lg px-4 py-3 text-sm mb-4">
            <span className="flex items-center gap-2"><AlertCircle size={16} /> {loadError}</span>
            <button onClick={loadProperties} className="font-semibold underline">{tt('إعادة المحاولة', 'Retry')}</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <Building2 size={14} className="text-gray-400" /> {tt('العقار', 'Property')}
            </label>
            <select
              value={propertyId}
              onChange={e => setPropertyId(e.target.value)}
              disabled={loadingProps}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-brand-accent focus:border-transparent disabled:opacity-60"
            >
              <option value="">{loadingProps ? tt('...جارٍ التحميل', 'Loading...') : tt('— اختر عقاراً معتمداً —', '— Select an approved property —')}</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <Calendar size={14} className="text-gray-400" /> {tt('الشهر', 'Month')}
            </label>
            <input
              type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-brand-accent focus:border-transparent"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <Coins size={14} className="text-gray-400" /> {tt('إجمالي دخل الإيجار (ر.س)', 'Gross Rental Income (SAR)')}
            </label>
            <input
              type="number" min="0.01" step="0.01" value={grossIncome}
              onChange={e => setGrossIncome(e.target.value)}
              placeholder={tt('أدخل المبلغ', 'Enter amount')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-brand-accent focus:border-transparent tabular-nums"
            />
          </div>
        </div>

        {/* Preview trigger */}
        <div className="mt-6">
          <button
            type="button"
            onClick={handlePreview}
            disabled={!canPreview}
            className="inline-flex items-center gap-2 bg-brand-accent text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {previewLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            {tt('معاينة التوزيع', 'Preview Distribution')}
          </button>
        </div>
      </section>

      {/* Step 2 — Preview */}
      {(previewLoading || previewError || (preview && stage === 'preview')) && (
        <section ref={previewRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">{tt('المعاينة المالية', 'Financial Preview')}</h2>

          {previewLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-400 text-sm">
              <Loader2 size={18} className="animate-spin" /> {tt('جارٍ حساب المعاينة من الخادم...', 'Computing preview from server...')}
            </div>
          )}

          {!previewLoading && previewError && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg px-4 py-3 text-sm">
              <AlertCircle size={16} /> {previewError}
            </div>
          )}

          {!previewLoading && preview && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <PreviewStat isAr={isAr} icon={Coins} label={tt('إجمالي الدخل', 'Gross Income')} value={fmtSAR(preview.grossAmount)} unit={tt('ر.س', 'SAR')} />
                <PreviewStat isAr={isAr} icon={ShieldCheck} tone="deduct" label={tt('رسوم الإدارة', 'Management Fee')} value={fmtSAR(preview.mgmtFeeAmount)} unit={tt('ر.س', 'SAR')} sub={preview.managementFeeEnabled ? fmtPct(preview.managementFeeRate) : tt('غير مفعّلة', 'Disabled')} subLtr={preview.managementFeeEnabled} />
                <PreviewStat isAr={isAr} icon={Wallet} tone="deduct" label={tt('الاحتياطي', 'Reserve')} value={fmtSAR(preview.reserveAmount)} unit={tt('ر.س', 'SAR')} sub={fmtPct(preview.reserveRate)} subLtr />
                <PreviewStat isAr={isAr} icon={ArrowRight} tone="net" label={tt('الصافي القابل للتوزيع', 'Net Distributable')} value={fmtSAR(preview.netDistributable)} unit={tt('ر.س', 'SAR')} />
                <PreviewStat isAr={isAr} icon={Users} label={tt('عدد المستثمرين', 'Investors')} value={fmtInt(preview.investorCount)} />
                <PreviewStat isAr={isAr} icon={Hash} label={tt('إجمالي الرموز', 'Total Tokens')} value={fmtInt(preview.totalTokens)} />
              </div>

              {/* Step 2 → Step 3 navigation (uses in-memory preview; no re-fetch) */}
              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={goToConfirm}
                  className="inline-flex items-center gap-2 bg-brand-accent text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-accent/90 transition-colors"
                >
                  {tt('التالي: التأكيد', 'Next: Confirm')} <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={backToInputs}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {tt('رجوع', 'Back')}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* Step 3 — Confirmation + execution */}
      {stage === 'confirm' && preview && (
        <section ref={confirmRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">{tt('تأكيد التوزيع', 'Confirm Distribution')}</h2>
          <p className="text-sm text-gray-400 mb-5">{tt('راجع تفاصيل التوزيع قبل التنفيذ.', 'Review the distribution details before execution.')}</p>

          <div className="bg-gray-50 rounded-xl p-4 text-sm divide-y divide-gray-100">
            <ReviewRow l={tt('العقار', 'Property')} v={preview.propertyTitle} />
            <ReviewRow l={tt('الشهر', 'Month')} v={month} ltr />
            <ReviewRow l={tt('إجمالي الدخل', 'Gross Income')} v={`${fmtSAR(preview.grossAmount)} ${tt('ر.س', 'SAR')}`} ltr />
            <ReviewRow l={tt('الصافي القابل للتوزيع', 'Net Distributable')} v={`${fmtSAR(preview.netDistributable)} ${tt('ر.س', 'SAR')}`} ltr strong />
            <ReviewRow l={tt('عدد المستثمرين', 'Investors')} v={fmtInt(preview.investorCount)} ltr />
          </div>

          {/* Irreversible-action warning */}
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-5">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <span>{tt('سيؤدي هذا الإجراء إلى إنشاء سجلات مالية وتحديث أرصدة المستثمرين، ولا يمكن التراجع عنه تلقائيًا.', 'This action will create financial records and update investor balances, and cannot be automatically reversed.')}</span>
          </div>

          {/* Type-to-confirm */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {tt('للتأكيد، اكتب ', 'To confirm, type ')}<span className="font-mono font-bold text-brand-accent">CONFIRM</span>
            </label>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              disabled={executing}
              placeholder="CONFIRM"
              dir="ltr"
              className="w-full max-w-xs border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-brand-accent focus:border-transparent font-mono tracking-widest disabled:opacity-60"
            />
          </div>

          {execError && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg px-4 py-3 text-sm mt-4">
              <AlertCircle size={16} /> {execError}
            </div>
          )}

          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={handleExecute}
              disabled={!canExecute}
              className="inline-flex items-center gap-2 bg-brand-accent text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {executing ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {tt('تنفيذ التوزيع', 'Execute Distribution')}
            </button>
            <button
              type="button"
              onClick={backToPreview}
              disabled={executing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
            >
              {tt('رجوع', 'Back')}
            </button>
          </div>
        </section>
      )}

      {/* Step 4 — Success */}
      {stage === 'done' && result && (
        <section ref={successRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-green-50 border-b border-green-200 px-6 py-5 flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <Check className="text-green-600" size={24} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-green-800">{tt('تم تنفيذ التوزيع بنجاح', 'Distribution Executed Successfully')}</h2>
              <p className="text-sm text-green-700">{tt(`تم تحديث أرصدة ${fmtInt(result.investorCount)} مستثمر`, `${fmtInt(result.investorCount)} investor balance(s) updated`)}</p>
            </div>
          </div>
          <div className="p-6">
            <div className="bg-gray-50 rounded-xl p-4 text-sm divide-y divide-gray-100">
              <ReviewRow l={tt('العقار', 'Property')} v={result.propertyTitle || preview?.propertyTitle} />
              <ReviewRow l={tt('الشهر', 'Month')} v={result.month} ltr />
              <ReviewRow l={tt('إجمالي الدخل', 'Gross Amount')} v={`${fmtSAR(result.grossAmount)} ${tt('ر.س', 'SAR')}`} ltr />
              <ReviewRow l={tt('الصافي الموزّع', 'Net Distributed')} v={`${fmtSAR(result.netDistributable)} ${tt('ر.س', 'SAR')}`} ltr strong />
              <ReviewRow l={tt('عدد المستثمرين', 'Investor Count')} v={fmtInt(result.investorCount)} ltr />
              <ReviewRow l={tt('معرّف التوزيع', 'Distribution ID')} v={result.id} mono ltr />
              <ReviewRow l={tt('وقت التنفيذ', 'Timestamp')} v={fmtDateTime(result.createdAt, isAr)} ltr />
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Confirmation / success review row ────────────────────────────────────────
// `ltr` isolates numeric values (amounts, month, id) so digits/commas/currency
// never reverse under RTL; `mono` renders long identifiers compactly.
function ReviewRow({ l, v, strong, ltr, mono }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
      <span className="text-gray-500 shrink-0">{l}</span>
      <span
        dir={ltr ? 'ltr' : undefined}
        className={`text-gray-900 min-w-0 text-end ${strong ? 'font-bold' : 'font-medium'} ${mono ? 'font-mono text-xs break-all' : 'tabular-nums'}`}
      >
        {v}
      </span>
    </div>
  )
}

// ─── Preview summary stat ─────────────────────────────────────────────────────
function PreviewStat({ icon: Icon, label, value, unit, tone = 'neutral', sub, subLtr, isAr }) {
  const t = {
    neutral: { ring: 'bg-gray-100', ic: 'text-gray-500', val: 'text-gray-900' },
    deduct: { ring: 'bg-amber-50', ic: 'text-amber-600', val: 'text-amber-600' },
    net: { ring: 'bg-brand-accent/10', ic: 'text-brand-accent', val: 'text-brand-accent' },
  }[tone]
  const alignEnd = isAr ? 'text-right' : 'text-left'
  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.ring}`}><Icon size={15} className={t.ic} /></span>
      </div>
      {/* Amount forced LTR so digits, comma, decimal and currency never reverse
          under RTL; currency is a separate span, and the line never wraps/clips. */}
      <div dir="ltr" className={`text-base sm:text-lg font-bold tabular-nums whitespace-nowrap ${alignEnd} ${t.val}`}>
        {value}{unit ? <span className="text-xs font-normal text-gray-400 ml-1">{unit}</span> : null}
      </div>
      {sub && <div dir={subLtr ? 'ltr' : undefined} className={`text-xs text-gray-400 mt-0.5 ${alignEnd}`}>{sub}</div>}
    </div>
  )
}
