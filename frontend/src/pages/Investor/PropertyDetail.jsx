import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { getToken, authHeader, fetchJson } from '../../lib/api'
import { 
  Building2, TrendingUp, Coins, MapPin, Calendar, Users, 
  Shield, ArrowLeft, Calculator, CheckCircle2, AlertCircle, Eye, EyeOff 
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

const maskPropertyId = (id, showFull = false) => {
  if (!id || typeof id !== 'string') return id
  if (showFull) {
    console.log('🔍 Full UUID:', id)
    return id
  }
  if (id.length <= 16) return id

  const startLength = 8
  const endLength = 8
  const middleLength = id.length - startLength - endLength
  const masked =
    id.substring(0, startLength) +
    '*'.repeat(middleLength) +
    id.substring(id.length - endLength)

  console.log(' UUID comparison:')
  console.log(' Full:', id)
  console.log(' Masked:', masked)
  return masked
}

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [property, setProperty] = useState(null)
  const [propertyId, setPropertyId] = useState(null)
  const [tokens, setTokens] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showFullId, setShowFullId] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [purchaseDetails, setPurchaseDetails] = useState(null)
  const [minInvestment, setMinInvestment] = useState(100)
 const [maxInvestment, setMaxInvestment] = useState(1000000)
  const { t, i18n } = useTranslation('property')
  const isRtl = i18n.dir() === 'rtl'

  // Fallback: extract id from pathname if useParams fails
  const pathMatch = location.pathname.match(/\/properties\/(\d+)/)
  const fallbackId = pathMatch ? pathMatch[1] : null
  const finalId = id || fallbackId
  console.log('🔍 PropertyDetail debug:', { useParams: id, pathname: location.pathname, fallbackId, finalId })

  useEffect(() => {
    // Get user role from token
 const token = getToken()
 if (token) {
 try {
 const payload = JSON.parse(atob(token.split('.')[1]))
 setUserRole(payload.role)
 } catch (e) {
 console.error('Failed to parse token:', e)
 }
 }

    // Fetch specific property by ID from database
    if (finalId) {
      fetch(`${import.meta.env.VITE_API_BASE}/api/properties/${finalId}`)
        .then(r => r.json())
        .then(property => {
          console.log('🏠 Fetched property from database:', property)
          setProperty(property)
          setPropertyId(property?.id || null)
        })
        .catch((error) => {
          console.error('❌ Failed to fetch property:', error)
          setProperty(null)
          setPropertyId(null)
        })
    }
  }, [finalId])
