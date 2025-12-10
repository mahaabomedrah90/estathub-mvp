import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authHeader, fetchJson, getToken } from '../../lib/api'
import { 
  Building2, TrendingUp, DollarSign, Wallet, Loader2, AlertCircle,
  PieChart, Calendar, ArrowUpRight, ArrowDownRight, Target, Award,
  Eye, History
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
            className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
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
          <Loader2 className="animate-spin text-emerald-600 mx-auto" size={40} />
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
 const safeWallet = wallet || { cashBalance: 0, investedValue: 0, holdings: [], transactions: [] }
 const totalBalance = (safeWallet.cashBalance ?? 0) + (safeWallet.investedValue ?? 0)
 const holdings = safeWallet.holdings || []
const recentHoldings = holdings.slice(0, 5)
const transactions = safeWallet.transactions || []
  
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
  <h1 className="text-3xl font-bold text-gray-900">
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
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded">
              <TrendingUp size={14} />
               <span>{isArabic ? 'الإجمالي' : 'Total'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{totalBalance.toLocaleString()} {tCommon('currency.sar')}</div>
          <div className="text-emerald-100 text-sm">
            {isArabic ? 'قيمة المحفظة' : 'Portfolio Value'}
          </div>
        </div>

        {/* Invested Amount */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-blue-600" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-blue-600">
              <Target size={14} />
              <span>{isArabic ? 'المستثمر' : 'Invested'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {totalInvested.toLocaleString()} {tCommon('currency.sar')}
          </div>
          <div className="text-sm text-gray-600">
            {isArabic ? 'إجمالي المبلغ المستثمر' : 'Total Invested'}
          </div>
        </div>

        {/* Monthly Returns */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-purple-600" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-purple-600">
              <Calendar size={14} />
              <span>{isArabic ? 'شهرياً' : 'Monthly'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {totalReturns.toFixed(2)} {tCommon('currency.sar')}
          </div>
          <div className="text-sm text-gray-600">
            {isArabic ? 'العوائد المتوقعة' : 'Expected Returns'}
          </div>
        </div>

        {/* Number of Properties */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Building2 className="text-orange-600" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-orange-600">
              <Award size={14} />
              <span>{isArabic ? 'نشط' : 'Active'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{numberOfProperties}</div>
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
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
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
                <div className="text-xl font-bold text-emerald-600">
                 {totalInvested.toLocaleString()} {tCommon('currency.sar')}
                </div>
                <div className="text-xs text-gray-500">
                  {totalBalance > 0 ? ((totalInvested / totalBalance) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
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
                <div className="text-xl font-bold text-blue-600">
                  {(wallet?.cashBalance ?? 0).toLocaleString()} {tCommon('currency.sar')}
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
                  className="bg-emerald-600 h-3 rounded-full transition-all" 
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
            <div className="border-l-4 border-emerald-500 pl-4 py-2">
              <div className="text-sm text-gray-600 mb-1">
                {isArabic ? 'معدل العائد الشهري' : 'Monthly return rate'}
              </div>
              <div className="text-2xl font-bold text-gray-900">{portfolioGrowth}%</div>
              <div className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                <ArrowUpRight size={14} />
                <span>
                  {isArabic ? 'نمو شهري متوقّع' : 'Expected monthly growth'}
                </span>
              </div>
            </div>

            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <div className="text-sm text-gray-600 mb-1">
                {isArabic ? 'تقدير سنوي' : 'Annual projection'}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {(totalReturns * 12).toFixed(2)} {tCommon('currency.sar')}
              </div>
              <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                <Calendar size={14} />
                <span>
                  {isArabic ? 'عوائد سنوية متوقعة' : 'Projected yearly returns'}
                </span>
              </div>
            </div>

            <div className="border-l-4 border-purple-500 pl-4 py-2">
              <div className="text-sm text-gray-600 mb-1">
                {isArabic ? 'إمكانات العائد على الاستثمار' : 'ROI potential'}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {totalInvested > 0 ? ((totalReturns * 12 / totalInvested) * 100).toFixed(2) : 0}%
              </div>
              <div className="text-xs text-purple-600 flex items-center gap-1 mt-1">
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
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
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
                <div key={holding.propertyId} className="border border-gray-200 rounded-lg p-5 hover:border-emerald-300 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="text-white" size={28} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                          {property.name || property.title}
                        </h3>
                        <div className="text-sm text-gray-600 mb-2">{property.location || 'Riyadh, Saudi Arabia'}</div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-emerald-600">
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
                        {isArabic ? 'عدد التوكنات' : 'Tokens owned'}
                      </div>
                      <div className="text-lg font-semibold text-gray-900"> {tokens}</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs text-blue-600 mb-1">
                        {isArabic ? 'الاستثمار' : 'Investment'}
                      </div>
                      <div className="text-lg font-semibold text-blue-700">
                       {investmentValue.toLocaleString()} {tCommon('currency.sar')}
                      </div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <div className="text-xs text-emerald-600 mb-1">
                        {isArabic ? 'العائد الشهري' : 'Monthly return'}
                      </div>
                      <div className="text-lg font-semibold text-emerald-700">
                        {monthlyReturn.toFixed(2)} {tCommon('currency.sar')}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-xs text-purple-600 mb-1">
                        {isArabic ? 'العائد السنوي' : 'Annual return'}
                      </div>
                      <div className="text-lg font-semibold text-purple-700">
                        {(monthlyReturn * 12).toFixed(2)} {tCommon('currency.sar')}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {isArabic ? 'آخر المعاملات' : 'Recent transactions'}
          </h2>
          <button
            onClick={() => navigate('/wallet')}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {isArabic ? 'عرض الكل' : 'View all'} →
          </button>
        </div>
        
       {recentTransactions.length === 0 ? (
  <div className="text-center py-8 text-gray-500">
    <History className="mx-auto mb-2 text-gray-300" size={40} />
    <div>
      {isArabic ? 'لا توجد معاملات حتى الآن.' : 'No transactions yet.'}
    </div>
  </div>
) : (
  <>
    <div className="space-y-3">
      {recentTransactions.map((tx, idx) => {
        const typeUpper = (tx.type || '').toUpperCase()
        const isDeposit = typeUpper === 'DEPOSIT'
        const isWithdraw = typeUpper === 'WITHDRAW' || typeUpper === 'WITHDRAWAL'
        const isPurchase = typeUpper === 'PURCHASE'

        const rawType = (tx.type || '').toLowerCase()
        const normalizedKey =
          rawType === 'withdrawal' ? 'withdraw' :
          rawType === 'withdraw' ? 'withdraw' :
          rawType === 'deposit' ? 'deposit' :
          rawType === 'purchase' ? 'purchase' : rawType

        return (
          <div
            key={idx}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isDeposit ? 'bg-emerald-100'
                  : isWithdraw ? 'bg-red-100'
                  : 'bg-blue-100'
                }`}
              >
                {isDeposit ? (
                  <ArrowDownRight className="text-emerald-600" size={20} />
                ) : isWithdraw ? (
                  <ArrowUpRight className="text-red-600" size={20} />
                ) : (
                  <Building2 className="text-blue-600" size={20} />
                )}
              </div>
              <div>
                <div className="font-semibold text-gray-900 capitalize">
                  {t(`investor.wallet.transactionType.${normalizedKey}`)}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(tx.createdAt || tx.timestamp).toLocaleString('en-SA')}
                </div>
              </div>
            </div>

            <div
              className={`text-right ${
                isDeposit ? 'text-emerald-600'
                : isWithdraw ? 'text-red-600'
                : 'text-blue-600'
              }`}
            >
              <div className="font-semibold">
                {isWithdraw ? '-' : '+'}
                {tx.amount.toLocaleString()} {tCommon('currency.sar')}
              </div>
              <div className="text-xs text-gray-500">{tx.status}</div>
            </div>
          </div>
        )
      })}
    </div>

    {/* Load more transactions */}
    <div className="mt-4 text-center">
           <button
        onClick={() => navigate('/wallet')}
        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
      >
        {isArabic ? 'عرض الكل' : 'View all'} →
      </button>
    </div>
  </>
)}
      </div>   
    </div>    
  )
}