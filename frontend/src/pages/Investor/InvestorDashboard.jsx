import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authHeader, fetchJson, getToken } from '../../lib/api'
import {
  Building2, TrendingUp, DollarSign, Wallet, Loader2, AlertCircle,
  PieChart, Calendar, ArrowUpRight, ArrowDownRight, Target, Award,
  Eye, History, XCircle, Clock, CheckCircle2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import SarIcon from '../../components/ui/SarIcon'
export default function InvestorDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wallet, setWallet] = useState(null)
  const [properties, setProperties] = useState([])
  const { t, i18n } = useTranslation('pages')
  const { t: tCommon } = useTranslation('common')
  const isArabic = i18n.language === 'ar'

  useEffect(() => {
    loadInvestorData()
  }, [])

  async function loadInvestorData() {
    try {
      setLoading(true)
      setError('')
      
      if (!getToken()) {
        setError('Please login to view your portfolio')
        setLoading(false)
        return
      }

      // Load wallet data (with fallback)
      try {
        const walletData = await fetchJson('/api/wallet', { headers: { ...authHeader() } })
        setWallet(walletData)
      } catch (walletErr) {
        console.warn('Wallet API failed, using fallback:', walletErr)
        setWallet({ cashBalance: 0, tokensOwned: [] }) // Fallback wallet data
      }

      // Load all properties for reference (with fallback)
      try {
      const propertiesData = await fetchJson('/api/properties')
      setProperties(Array.isArray(propertiesData) ? propertiesData : [])
      } catch (propsErr) {
      console.warn('Properties API failed, using empty array:', propsErr)
      setProperties([]) // Fallback empty properties
      }
    } catch (err) {
      console.error('Portfolio load error:', err)
      setError(err.message || 'Failed to load portfolio data')
    } finally {
      setLoading(false)
    }
  }

  if (!getToken()) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Wallet className="mx-auto text-gray-400" size={64} />
          <div className="text-gray-600">
            {isArabic
              ? 'يرجى تسجيل الدخول لعرض محفظتك الاستثمارية.'
              : 'Please login to view your investment portfolio.'}
          </div>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold transition-colors"
          >
            {isArabic ? 'تسجيل الدخول الآن' : 'Login Now'}
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-brand-accent mx-auto" size={40} />
          <div className="text-gray-600">
            {isArabic
              ? 'جاري تحميل محفظتك الاستثمارية...'
              : 'Loading your portfolio...'}
          </div>
        </div>
      </div>
    )
  }
// Always render dashboard, show error as notification if present
  if (error) {
   console.warn('Dashboard loaded with errors:', error)
  }

  // Ensure wallet has default values to prevent crashes
 const safeWallet = wallet || { cashBalance: 0, investedValue: 0, holdings: [], transactions: [], withdrawalHistory: [], depositHistory: [] }
 const totalBalance = (safeWallet.cashBalance ?? 0) + (safeWallet.investedValue ?? 0)
 const holdings = safeWallet.holdings || []
const recentHoldings = holdings.slice(0, 5)
const transactions = safeWallet.transactions || []

  // Build unified timeline (last 10 items)
  const timelineItems = (() => {
    const items = []
    for (const w of safeWallet.withdrawalHistory || []) {
      items.push({ _key: `wr-${w.id}`, source: 'withdrawal', status: w.status, amount: w.amount,
        date: w.createdAt, reviewedAt: w.reviewedAt || null, bankName: w.bankName || null,
        ibanMasked: w.iban || null, adminNote: w.adminNote || null })
    }
    for (const d of safeWallet.depositHistory || []) {
      items.push({ _key: `dr-${d.id}`, source: 'deposit', status: d.status, amount: d.amount,
        date: d.createdAt, reviewedAt: d.reviewedAt || null, bankName: d.bankName || null,
        adminNote: d.adminNote || null })
    }
    for (const tx of transactions) {
      const tp = (tx.type || '').toUpperCase()
      if (tp === 'DEPOSIT' || tp === 'WITHDRAWAL') continue
      items.push({ _key: `tx-${tx.id}`, source: 'transaction', txType: tx.type, amount: tx.amount,
        date: tx.createdAt, reviewedAt: null, note: tx.note || null, status: null, adminNote: null })
    }
    return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)
  })()

  // Calculate portfolio metrics
  const totalInvested = safeWallet.investedValue ?? 0
