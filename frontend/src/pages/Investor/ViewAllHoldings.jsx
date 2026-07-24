import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authHeader, fetchJson, getToken } from '../../lib/api'
import {
  Building2, DollarSign, TrendingUp, Loader2, AlertCircle,
  ArrowLeft, Calendar, Target, Award
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import SarIcon from '../../components/ui/SarIcon'

export default function ViewAllHoldings() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wallet, setWallet] = useState(null)
  const [properties, setProperties] = useState([])
  const { t, i18n } = useTranslation('pages')
  const { t: tCommon } = useTranslation('common')
  const isAr = i18n.language === 'ar'

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      if (!getToken()) {
        setError(isAr ? 'يرجى تسجيل الدخول' : 'Please login')
        setLoading(false)
        return
      }

      const [walletData, propsData] = await Promise.all([
        fetchJson('/api/wallet', { headers: { ...authHeader() } }),
        fetchJson('/api/properties'),
      ])

      setWallet(walletData)
      setProperties(Array.isArray(propsData) ? propsData : [])
    } catch (err) {
      console.error('Error loading holdings:', err)
      setError(err.message || (isAr ? 'خطأ في تحميل البيانات' : 'Failed to load data'))
    } finally {
      setLoading(false)
    }
  }

  if (!getToken()) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <AlertCircle className="mx-auto text-gray-400" size={48} />
          <div className="text-gray-600">
            {isAr ? 'يرجى تسجيل الدخول' : 'Please login'}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-brand-accent mx-auto" size={40} />
          <div className="text-gray-600">{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
        </div>
      </div>
    )
  }

  const safeWallet = wallet || { cashBalance: 0, investedValue: 0, holdings: [], transactions: [] }
  const holdings = safeWallet.holdings || []
  const totalInvested = safeWallet.investedValue ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/investor/wallet')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-[#1E1958]">
            {isAr ? 'كل استثماراتي' : 'All My Investments'}
          </h1>
          <p className="text-gray-600">
            {isAr ? `${holdings.length} استثمار نشط` : `${holdings.length} active investments`}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {holdings.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Building2 className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-600">
            {isAr ? 'لا توجد استثمارات حالياً' : 'No investments yet'}
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-[#1E1958] to-[#2a2458] rounded-lg p-6 text-white">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={20} />
                <span className="text-sm opacity-80">{isAr ? 'إجمالي المستثمر' : 'Total Invested'}</span>
              </div>
              <div className="text-2xl font-bold flex items-center gap-1">
                {totalInvested.toLocaleString()} <SarIcon size={18} />
              </div>
            </div>

            <div className="bg-[#41EAD4]/10 border border-[#41EAD4]/30 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-[#41EAD4]" size={20} />
                <span className="text-sm text-[#41EAD4]">{isAr ? 'العدد' : 'Count'}</span>
              </div>
              <div className="text-2xl font-bold text-[#41EAD4]">{holdings.length}</div>
            </div>

            <div className="bg-[#986F9A]/10 border border-[#986F9A]/30 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <Award className="text-[#986F9A]" size={20} />
                <span className="text-sm text-[#986F9A]">{isAr ? 'المحفظة' : 'Portfolio'}</span>
              </div>
              <div className="text-2xl font-bold text-[#986F9A]">
                {((holdings.length / Math.max(1, holdings.length + 5)) * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Holdings List */}
          <div className="space-y-4">
            {holdings.map((holding) => {
              const property = properties.find((p) => p.id === holding.propertyId)
              if (!property) return null

              const tokenPrice = holding.tokenPrice ?? 0
              const value = holding.tokens * tokenPrice
              const monthlyYield = property.monthlyYield ?? 0
              const monthlyIncome = value * (monthlyYield / 100)

              return (
                <div
                  key={holding.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                  dir={isAr ? 'rtl' : 'ltr'}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[#1E1958]">{property.title}</h3>
                      <p className="text-gray-600 text-sm">{property.location}</p>
                    </div>
                    {property.imageUrl && (
                      <img
                        src={property.imageUrl}
                        alt={property.title}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm mb-1">
                        {isAr ? 'الرموز المملوكة' : 'Tokens Owned'}
                      </p>
                      <p className="font-bold text-lg text-[#1E1958]">{holding.tokens.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm mb-1">
                        {isAr ? 'سعر الرمز' : 'Token Price'}
                      </p>
                      <p className="font-bold text-lg text-[#1E1958] flex items-center gap-1">
                        {tokenPrice.toLocaleString()} <SarIcon size={16} />
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm mb-1">
                        {isAr ? 'القيمة الإجمالية' : 'Total Value'}
                      </p>
                      <p className="font-bold text-lg text-[#41EAD4] flex items-center gap-1">
                        {value.toLocaleString()} <SarIcon size={16} />
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm mb-1">
                        {isAr ? 'العائد الشهري' : 'Monthly Return'}
                      </p>
                      <p className="font-bold text-lg text-[#41EAD4] flex items-center gap-1">
                        {monthlyIncome.toFixed(2)} <SarIcon size={16} />
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        {isAr ? 'العائد المتوقع السنوي' : 'Annual Expected Return'}
                      </span>
                      <span className="font-semibold text-[#41EAD4]">
                        {property.expectedROI}% {isAr ? 'سنوياً' : '/year'}
                      </span>
                    </div>
                  </div>

                  {holding.deedNumber && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                      📜 {isAr ? 'الوثيقة الرقمية' : 'Digital Deed'}: {holding.deedNumber}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
