import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getToken, authHeader, fetchJson } from '../lib/api'
import { 
  Building2, TrendingUp, Coins, MapPin, Calendar, Users, 
  Shield, ArrowLeft, Calculator, CheckCircle2, AlertCircle 
} from 'lucide-react'

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [tokens, setTokens] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/properties`)
      .then(r => r.json())
      .then(list => setProperty(list.find(p => String(p.id) === String(id)) || null))
      .catch(() => setProperty(null))
  }, [id])

  if (!property) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading property...</div>
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
        <ArrowLeft size={20} />
        <span>Back to Opportunities</span>
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
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin size={18} />
              <span>Riyadh, Saudi Arabia</span>
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Coins size={16} />
                <span>Token Price</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{tokenPrice.toLocaleString()} SAR</div>
            </div>

            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-emerald-600 text-sm mb-1">
                <TrendingUp size={16} />
                <span>Monthly Yield</span>
              </div>
              <div className="text-2xl font-bold text-emerald-700">{monthlyYield}%</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
                <Users size={16} />
                <span>Available Tokens</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{remainingTokens.toLocaleString()}</div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-600 text-sm mb-1">
                <Calendar size={16} />
                <span>Sold</span>
              </div>
              <div className="text-2xl font-bold text-purple-700">{percentageSold}%</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Funding Progress</span>
              <span className="font-medium text-gray-900">{percentageSold}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-emerald-600 h-3 rounded-full transition-all" 
                style={{ width: `${percentageSold}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Investment Calculator */}
        <div className="md:col-span-2 space-y-6">
          {/* About Property */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Property</h2>
            <p className="text-gray-600 leading-relaxed">
              This premium real estate property has been tokenized on the blockchain, allowing fractional ownership 
              and investment opportunities. Each token represents a share of the property, entitling holders to 
              proportional rental income distributions on a monthly basis.
            </p>
          </div>

          {/* Investment Benefits */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Investment Benefits</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <div className="font-medium text-gray-900">Monthly Passive Income</div>
                  <div className="text-sm text-gray-600">Receive {monthlyYield}% monthly returns from rental income</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <div className="font-medium text-gray-900">Blockchain Security</div>
                  <div className="text-sm text-gray-600">All ownership records secured on Hyperledger Fabric</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <div className="font-medium text-gray-900">Fractional Ownership</div>
                  <div className="text-sm text-gray-600">Start investing with as little as one token</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <div className="font-medium text-gray-900">Transparent Transactions</div>
                  <div className="text-sm text-gray-600">View all transactions on the blockchain explorer</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Investment Panel */}
        <div className="md:col-span-1">
          <div className="bg-white border-2 border-emerald-200 rounded-xl p-6 sticky top-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 mb-2">
              <Calculator size={20} />
              <h3 className="font-semibold text-lg">Investment Calculator</h3>
            </div>

            {/* Token Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Tokens</label>
              <input
                type="number"
                min={1}
                max={remainingTokens}
                value={tokens}
                onChange={e => setTokens(Math.max(1, Math.min(remainingTokens, Number(e.target.value))))}
                className="border border-gray-300 rounded-lg w-full px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Investment Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Investment Amount</span>
                <span className="font-semibold text-gray-900">{investmentAmount.toLocaleString()} SAR</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Est. Monthly Return</span>
                <span className="font-semibold text-emerald-600">{estimatedMonthlyReturn.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Est. Yearly Return</span>
                <span className="font-semibold text-emerald-600">{estimatedYearlyReturn.toFixed(2)} SAR</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2" role="alert">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* Invest Button */}
            <button
              disabled={loading || remainingTokens === 0}
              onClick={async () => {
                setError('')
                if (!getToken()) {
                  navigate('/login')
                  return
                }
                try {
                  setLoading(true)
                  const order = await fetchJson('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeader() },
                    body: JSON.stringify({ propertyId: Number(id), tokens: Number(tokens) }),
                  })
                  await fetchJson('/api/payments/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeader() },
                    body: JSON.stringify({ orderId: order.id }),
                  })
                  navigate('/wallet')
                } catch (e) {
                  console.error('❌ Investment error:', e)
                  const msg = String(e?.message || '')
                  const errorData = e?.data || e?.body
                  
                  // Check for minimum investment error
                  if (msg === 'minimum_investment_not_met' || errorData?.error === 'minimum_investment_not_met') {
                    const backendMessage = errorData?.message || `Minimum investment is 100 SAR. Your investment amount is ${investmentAmount.toFixed(2)} SAR.`
                    setError(backendMessage)
                  } else if (msg === 'maximum_investment_exceeded' || errorData?.error === 'maximum_investment_exceeded') {
                    const backendMessage = errorData?.message || `Maximum investment exceeded. Your investment amount is ${investmentAmount.toFixed(2)} SAR.`
                    setError(backendMessage)
                  } else if (msg === 'insufficient_balance') {
                    setError(`Insufficient wallet balance. You need SAR ${investmentAmount.toLocaleString()} to complete this purchase. Please deposit and try again.`)
                  } else if (msg === 'insufficient_tokens') {
                    setError('Not enough tokens available for this property. Try a smaller amount.')
                  } else if (msg === 'property_not_found') {
                    setError('Property not found. Please go back to Opportunities and try again.')
                  } else {
                    setError('Investment failed. Please try again in a moment.')
                  }
                } finally {
                  setLoading(false)
                }
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-3 font-semibold transition-colors"
            >
              {loading ? 'Processing...' : remainingTokens === 0 ? 'Sold Out' : 'Invest Now'}
            </button>

            {/* Security Badge */}
            <div className="flex items-center gap-2 text-sm text-gray-500 pt-2">
              <Shield size={16} />
              <span>Secured by Hyperledger Fabric</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