const totalReturns = holdings.reduce((sum, h) => {
  const property = properties.find(p => p.id === h.propertyId)
  if (!property) return sum

  const tokens = h.tokens ?? h.ownedTokens ?? h.tokensOwned ?? 0
  const tokenPrice = Number(property.tokenPrice ?? 0)
  const monthlyYield = property.monthlyYield ?? 0

  const monthlyReturn = (tokens * tokenPrice * monthlyYield) / 100
  return sum + monthlyReturn
}, 0)
  
  const portfolioGrowth = totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(2) : 0
  const numberOfProperties = holdings.length

  // Recent transactions (last 5)
  const recentTransactions = transactions.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
      <div>
  <h1 className="text-3xl font-bold text-[#1E1958]">
    {isArabic ? 'محفظتي الاستثمارية' : 'My Investment Portfolio'}
  </h1>
  <p className="text-gray-600">
    {isArabic
      ? 'تابع استثماراتك العقارية وعوائدك.'
      : 'Track your real estate investments and returns.'}
  </p>
</div>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Portfolio Value */}
        <div className="bg-gradient-to-br from-[#1E1958] to-[#2a2458] rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded">
              <TrendingUp size={14} />
               <span>{isArabic ? 'الإجمالي' : 'Total'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1 flex items-center gap-1">{totalBalance.toLocaleString()} <SarIcon size={20} className="text-white/80" /></div>
          <div className="text-brand-accent/20 text-sm">
            {isArabic ? 'قيمة المحفظة' : 'Portfolio Value'}
          </div>
        </div>

        {/* Invested Amount */}
        <div className="bg-[#CDB9A1]/30 border border-[#CDB9A1]/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#1E1958]/10 rounded-lg flex items-center justify-center">
              <DollarSign className="text-[#1E1958]" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-[#1E1958]">
              <Target size={14} />
              <span>{isArabic ? 'المستثمر' : 'Invested'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1E1958] mb-1 flex items-center gap-1">
            {totalInvested.toLocaleString()} <SarIcon size={20} className="text-[#1E1958]/80" />
          </div>
          <div className="text-sm text-gray-600">
            {isArabic ? 'إجمالي المبلغ المستثمر' : 'Total Invested'}
          </div>
        </div>

        {/* Monthly Returns */}
        <div className="bg-[#41EAD4]/10 border border-[#41EAD4]/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#41EAD4]/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-[#41EAD4]" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-[#41EAD4]">
              <Calendar size={14} />
              <span>{isArabic ? 'شهرياً' : 'Monthly'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-[#41EAD4] mb-1 flex items-center gap-1">
            {totalReturns.toFixed(2)} <SarIcon size={20} className="text-[#41EAD4]/80" />
          </div>
          <div className="text-sm text-gray-600">
            {isArabic ? 'العوائد المتوقعة' : 'Expected Returns'}
          </div>
        </div>

        {/* Number of Properties */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#986F9A]/10 rounded-lg flex items-center justify-center">
              <Building2 className="text-[#986F9A]" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-[#986F9A]">
              <Award size={14} />
              <span>{isArabic ? 'نشط' : 'Active'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-[#986F9A] mb-1">{numberOfProperties}</div>
          <div className="text-sm text-gray-600">
            {isArabic ? 'العقارات المستثمر فيها' : 'Properties Invested'}
          </div>
        </div>
      </div>

      {/* Portfolio Performance */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Balance Breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {isArabic ? 'تفصيل الرصيد' : 'Balance Breakdown'}
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-brand-accent/10 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-accent rounded-lg flex items-center justify-center">
                  <Building2 className="text-white" size={20} />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {isArabic ? 'المستثمر في العقارات' : 'Invested in properties'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {numberOfProperties} {isArabic ? 'عقار' : 'properties'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-brand-accent flex items-center gap-1">
                 {totalInvested.toLocaleString()} <SarIcon size={16} className="text-brand-accent/80" />
                </div>
                <div className="text-xs text-gray-500">
                  {totalBalance > 0 ? ((totalInvested / totalBalance) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-brand-primary/10 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center">
                  <Wallet className="text-white" size={20} />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {isArabic ? 'الرصيد المتاح' : 'Available Cash'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {isArabic ? 'جاهز للاستثمار' : 'Ready to invest'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-brand-primary flex items-center gap-1">
                  {(wallet?.cashBalance ?? 0).toLocaleString()} <SarIcon size={16} className="text-brand-primary/80" />
                </div>
                <div className="text-xs text-gray-500">
                  {totalBalance > 0 ? (((wallet?.cashBalance ?? 0) / totalBalance) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="pt-2">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">
                  {isArabic ? 'توزيع المحفظة' : 'Portfolio allocation'}
                </span>
                <span className="font-semibold text-gray-900">
                  {totalBalance > 0 ? ((totalInvested / totalBalance) * 100).toFixed(0) : 0}%{' '}
                  {isArabic ? 'مستثمر' : 'invested'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-brand-accent h-3 rounded-full transition-all" 
                  style={{ width: `${totalBalance > 0 ? ((totalInvested / totalBalance) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {isArabic ? 'مؤشرات الأداء' : 'Performance metrics'}
          </h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-brand-accent pl-4 py-2">
              <div className="text-sm text-gray-600 mb-1">
                {isArabic ? 'معدل العائد الشهري' : 'Monthly return rate'}
              </div>
              <div className="text-2xl font-bold text-gray-900">{portfolioGrowth}%</div>
              <div className="text-xs text-brand-accent flex items-center gap-1 mt-1">
                <ArrowUpRight size={14} />
                <span>
                  {isArabic ? 'نمو شهري متوقّع' : 'Expected monthly growth'}
                </span>
              </div>
            </div>

            <div className="border-l-4 border-brand-primary pl-4 py-2">
              <div className="text-sm text-gray-600 mb-1">
                {isArabic ? 'تقدير سنوي' : 'Annual projection'}
              </div>
              <div className="text-2xl font-bold text-gray-900 flex items-center gap-1">
                {(totalReturns * 12).toFixed(2)} <SarIcon size={18} className="text-gray-600" />
              </div>
              <div className="text-xs text-brand-primary flex items-center gap-1 mt-1">
                <Calendar size={14} />
                <span>
                  {isArabic ? 'عوائد سنوية متوقعة' : 'Projected yearly returns'}
                </span>
              </div>
            </div>

            <div className="border-l-4 border-brand-primary pl-4 py-2">
              <div className="text-sm text-gray-600 mb-1">
                {isArabic ? 'إمكانات العائد على الاستثمار' : 'ROI potential'}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {totalInvested > 0 ? ((totalReturns * 12 / totalInvested) * 100).toFixed(2) : 0}%
              </div>
              <div className="text-xs text-brand-primary flex items-center gap-1 mt-1">
                <Target size={14} />
                <span>
                  {isArabic ? 'عائد سنوي على الاستثمار' : 'Annual return on investment'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* My Holdings */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {isArabic ? 'ممتلكاتي العقارية' : 'My property holdings'}
          </h2>
          <button
            onClick={() => navigate('/opportunities')}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {isArabic ? 'استكشاف فرص أخرى' : 'Explore more properties'} →
          </button>
        </div>
        
        {recentHoldings.length === 0 ? (

          <div className="text-center py-12 text-gray-500">
            <Building2 className="mx-auto mb-2 text-gray-300" size={48} />
            <div className="mb-4">
              {isArabic
                ? 'لم تستثمر في أي عقار بعد.'
                : "You haven't invested in any properties yet."}
            </div>
            <button
              onClick={() => navigate('/opportunities')}
              className="px-6 py-2.5 rounded-lg bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold transition-colors"
            >
              {isArabic ? 'تصفح الفرص' : 'Browse opportunities'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
           {recentHoldings.map(holding => {
            const property = properties.find(p => p.id === holding.propertyId)
            if (!property) return null

            const tokens = holding.tokens ?? holding.ownedTokens ?? holding.tokensOwned ?? 0
            const tokenPrice = Number(property.tokenPrice ?? 0)
            const monthlyYield = property.monthlyYield ?? 0
            const investmentValue = tokens * tokenPrice
            const monthlyReturn = (investmentValue * monthlyYield) / 100
            const totalTokens = property.totalTokens ?? property.tokensAvailable ?? 0
            const ownershipPercent = totalTokens > 0 ? ((tokens / totalTokens) * 100).toFixed(2) : 0
              return (
                <div key={holding.propertyId} className="border border-gray-200 rounded-lg p-5 hover:border-brand-accent/50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-16 h-16 bg-gradient-to-br from-brand-accent to-brand-primary rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="text-white" size={28} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                          {property.name || property.title}
                        </h3>
                        <div className="text-sm text-gray-600 mb-2">{property.location || 'Riyadh, Saudi Arabia'}</div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-brand-accent">
                            <TrendingUp size={14} />
                            <span className="font-semibold">
                              {monthlyYield}% {isArabic ? 'عائد شهري' : 'monthly yield'}
                            </span>
                          </div>
                          <div className="text-gray-500">
                            {ownershipPercent}% {isArabic ? 'نسبة الملكية' : 'ownership'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/properties/${holding.propertyId}`)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
                    >
                      <Eye size={16} />
                      <span>View</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">
                        {isArabic ? 'عدد الأجزاء' : 'Tokens owned'}
                      </div>
                      <div className="text-lg font-semibold text-gray-900"> {tokens}</div>
                    </div>
                    <div className="bg-brand-primary/10 rounded-lg p-3">
                      <div className="text-xs text-brand-primary mb-1">
                        {isArabic ? 'الاستثمار' : 'Investment'}
                      </div>
                      <div className="text-lg font-semibold text-brand-primary flex items-center gap-1">
                       {investmentValue.toLocaleString()} <SarIcon size={16} className="text-brand-primary/80" />
                      </div>
                    </div>
                    <div className="bg-brand-accent/10 rounded-lg p-3">
                      <div className="text-xs text-brand-accent mb-1">
                        {isArabic ? 'العائد الشهري' : 'Monthly return'}
                      </div>
                      <div className="text-lg font-semibold text-brand-accent flex items-center gap-1">
                        {monthlyReturn.toFixed(2)} <SarIcon size={16} className="text-brand-accent/80" />
                      </div>
                    </div>
                    <div className="bg-brand-primary/10 rounded-lg p-3">
                      <div className="text-xs text-brand-primary mb-1">
                        {isArabic ? 'العائد السنوي' : 'Annual return'}
                      </div>
                      <div className="text-lg font-semibold text-brand-primary flex items-center gap-1">
                        {(monthlyReturn * 12).toFixed(2)} <SarIcon size={16} className="text-brand-primary/80" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Wallet Activity — unified timeline */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <History size={20} className="text-gray-400" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isArabic ? 'سجل المحفظة' : 'Wallet Activity'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isArabic ? 'آخر ١٠ عمليات — الأحدث أولاً' : 'Last 10 — newest first'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/investor/wallet')}
            className="text-sm text-[#1E1958] hover:text-[#41EAD4] font-medium transition-colors"
          >
            {isArabic ? 'عرض الكل' : 'View all'} →
          </button>
        </div>

        {timelineItems.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <History className="mx-auto mb-2 text-gray-200" size={40} />
            <div className="font-medium">{isArabic ? 'لا توجد عمليات بعد' : 'No activity yet'}</div>
            <div className="text-sm mt-1">{isArabic ? 'ستظهر هنا جميع العمليات المالية' : 'Financial activity will appear here'}</div>
          </div>
        ) : (
          <div className="space-y-2">
            {timelineItems.map(item => {
              const loc = isArabic ? 'ar-SA' : 'en-US'
              const sar = isArabic ? 'ريال' : 'SAR'
              const fmtDate = d => d ? new Date(d).toLocaleDateString(loc, {
                day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Riyadh',
              }) : '—'

              // ── Deposit ──
              if (item.source === 'deposit') {
                const s = item.status
                const ok = s === 'APPROVED', pend = s === 'PENDING', rej = s === 'REJECTED'
                const Icon   = pend ? Clock : ok ? CheckCircle2 : XCircle
                const iconBg = pend ? 'bg-amber-100'  : ok ? 'bg-green-100' : 'bg-red-100'
                const iconCl = pend ? 'text-amber-600' : ok ? 'text-green-600' : 'text-red-600'
                const cardBg = pend ? 'bg-amber-50 border-amber-200' : ok ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-200'
                const amtCl  = pend ? 'text-amber-700' : ok ? 'text-green-600' : 'text-gray-400'
                const title  = pend ? (isArabic ? 'طلب إيداع قيد المراجعة' : 'Deposit Under Review')
                             : ok   ? (isArabic ? 'تم الإيداع بنجاح' : 'Deposit Completed')
                             :         (isArabic ? 'تعذر قبول طلب الإيداع' : 'Deposit Request Rejected')
                const subtitle = pend ? (isArabic ? 'سيتم تحديث رصيدك بعد التحقق' : 'Balance updated after verification')
                               : ok   ? (item.bankName || (isArabic ? 'تحويل بنكي' : 'Bank transfer'))
                               :         (isArabic ? 'لم يتم إضافة أي مبلغ لمحفظتك' : 'No amount was added to your wallet')
                return (
                  <div key={item._key} className={`flex items-start gap-4 p-4 rounded-xl border ${cardBg}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}>
                      <Icon size={20} className={iconCl} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 leading-tight">{title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{fmtDate(ok && item.reviewedAt ? item.reviewedAt : item.date)}</div>
                      {rej && item.adminNote && (
                        <div className="mt-2 text-xs text-red-700 bg-red-100 rounded-lg px-2.5 py-1.5">
                          {isArabic ? `السبب: ${item.adminNote}` : `Reason: ${item.adminNote}`}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-0.5">
                      <span className={`font-bold text-sm whitespace-nowrap ${amtCl} ${rej ? 'line-through opacity-60' : ''}`}>
                        +{item.amount.toLocaleString(loc)} {sar}
                      </span>
                      {pend && <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full"><Clock size={10} />{isArabic ? 'قيد المراجعة' : 'Pending'}</span>}
                      {ok   && <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle2 size={10} />{isArabic ? 'مكتمل' : 'Completed'}</span>}
                      {rej  && <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><XCircle size={10} />{isArabic ? 'مرفوض' : 'Rejected'}</span>}
                    </div>
                  </div>
                )
              }

              // ── Withdrawal ──
              if (item.source === 'withdrawal') {
                const s = item.status
                const ok = s === 'APPROVED', pend = s === 'PENDING', rej = s === 'REJECTED'
                const Icon   = pend ? Clock : ok ? CheckCircle2 : XCircle
                const iconBg = pend ? 'bg-amber-100'  : ok ? 'bg-green-100' : 'bg-red-100'
                const iconCl = pend ? 'text-amber-600' : ok ? 'text-green-600' : 'text-red-600'
                const cardBg = pend ? 'bg-amber-50 border-amber-200' : ok ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-200'
                const amtCl  = pend ? 'text-amber-700' : ok ? 'text-red-600' : 'text-gray-400'
                const title  = pend ? (isArabic ? 'طلب سحب قيد المراجعة' : 'Withdrawal Under Review')
                             : ok   ? (isArabic ? 'تم تنفيذ السحب' : 'Withdrawal Completed')
                             :         (isArabic ? 'تعذر تنفيذ طلب السحب' : 'Withdrawal Request Rejected')
                const subtitle = pend ? (isArabic ? 'متوقع: ١–٢ أيام عمل' : 'Expected: 1–2 business days')
                               : ok   ? (item.bankName || (isArabic ? 'تحويل بنكي' : 'Bank transfer'))
                               :         (isArabic ? 'لم يتم خصم أي مبلغ من محفظتك' : 'No amount was deducted from your wallet')
                return (
                  <div key={item._key} className={`flex items-start gap-4 p-4 rounded-xl border ${cardBg}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}>
                      <Icon size={20} className={iconCl} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 leading-tight">{title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
                      {ok && item.ibanMasked && (
                        <div className="text-xs font-mono text-gray-400 mt-0.5 tracking-wider">{item.ibanMasked}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-0.5">{fmtDate(ok && item.reviewedAt ? item.reviewedAt : item.date)}</div>
                      {rej && (
                        <div className="mt-2 text-xs text-red-700 bg-red-100 rounded-lg px-2.5 py-1.5">
                          {item.adminNote
                            ? (isArabic ? `السبب: ${item.adminNote}` : `Reason: ${item.adminNote}`)
                            : (isArabic ? 'لم يتم خصم أي مبلغ من محفظتك.' : 'No amount was deducted from your wallet.')}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-0.5">
                      <span className={`font-bold text-sm whitespace-nowrap ${amtCl} ${rej ? 'line-through opacity-60' : ''}`}>
                        −{item.amount.toLocaleString(loc)} {sar}
                      </span>
                      {pend && <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full"><Clock size={10} />{isArabic ? 'قيد المراجعة' : 'Pending'}</span>}
                      {ok   && <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle2 size={10} />{isArabic ? 'مكتمل' : 'Completed'}</span>}
                      {rej  && <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><XCircle size={10} />{isArabic ? 'مرفوض' : 'Rejected'}</span>}
                    </div>
                  </div>
                )
              }

              // ── Other transaction ──
              const typeUpper = (item.txType || '').toUpperCase()
              const isDistrib = typeUpper === 'DISTRIBUTION'
              const isInvestment = typeUpper === 'TOKEN_MINT' || typeUpper === 'TOKEN_TRANSFER'
              const TxIcon = isDistrib ? DollarSign : Building2
              const iconBg = isDistrib ? 'bg-[#41EAD4]/10' : 'bg-[#1E1958]/5'
              const iconCl = isDistrib ? 'text-[#41EAD4]' : 'text-[#1E1958]'
              const amtCl  = isDistrib ? 'text-green-600' : 'text-[#1E1958]'
              const txTitle = isDistrib    ? (isArabic ? 'توزيع أرباح' : 'Profit Distribution')
                            : isInvestment ? (isArabic ? 'استثمار عقاري' : 'Property Investment')
                            : (item.txType || '')
              return (
                <div key={item._key} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:bg-gray-50/60 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}>
                    <TxIcon size={20} className={iconCl} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 leading-tight">{txTitle}</div>
                    {item.note && <div className="text-xs text-gray-500 mt-0.5">{item.note}</div>}
                    <div className="text-xs text-gray-400 mt-0.5">{fmtDate(item.date)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-0.5">
                    <span className={`font-bold text-sm whitespace-nowrap ${amtCl}`}>
                      {isDistrib ? '+' : '−'}{item.amount.toLocaleString(loc)} {sar}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={10} />{isArabic ? 'مكتمل' : 'Completed'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}