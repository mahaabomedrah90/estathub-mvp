import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { getToken, authHeader, fetchJson } from '../lib/api'
import {
  Building2, TrendingUp, MapPin, Calendar, Users,
  Shield, ArrowLeft, CheckCircle2, FileText, Download,
  Clock, Star, Lock, ChevronDown, ChevronUp
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation('property')
  const isRtl = i18n.dir() === 'rtl'

  const [property, setProperty] = useState(null)
  const [loadingProperty, setLoadingProperty] = useState(true)
  const [investAmount, setInvestAmount] = useState('')
  const [investing, setInvesting] = useState(false)
  const [investError, setInvestError] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [, setPurchaseDetails] = useState(null)
  const [minInvestment, setMinInvestment] = useState(100)
  const [platformFeePercent, setPlatformFeePercent] = useState(5)
  const [showAllDocs, setShowAllDocs] = useState(false)
  const investCardRef = useRef(null)

  // Deposit-from-invest modal state
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositModalAmount, setDepositModalAmount] = useState(0)
  const [depositModalBank, setDepositModalBank] = useState(null)
  const [depositBankRef, setDepositBankRef] = useState('')
  const [depositSubmitting, setDepositSubmitting] = useState(false)
  const [depositModalSuccess, setDepositModalSuccess] = useState(false)
  const [depositModalError, setDepositModalError] = useState('')

  // Extract id from path as fallback
  const pathMatch = location.pathname.match(/\/properties\/([^/]+)/)
  const finalId = id || (pathMatch ? pathMatch[1] : null)

  // Derived auth state
  const token = getToken()
  const userRole = (() => {
    if (!token) return null
    try {
      return JSON.parse(atob(token.split('.')[1]))?.role || null
    } catch {
      return null
    }
  })()
  const isInvestor = userRole === 'INVESTOR'

  useEffect(() => {
    if (!finalId) return
    setLoadingProperty(true)
    fetchJson(`/api/properties/${finalId}`)
      .then(data => {
        setProperty(data)
        setLoadingProperty(false)
      })
      .catch(() => setLoadingProperty(false))
  }, [finalId])

  useEffect(() => {
    if (!token) return
    fetchJson('/api/settings', { headers: authHeader() })
      .then(s => {
        if (s?.general?.minInvestmentAmount) {
          setMinInvestment(s.general.minInvestmentAmount)
          setInvestAmount(String(s.general.minInvestmentAmount))
        }
        if (s?.general?.platformFee != null) {
          setPlatformFeePercent(s.general.platformFee)
        }
      })
      .catch(() => {})
  }, [])

  // ── Derived calculations ──────────────────────────────────────────────────
  const tokenPrice = Number(property?.tokenPrice ?? 0)
  const totalTokens = Number(property?.totalTokens ?? 0)
  const remainingTokens = Number(property?.remainingTokens ?? 0)
  const soldTokens = totalTokens - remainingTokens
  const percentSold = totalTokens > 0 ? Math.round((soldTokens / totalTokens) * 100) : 0
  const percentRemaining = 100 - percentSold
  const monthlyYield = Number(property?.monthlyYield ?? 0)
  const annualROI = property?.expectedROI ?? (monthlyYield * 12)

  const amountNum = parseFloat(investAmount) || 0
  const tokensToGet = tokenPrice > 0 ? Math.floor(amountNum / tokenPrice) : 0
  const estimatedMonthly = tokensToGet * tokenPrice * monthlyYield / 100
  const estimatedAnnual = estimatedMonthly * 12

  const platformFeeAmount = parseFloat((amountNum * platformFeePercent / 100).toFixed(2))
  const totalPayable = parseFloat((amountNum + platformFeeAmount).toFixed(2))

  const amountTooLow = amountNum > 0 && amountNum < minInvestment
  const amountTooHigh = tokensToGet > remainingTokens
  const canInvest = isInvestor && tokensToGet > 0 && !amountTooLow && !amountTooHigh

  // ── Documents ─────────────────────────────────────────────────────────────
  const docs = property
    ? [
        property.deedDocumentUrl && { label: isRtl ? 'صك الملكية' : 'Title Deed', url: property.deedDocumentUrl },
        property.sitePlanDocumentUrl && { label: isRtl ? 'مخطط الموقع' : 'Site Plan', url: property.sitePlanDocumentUrl },
        property.buildingPermitUrl && { label: isRtl ? 'رخصة البناء' : 'Building Permit', url: property.buildingPermitUrl },
        property.valuationReportUrl && { label: isRtl ? 'تقرير التقييم' : 'Valuation Report', url: property.valuationReportUrl },
      ].filter(Boolean)
    : []

  // ── Invest handler ────────────────────────────────────────────────────────
  const handleInvest = async () => {
    if (!token) { navigate('/login'); return }
    if (!canInvest) return
    setInvesting(true)
    setInvestError('')
    try {
      const order = await fetchJson('/api/orders', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: property.id, tokens: tokensToGet }),
      })

      let confirmedOrder
      try {
        confirmedOrder = await fetchJson('/api/orders/confirm', {
          method: 'POST',
          headers: { ...authHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id }),
        })
      } catch (confirmErr) {
        if (confirmErr?.data?.action === 'DEPOSIT_REQUIRED') {
          setDepositModalAmount(confirmErr.data.requiredAmount)
          setDepositModalBank(confirmErr.data.bankTransfer)
          setDepositBankRef('')
          setDepositModalSuccess(false)
          setDepositModalError('')
          setShowDepositModal(true)
          return
        }
        const msg = confirmErr?.message || ''
        if (msg.includes('insufficient') || msg.includes('balance')) {
          setInvestError(isRtl
            ? 'الرصيد غير كافٍ لإتمام عملية الاستثمار. يرجى شحن المحفظة أولاً.'
            : 'Insufficient wallet balance. Please top up your wallet first.')
        } else {
          setInvestError(isRtl ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.')
        }
        return
      }

      setPurchaseDetails(confirmedOrder)
      setShowSuccessModal(true)
    } catch (err) {
      setInvestError(err?.message || (isRtl ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.'))
    } finally {
      setInvesting(false)
    }
  }

  // ── Deposit-from-invest handler ───────────────────────────────────────────
  async function handleDepositFromModal() {
    setDepositSubmitting(true)
    setDepositModalError('')
    try {
      await fetchJson('/api/wallet/deposit-request', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: depositModalAmount, bankReference: depositBankRef || undefined }),
      })
      setDepositModalSuccess(true)
    } catch {
      setDepositModalError(isRtl ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.')
    } finally {
      setDepositSubmitting(false)
    }
  }

  // ── Loading / not found ───────────────────────────────────────────────────
  if (loadingProperty) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-muted">{t('detail.loadingProperty')}</p>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base">
        <div className="text-center space-y-4">
          <Building2 size={48} className="text-text-muted mx-auto" />
          <p className="text-text-body">{isRtl ? 'العقار غير موجود' : 'Property not found'}</p>
          <button
            onClick={() => navigate('/opportunities')}
            className="text-brand-accent hover:underline text-sm"
          >
            {t('detail.backToList')}
          </button>
        </div>
      </div>
    )
  }

  const propertyName = property.title || property.name
  const locationDisplay = property.location || [property.city, property.district].filter(Boolean).join('، ')

  return (
    <div className="min-h-screen bg-surface-base" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="relative w-full h-[65vh] min-h-[460px] overflow-hidden">
        {property.imageUrl ? (
          <img
            src={property.imageUrl}
            alt={propertyName}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary to-brand-primary/80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/90 via-brand-primary/50 to-transparent" />

        {/* Back button */}
        <div className="absolute top-6 start-6 z-10">
          <button
            onClick={() => navigate('/opportunities')}
            className="flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full transition-colors"
          >
            <ArrowLeft size={16} className={isRtl ? 'rotate-180' : ''} />
            {t('detail.backToList')}
          </button>
        </div>

        {/* Hero content overlay */}
        <div className="absolute bottom-0 start-0 end-0 px-6 lg:px-12 pb-10 z-10">
          <div className="max-w-7xl mx-auto">
            {/* Status badge */}
            {property.status === 'APPROVED' && (
              <div className="inline-flex items-center gap-2 bg-brand-accent text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                {isRtl ? 'متاح للاستثمار الآن' : 'Open for Investment'}
              </div>
            )}
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 leading-tight">
              {propertyName}
            </h1>
            {locationDisplay && (
              <div className="flex items-center gap-2 text-white/80 text-sm md:text-base">
                <MapPin size={16} />
                <span>{locationDisplay}</span>
              </div>
            )}

            {/* Hero KPI strip */}
            <div className="flex flex-wrap gap-6 mt-6">
              <div className="text-white">
                <div className="text-2xl font-bold">{annualROI ? `${annualROI}%` : '—'}</div>
                <div className="text-xs text-white/70">{isRtl ? 'العائد السنوي' : 'Annual ROI'}</div>
              </div>
              <div className="w-px bg-white/20 self-stretch" />
              <div className="text-white">
                <div className="text-2xl font-bold">{tokenPrice ? `${tokenPrice.toLocaleString()} ريال` : '—'}</div>
                <div className="text-xs text-white/70">{isRtl ? 'سعر الجزء' : 'Token Price'}</div>
              </div>
              <div className="w-px bg-white/20 self-stretch" />
              <div className="text-white">
                <div className="text-2xl font-bold">{percentSold}%</div>
                <div className="text-xs text-white/70">{isRtl ? 'تم تمويله' : 'Funded'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-3 gap-8 items-start">

          {/* ── LEFT / MAIN ───────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Funding progress */}
            <div className="bg-surface-card border border-border-soft rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-text-strong">
                  {isRtl ? 'تقدم التمويل' : 'Funding Progress'}
                </span>
                <span className="text-sm font-bold text-brand-accent">{percentSold}%</span>
              </div>
              <div className="w-full bg-surface-muted rounded-full h-3 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-brand-accent transition-all duration-700"
                  style={{ width: `${percentSold}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>
                  {soldTokens.toLocaleString()} {isRtl ? 'جزء مُباع' : 'tokens sold'}
                </span>
                <span className="text-brand-accent font-medium">
                  {isRtl ? `متبقي ${percentRemaining}% فقط` : `${percentRemaining}% remaining`}
                </span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Shield, label: isRtl ? 'مرخص رسمياً' : 'Officially Licensed' },
                { icon: Lock, label: isRtl ? 'مؤمن بالبلوكشين' : 'Blockchain Secured' },
                { icon: CheckCircle2, label: isRtl ? 'موثق قانونياً' : 'Legally Verified' },
                { icon: Star, label: isRtl ? 'تحت إشراف تنظيمي' : 'Regulatory Oversight' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="bg-surface-card border border-border-soft rounded-xl p-4 flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 bg-brand-accent/10 rounded-full flex items-center justify-center">
                    <Icon size={18} className="text-brand-accent" />
                  </div>
                  <span className="text-xs font-medium text-text-body leading-tight">{label}</span>
                </div>
              ))}
            </div>

            {/* About */}
            <div className="bg-surface-card border border-border-soft rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-text-strong mb-4">
                {isRtl ? 'نظرة عامة على العقار' : 'Property Overview'}
              </h2>
              <p className="text-text-body text-sm leading-relaxed whitespace-pre-line">
                {property.propertyDescription || property.description || t('detail.aboutFallback')}
              </p>
            </div>

            {/* Property details grid */}
            <div className="bg-surface-card border border-border-soft rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-text-strong mb-6">
                {isRtl ? 'تفاصيل العقار' : 'Property Details'}
              </h2>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                {[
                  property.propertyTypeDetailed && {
                    label: isRtl ? 'نوع العقار' : 'Property Type',
                    icon: Building2,
                    value: property.propertyTypeDetailed,
                  },
                  property.landArea && {
                    label: isRtl ? 'مساحة الأرض' : 'Land Area',
                    icon: MapPin,
                    value: `${Number(property.landArea).toLocaleString()} م²`,
                  },
                  property.builtArea && {
                    label: isRtl ? 'المساحة المبنية' : 'Built Area',
                    icon: Building2,
                    value: `${Number(property.builtArea).toLocaleString()} م²`,
                  },
                  property.floorsCount != null && {
                    label: isRtl ? 'عدد الطوابق' : 'Floors',
                    icon: Building2,
                    value: property.floorsCount,
                  },
                  property.unitsCount != null && {
                    label: isRtl ? 'عدد الوحدات' : 'Units',
                    icon: Users,
                    value: property.unitsCount,
                  },
                  property.buildingAge != null && {
                    label: isRtl ? 'عمر المبنى' : 'Building Age',
                    icon: Calendar,
                    value: `${property.buildingAge} ${isRtl ? 'سنوات' : 'yrs'}`,
                  },
                  property.propertyCondition && {
                    label: isRtl ? 'حالة العقار' : 'Condition',
                    icon: CheckCircle2,
                    value: property.propertyCondition,
                  },
                  property.ownerName && {
                    label: isRtl ? 'المالك' : 'Owner',
                    icon: Users,
                    value: property.ownerName,
                  },
                ].filter(Boolean).map(({ label, icon: Icon, value }) => (
                  <div key={label} className="flex items-start gap-3 py-2 border-b border-border-soft last:border-0">
                    <div className="w-8 h-8 bg-brand-accent/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={14} className="text-brand-accent" />
                    </div>
                    <div>
                      <div className="text-xs text-text-muted mb-0.5">{label}</div>
                      <div className="text-sm font-semibold text-text-strong">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial returns */}
            <div className="bg-surface-card border border-border-soft rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-text-strong mb-6">
                {isRtl ? 'العوائد المالية المتوقعة' : 'Expected Financial Returns'}
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-brand-primary rounded-xl p-5 text-center">
                  <div className="text-3xl font-bold text-white mb-1">
                    {monthlyYield}%
                  </div>
                  <div className="text-xs text-white/70">{isRtl ? 'العائد الشهري' : 'Monthly Yield'}</div>
                </div>
                <div className="bg-brand-accent rounded-xl p-5 text-center">
                  <div className="text-3xl font-bold text-white mb-1">
                    {annualROI ? `${annualROI}%` : `${(monthlyYield * 12).toFixed(1)}%`}
                  </div>
                  <div className="text-xs text-white/70">{isRtl ? 'العائد السنوي' : 'Annual ROI'}</div>
                </div>
                <div className="bg-surface-muted rounded-xl p-5 text-center border border-border-soft">
                  <div className="text-3xl font-bold text-text-strong mb-1">
                    {property.totalValue ? `${Number(property.totalValue).toLocaleString()}` : '—'}
                  </div>
                  <div className="text-xs text-text-muted">{isRtl ? 'القيمة الإجمالية (ريال)' : 'Total Value (SAR)'}</div>
                </div>
              </div>
            </div>

            {/* Documents */}
            {docs.length > 0 && (
              <div className="bg-surface-card border border-border-soft rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-text-strong mb-4">
                  {isRtl ? 'المستندات القانونية' : 'Legal Documents'}
                </h2>
                <div className="space-y-2">
                  {(showAllDocs ? docs : docs.slice(0, 3)).map(({ label, url }) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 bg-surface-muted hover:bg-brand-accent/5 border border-border-soft rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-brand-accent flex-shrink-0" />
                        <span className="text-sm font-medium text-text-body group-hover:text-text-strong">{label}</span>
                      </div>
                      <Download size={16} className="text-text-muted group-hover:text-brand-accent transition-colors" />
                    </a>
                  ))}
                </div>
                {docs.length > 3 && (
                  <button
                    onClick={() => setShowAllDocs(v => !v)}
                    className="flex items-center gap-2 text-brand-accent text-sm mt-3 hover:underline"
                  >
                    {showAllDocs
                      ? (isRtl ? 'عرض أقل' : 'Show less')
                      : (isRtl ? `عرض الكل (${docs.length})` : `Show all (${docs.length})`)}
                    {showAllDocs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT / STICKY INVESTMENT CARD ────────────────────────────── */}
          <div className="lg:sticky lg:top-24 space-y-4" ref={investCardRef}>

            {/* Scarcity / urgency strip */}
            {percentRemaining <= 30 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <Clock size={16} className="text-amber-600 flex-shrink-0" />
                <p className="text-xs font-medium text-amber-700">
                  {isRtl
                    ? `تنبيه: متبقي ${percentRemaining}% فقط من الفرصة. لا تفوّت!`
                    : `Only ${percentRemaining}% remaining — closing soon!`}
                </p>
              </div>
            )}

            {/* Investment card */}
            <div className="bg-surface-card border border-border-soft rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-brand-primary px-6 py-5">
                <div className="text-white/80 text-xs font-medium mb-1">
                  {isRtl ? 'حاسبة الاستثمار' : 'Investment Calculator'}
                </div>
                <div className="text-white text-2xl font-bold">
                  {isRtl ? 'ابدأ استثمارك الآن' : 'Start Investing Today'}
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Summary rows */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">{isRtl ? 'سعر الجزء' : 'Token Price'}</span>
                    <span className="font-bold text-text-strong">{tokenPrice.toLocaleString()} {isRtl ? 'ريال' : 'SAR'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">{isRtl ? 'الحد الأدنى للاستثمار' : 'Min Investment'}</span>
                    <span className="font-bold text-text-strong">{minInvestment.toLocaleString()} {isRtl ? 'ريال' : 'SAR'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">{isRtl ? 'الأجزاء المتبقية' : 'Tokens Left'}</span>
                    <span className="font-bold text-brand-accent">{remainingTokens.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-t border-border-soft" />

                {/* Amount input */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-2">
                    {isRtl ? 'مبلغ الاستثمار (ريال)' : 'Investment Amount (SAR)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={minInvestment}
                      step={tokenPrice || 1}
                      value={investAmount}
                      onChange={e => {
                        setInvestAmount(e.target.value)
                        setInvestError('')
                      }}
                      placeholder={`${minInvestment.toLocaleString()}`}
                      className={`w-full border rounded-xl px-4 py-3 text-sm font-medium text-text-strong bg-surface-base focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all ${
                        amountTooLow || amountTooHigh
                          ? 'border-red-300 focus:ring-red-400'
                          : 'border-border-soft'
                      }`}
                    />
                  </div>
                  {amountTooLow && (
                    <p className="text-red-500 text-xs mt-1">
                      {isRtl
                        ? `الحد الأدنى للاستثمار ${minInvestment.toLocaleString()} ريال`
                        : `Minimum investment is ${minInvestment.toLocaleString()} SAR`}
                    </p>
                  )}
                  {amountTooHigh && (
                    <p className="text-red-500 text-xs mt-1">
                      {isRtl ? 'المبلغ يتجاوز الأجزاء المتاحة' : 'Amount exceeds available tokens'}
                    </p>
                  )}
                </div>

                {/* Auto-calculated results */}
                {tokensToGet > 0 && (
                  <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-xl p-4 space-y-2 transition-all">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">{isRtl ? 'عدد الأجزاء' : 'Tokens'}</span>
                      <span className="font-bold text-text-strong">{tokensToGet.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">{isRtl ? 'العائد الشهري المتوقع' : 'Est. Monthly Return'}</span>
                      <span className="font-bold text-brand-accent">
                        {estimatedMonthly.toLocaleString(undefined, { maximumFractionDigits: 2 })} {isRtl ? 'ريال' : 'SAR'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">{isRtl ? 'العائد السنوي المتوقع' : 'Est. Annual Return'}</span>
                      <span className="font-bold text-brand-accent">
                        {estimatedAnnual.toLocaleString(undefined, { maximumFractionDigits: 2 })} {isRtl ? 'ريال' : 'SAR'}
                      </span>
                    </div>

                    {/* Platform fee breakdown */}
                    <div className="border-t border-brand-accent/20 pt-2 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">{isRtl ? 'مبلغ الاستثمار' : 'Investment Amount'}</span>
                        <span className="font-bold text-text-strong">
                          {amountNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} {isRtl ? 'ريال' : 'SAR'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">
                          {isRtl ? `رسوم المنصة (${platformFeePercent}%)` : `Platform Fee (${platformFeePercent}%)`}
                        </span>
                        <span className="font-bold text-text-strong">
                          {platformFeeAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {isRtl ? 'ريال' : 'SAR'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-brand-accent/20 pt-2">
                        <span className="font-semibold text-text-strong">{isRtl ? 'الإجمالي المستحق' : 'Total Payable'}</span>
                        <span className="font-bold text-brand-primary">
                          {totalPayable.toLocaleString(undefined, { maximumFractionDigits: 2 })} {isRtl ? 'ريال' : 'SAR'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {investError && (
                  <p className="text-red-500 text-xs text-center">{investError}</p>
                )}

                {/* CTA */}
                {!token ? (
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 hover:shadow-lg active:scale-95"
                  >
                    {isRtl ? 'سجّل دخولك للاستثمار' : 'Login to Invest'}
                  </button>
                ) : !isInvestor ? (
                  <div className="text-center text-xs text-text-muted bg-surface-muted rounded-xl p-4">
                    {isRtl
                      ? 'يمكن للمستثمرين فقط الاستثمار في هذا العقار.'
                      : 'Only investors can purchase tokens from this page.'}
                  </div>
                ) : (
                  <button
                    onClick={handleInvest}
                    disabled={!canInvest || investing}
                    className="w-full bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 hover:shadow-lg active:scale-95"
                  >
                    {investing
                      ? (isRtl ? 'جاري المعالجة...' : 'Processing...')
                      : remainingTokens === 0
                      ? (isRtl ? 'مكتملة التمويل' : 'Fully Funded')
                      : (isRtl ? 'استثمر الآن' : 'Invest Now')}
                  </button>
                )}

                {/* Safety note */}
                <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
                  <Shield size={12} />
                  <span>{isRtl ? 'مؤمن ومحمي بتقنية البلوكشين' : 'Secured by blockchain technology'}</span>
                </div>
              </div>
            </div>

            {/* Social proof */}
            <div className="bg-surface-card border border-border-soft rounded-xl px-5 py-4">
              <div className="flex items-center gap-3">
                <TrendingUp size={16} className="text-brand-accent flex-shrink-0" />
                <p className="text-xs text-text-body">
                  {isRtl
                    ? `${percentSold}% من قيمة العقار تم تمويله بالفعل من مستثمرين موثوقين`
                    : `${percentSold}% of this property is already funded by verified investors`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DEPOSIT REQUIRED MODAL ───────────────────────────────────────── */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-2xl max-w-md w-full p-8 shadow-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-strong">
                {isRtl ? 'طلب إيداع عبر التحويل البنكي' : 'Bank Transfer Deposit Request'}
              </h2>
              <button
                onClick={() => setShowDepositModal(false)}
                className="text-text-muted hover:text-text-strong text-xl leading-none"
              >✕</button>
            </div>

            {depositModalSuccess ? (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={28} className="text-green-600" />
                </div>
                <p className="text-text-strong font-semibold">
                  {isRtl ? 'تم استلام طلب الإيداع' : 'Deposit request received'}
                </p>
                <p className="text-sm text-text-muted">
                  {isRtl
                    ? 'سيتم مراجعة طلبك وتحديث رصيدك بعد التحقق من التحويل.'
                    : 'Your request will be reviewed and balance updated after transfer verification.'}
                </p>
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="w-full bg-brand-accent text-white font-semibold py-3 rounded-xl hover:bg-brand-accent/90 transition-colors"
                >
                  {isRtl ? 'حسناً' : 'OK'}
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Warning */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  {isRtl
                    ? 'حوّل المبلغ أولاً إلى الحساب البنكي، ثم أرسل طلب الإيداع للمراجعة. لن يتم تحديث الرصيد إلا بعد التحقق والموافقة.'
                    : 'Transfer the amount to the bank account first, then submit this request. Balance will only update after verification and approval.'}
                </div>

                {/* Bank details */}
                <div className="bg-surface-muted rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">{isRtl ? 'البنك' : 'Bank'}</span>
                    <span className="font-semibold text-text-strong">{depositModalBank?.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">{isRtl ? 'اسم الحساب' : 'Account Name'}</span>
                    <span className="font-semibold text-text-strong">{depositModalBank?.accountName}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-text-muted flex-shrink-0">{isRtl ? 'رقم الآيبان' : 'IBAN'}</span>
                    <span className="font-mono font-semibold text-text-strong text-xs break-all text-end">{depositModalBank?.iban}</span>
                  </div>
                </div>

                {/* Required amount (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-text-body mb-1">
                    {isRtl ? 'المبلغ المطلوب (ريال)' : 'Required Amount (SAR)'}
                  </label>
                  <input
                    type="number"
                    value={depositModalAmount}
                    readOnly
                    className="w-full border border-border-soft rounded-xl px-4 py-3 bg-surface-muted text-text-strong font-bold text-lg"
                  />
                </div>

                {/* Bank reference */}
                <div>
                  <label className="block text-sm font-medium text-text-body mb-1">
                    {isRtl ? 'رقم مرجع التحويل (اختياري)' : 'Transfer Reference (optional)'}
                  </label>
                  <input
                    type="text"
                    value={depositBankRef}
                    onChange={e => setDepositBankRef(e.target.value)}
                    placeholder={isRtl ? 'أدخل رقم المرجع البنكي' : 'Enter bank reference number'}
                    className="w-full border border-border-soft rounded-xl px-4 py-3 bg-white text-text-strong focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>

                {depositModalError && (
                  <p className="text-red-600 text-sm">{depositModalError}</p>
                )}

                <p className="text-xs text-text-muted">{depositModalBank?.instructions}</p>

                <button
                  onClick={handleDepositFromModal}
                  disabled={depositSubmitting}
                  className="w-full bg-brand-accent text-white font-semibold py-3 rounded-xl hover:bg-brand-accent/90 disabled:opacity-60 transition-colors"
                >
                  {depositSubmitting
                    ? (isRtl ? 'جاري الإرسال...' : 'Submitting...')
                    : (isRtl ? 'إرسال طلب الإيداع' : 'Submit Deposit Request')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUCCESS MODAL ─────────────────────────────────────────────────── */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-2xl max-w-md w-full p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="text-brand-accent" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-text-strong mb-3">
              {t('detail.successTitle')}
            </h2>
            <p className="text-text-muted mb-6 text-sm">
              {t('detail.successBody')}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-brand-accent mb-6">
              <Shield size={16} />
              <span>{t('detail.secBadge')}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowSuccessModal(false); navigate('/investor/wallet') }}
                className="flex-1 bg-brand-accent text-white font-semibold py-3 rounded-xl hover:bg-brand-accent/90 transition-colors"
              >
                {t('detail.successViewPortfolio')}
              </button>
              <button
                onClick={() => { setShowSuccessModal(false); navigate('/opportunities') }}
                className="flex-1 border border-border-soft text-text-body font-semibold py-3 rounded-xl hover:bg-surface-muted transition-colors"
              >
                {t('detail.successBrowseMore')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