// Fetch investment limits from settings
 useEffect(() => {
 const fetchSettings = async () => {
 try {
 const token = getToken()
 if (token) {
 const settings = await fetchJson('/api/settings', { headers: authHeader() })
 if (settings?.general) {
 setMinInvestment(settings.general.minInvestmentAmount || 100)
 setMaxInvestment(settings.general.maxInvestmentAmount || 1000000)
 console.log('💰 Investment limits loaded:', {
 min: settings.general.minInvestmentAmount,
 max: settings.general.maxInvestmentAmount
 })
 }
 }
 } catch (error) {
 console.error('Failed to fetch settings:', error)
 // Keep default values
 }
 }
 fetchSettings()
 }, [])
  if (!property) {
    return (
      <div className="flex items-center justify-center py-12">
       <div className="text-gray-600">{t('detail.loadingProperty')}</div>
      </div>
    )
  }

  const tokenPrice = Number(property.tokenPrice ?? 0)
  const monthlyYield = property.monthlyYield ?? 0
  const remainingTokens = property.remainingTokens ?? property.tokensAvailable ?? 0
  const totalTokens = property.totalTokens ?? remainingTokens
  const percentageSold = totalTokens > 0 ? ((totalTokens - remainingTokens) / totalTokens * 100).toFixed(0) : 0
  
  const investmentAmount = tokenPrice * tokens
  const estimatedMonthlyReturn = (investmentAmount * monthlyYield) / 100
  const estimatedYearlyReturn = estimatedMonthlyReturn * 12

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/opportunities')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={20} className={isRtl ? 'rotate-180' : ''} />
      <span>{t('detail.backToList')}</span>

        <span>{t('detail.propertyId')}: {maskPropertyId(property.id, showFullId)}</span>
      </button>

      {/* Property Header */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Hero Image */}
        <div className="h-64 md:h-96 relative">
          {property.imageUrl ? (
            <img 
              src={property.imageUrl} 
              alt={property.name || property.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
          ) : null}
          <div className={`absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 ${property.imageUrl ? 'hidden' : 'flex'} items-center justify-center`}>
            <Building2 className="text-white opacity-50" size={120} />
          </div>
        </div>

        {/* Property Info */}
        <div className="p-6 space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.name || property.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin size={18} />
<span>
  {property.location || [property.city, property.district, property.municipality]
    .filter(Boolean)
    .join(', ') || t('detail.locationNotSpecified')}
</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={16} />
                <span>{t('detail.propertyId')}: {maskPropertyId(property.id, showFullId)}</span>
                  {userRole === 'OWNER' && (
                  <button
                  onClick={() => setShowFullId(!showFullId)}
                  className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors"
                  title={showFullId ? 'Hide ID' : 'Show ID'}
                  >
                  {showFullId ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  )}
              </div>
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Coins size={16} />
                <span>{t('detail.tokenPrice')}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{tokenPrice.toLocaleString()} SAR</div>
            </div>

            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-emerald-600 text-sm mb-1">
                <TrendingUp size={16} />
                <span>{t('detail.monthlyYield')}</span>
              </div>
              <div className="text-2xl font-bold text-emerald-700">{monthlyYield}%</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
                <Users size={16} />
                <span>{t('detail.availableTokens')}</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{remainingTokens.toLocaleString()}</div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-600 text-sm mb-1">
                <Calendar size={16} />
                <span>{t('detail.soldLabel')}</span>

              </div>
              <div className="text-2xl font-bold text-purple-700">{percentageSold}%</div>
            </div>
          </div>
  </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">{t('detail.fundingProgress')}</span>
              <span className="font-medium text-gray-900">
                {t('detail.fundingComplete', { value: percentageSold })}
              </span>
            </div>  {/* ← this line was missing */}

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-emerald-600 h-3 rounded-full transition-all" 
                style={{ width: `${percentageSold}%` }}
              />
            </div>
          </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left column: property information */}
        <div className="md:col-span-2 space-y-6">
          {/* About Property - show real owner-submitted description when available */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t('detail.aboutTitle')}
            </h2>

            <p className="text-gray-600 leading-relaxed mb-4 whitespace-pre-line">
              {property.propertyDescription || property.description || t('detail.aboutFallback')}
            </p>

            {/* Quick facts from technical & financial data */}
            <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-700">
              {property.propertyTypeDetailed && (
                <div className="flex items-start gap-2">
                  <Building2 size={16} className="text-emerald-600 mt-0.5" />
                  <div>
                    <div className="font-medium">
                      {t('detail.typeLabel', { defaultValue: 'Property Type' })}
                    </div>
                    <div>{property.propertyTypeDetailed}</div>
                  </div>
                </div>
              )}
              {property.landArea && (
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-amber-600 mt-0.5" />
                  <div>
                    <div className="font-medium">
                      {t('detail.landAreaLabel', { defaultValue: 'Land Area' })}
                    </div>
                    <div>{property.landArea} m²</div>
                  </div>
                </div>
              )}
              {property.builtArea && (
                <div className="flex items-start gap-2">
                  <Building2 size={16} className="text-gray-500 mt-0.5" />
                  <div>
                    <div className="font-medium">
                      {t('detail.builtAreaLabel', { defaultValue: 'Built Area' })}
                    </div>
                    <div>{property.builtArea} m²</div>
                  </div>
                </div>
              )}
              {property.buildingAge != null && (
                <div className="flex items-start gap-2">
                  <Calendar size={16} className="text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium">
                      {t('detail.buildingAgeLabel', { defaultValue: 'Building Age' })}
                    </div>
                    <div>
                      {property.buildingAge}{' '}
                      {t('detail.yearsLabel', { defaultValue: 'years' })}
                    </div>
                  </div>
                </div>
              )}
              {property.marketValue && (
                <div className="flex items-start gap-2">
                  <Coins size={16} className="text-emerald-600 mt-0.5" />
                  <div>
                    <div className="font-medium">
                      {t('detail.marketValueLabel', { defaultValue: 'Market Value' })}
                    </div>
                    <div>{Number(property.marketValue).toLocaleString()} SAR</div>
                  </div>
                </div>
              )}
              {property.expectedROI && (
                <div className="flex items-start gap-2">
                  <TrendingUp size={16} className="text-purple-600 mt-0.5" />
                  <div>
                    <div className="font-medium">
                      {t('detail.expectedRoiLabel', { defaultValue: 'Expected ROI' })}
                    </div>
                    <div>{property.expectedROI}%</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Investment Benefits */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('detail.benefitsTitle')}</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <div className="font-medium text-gray-900">{t('detail.benefit1Title')}</div>
                  <div className="text-sm text-gray-600">{t('detail.benefit1Body', { value: monthlyYield })}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <div className="font-medium text-gray-900">{t('detail.benefit2Title')}</div>
                  <div className="text-sm text-gray-600">{t('detail.benefit2Body')}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <div className="font-medium text-gray-900">{t('detail.benefit3Title')}</div>
                  <div className="text-sm text-gray-600">{t('detail.benefit3Body')}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <div className="font-medium text-gray-900">{t('detail.benefit4Title')}</div>
                  <div className="text-sm text-gray-600">{t('detail.benefit4Body')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Investment Panel */}
        <div className="md:col-span-1">
          {userRole === 'INVESTOR' ? (
          <div className="bg-white border-2 border-emerald-200 rounded-xl p-6 sticky top-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 mb-2">
              <Calculator size={20} />
              <h3 className="font-semibold text-lg">
                {t('detail.calcTitle')}
              </h3>
            </div>

            {/* Token Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('detail.calcTokensLabel')}
              </label>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setTokens((prev) => Math.max(1, prev - 1))}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max={remainingTokens}
                  value={tokens}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 0
                    if (value < 1) {
                      setTokens(1)
                    } else if (value > remainingTokens) {
                      setTokens(remainingTokens)
                    } else {
                      setTokens(value)
                    }
                  }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center"
                />
                <button
                  type="button"
                  onClick={() => setTokens((prev) => Math.min(remainingTokens, prev + 1))}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {t('detail.availableTokensLabel', { defaultValue: 'Available tokens' })}: {remainingTokens.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                {t('detail.limitMinWarning', {
                  min: minInvestment.toLocaleString(),
                  current: investmentAmount.toFixed(2),
                })}
              </div>
              <div className="text-sm text-gray-600">
                {t('detail.limitMaxWarning', {
                  max: maxInvestment.toLocaleString(),
                  current: investmentAmount.toFixed(2),
                })}
              </div>
            </div>

            {/* Investment Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('detail.calcInvestmentAmount')}</span>
                <span className="font-semibold text-gray-900">{investmentAmount.toLocaleString()} SAR</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('detail.calcMonthlyReturn')}</span>
                <span className="font-semibold text-emerald-600">{estimatedMonthlyReturn.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('detail.calcYearlyReturn')}</span>
                <span className="font-semibold text-emerald-600">{estimatedYearlyReturn.toFixed(2)} SAR</span>
              </div>
            </div>
              {/* Investment Limit Warnings */}
              {investmentAmount < minInvestment && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-amber-700">
              {t('detail.calcMinimumInvestment', { min: minInvestment.toLocaleString(), current: investmentAmount.toFixed(2) })}
              </div>
              </div>
              )}
              {investmentAmount > maxInvestment && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-red-700">
              {t('detail.calcMaximumInvestment', { max: maxInvestment.toLocaleString(), current: investmentAmount.toFixed(2) })}
              </div>
              </div>
              )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2" role="alert">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* Invest Button */}
            <button
             disabled={loading || remainingTokens === 0 || investmentAmount < minInvestment || investmentAmount > maxInvestment}

              onClick={async () => {
                setError('')
                if (!getToken()) {
                  navigate('/login')
                  return
                }
                
             
                
                try {
                  setLoading(true)
                  console.log('�️ Buy request payload:', { propertyId: propertyId, tokens: Number(tokens) })
                  const order = await fetchJson('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeader() },
                    body: JSON.stringify({ propertyId: propertyId, tokens: Number(tokens) }),
                  })
                  await fetchJson('/api/payments/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeader() },
                    body: JSON.stringify({ orderId: order.id }),
                  })
                  
                  // Show success modal with purchase details
                  setPurchaseDetails({
                    propertyName: property?.name || 'Property',
                    tokens: Number(tokens),
                    totalAmount: investmentAmount,
                    orderId: order.id
                  })
                  setShowSuccessModal(true)
                } catch (e) {
                    console.error('❌ Investment error:', e)
                    console.log('🔍 Error details:', {
                    message: e?.message,
                    data: e?.data,
                    body: e?.body,
                    error: e?.data?.error || e?.body?.error
                    })
                    const msg = String(e?.message || '')
                    const errorData = e?.data || e?.body
                    // Check for minimum investment error
                    if (msg === 'minimum_investment_not_met' || errorData?.error === 'minimum_investment_not_met') {
                    const amount = investmentAmount.toFixed(2)
                    setError(t('detail.minInvestmentNotMet', { amount }))
                  } else if (msg === 'maximum_investment_exceeded' || errorData?.error === 'maximum_investment_exceeded') {
                    const amount = investmentAmount.toFixed(2)
                    setError(t('detail.maxInvestmentExceeded', { amount }))
                  } else if (msg === 'insufficient_balance') {
                    setError(t('detail.insufficientBalance', { amount: investmentAmount.toLocaleString() }))
                  } else if (msg === 'insufficient_tokens') {
                    setError(t('detail.insufficientTokens'))
                  } else if (msg === 'property_not_found') {
                    setError(t('detail.propertyNotFound'))
                  } else {
                    setError(t('detail.investFailedDescription'))
                  }
                } finally {
                  setLoading(false)
                }
              }}
 className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-3 font-semibold transition-colors"
 >
{loading
  ? t('detail.processing')
  : remainingTokens === 0
  ? t('detail.soldOut')
  : t('detail.buyCta')}
            </button>

            {/* Security Badge */}
            <div className="flex items-center gap-2 text-sm text-gray-500 pt-2">
              <Shield size={16} />
             <span>{t('detail.secBadge')}</span>

            </div>
          </div>
              ) : (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 sticky top-6">
            <div className="flex items-center gap-2 text-blue-700 mb-3">
              <AlertCircle size={20} />
              <h3 className="font-semibold text-lg">
                {t('detail.restrictedTitle')}
              </h3>
            </div>

            <p className="text-sm text-blue-800 mb-4">
              {userRole === 'ADMIN'
                ? t('detail.restrictedAdmin')
                : userRole === 'OWNER'
                ? t('detail.restrictedOwner')
                : t('detail.restrictedOther')}
            </p>

            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Shield size={16} />
              <span>
                {t('detail.roleLabel')}: {userRole || t('detail.roleNotLoggedIn')}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-blue-600 pt-2">
              <Shield size={16} />
              <span>{t('detail.secBadge')}</span>
            </div>
          </div> 
        )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && purchaseDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 animate-scale-in">
            <div className="text-center">
              {/* Success Icon */}
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-green-600" size={48} />
              </div>
              
              {/* Success Message */}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('detail.successTitle')} 🎉
              </h2>
              <p className="text-gray-600 mb-6">
                {t('detail.successBody')}
              </p>
              
              {/* Purchase Details */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('detail.successProperty')}:</span>
                    <span className="font-semibold text-gray-900">{purchaseDetails.propertyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('detail.successTokens')}:</span>
                    <span className="font-semibold text-emerald-600">{purchaseDetails.tokens}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('detail.successTotalAmount')}:</span>
                    <span className="font-semibold text-gray-900">
                      {purchaseDetails.totalAmount.toLocaleString()} SAR
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('detail.successOrderId')}:</span>
                    <span className="font-mono text-gray-500">
                      {purchaseDetails.orderId.substring(0, 8)}...{purchaseDetails.orderId.slice(-4)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Blockchain Badge */}
              <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 mb-6">
                <Shield size={16} />
                <span>{t('detail.secBadge')}</span>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false)
                    navigate('/investor/wallet')
                  }}
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
                >
                  {t('detail.successViewPortfolio')}
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false)
                    navigate('/investor/opportunities')
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                >
                  {t('detail.successBrowseMore')}
                </button>
              </div>
              
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
