import React, { useEffect, useState } from 'react'
import { authHeader, fetchJson, getToken } from '../lib/api'
import { 
  Building2, TrendingUp, DollarSign, Users, Loader2, AlertCircle,
  PieChart, BarChart3, Activity, MapPin, Calendar, ArrowUpRight, ArrowDownRight
} from 'lucide-react'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [properties, setProperties] = useState([])
  const [wallet, setWallet] = useState(null)
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalInvestment: 0,
    totalRevenue: 0,
    averageYield: 0,
    totalTokensSold: 0,
    totalTokensAvailable: 0
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)
      setError('')
      
      // Load properties
      const propertiesData = await fetch(import.meta.env.VITE_API_BASE + '/api/properties').then(r => r.json())
      setProperties(Array.isArray(propertiesData) ? propertiesData : [])
      
      // Load wallet if logged in
      if (getToken()) {
        try {
          const walletData = await fetchJson('/api/wallet', { headers: { ...authHeader() } })
          setWallet(walletData)
        } catch (e) {
          // Wallet load failed, continue without it
        }
      }
      
      // Calculate stats
      if (Array.isArray(propertiesData) && propertiesData.length > 0) {
        const totalProps = propertiesData.length
        const totalInv = propertiesData.reduce((sum, p) => {
          const tokenPrice = Number(p.tokenPrice ?? 0)
          const totalTokens = Number(p.totalTokens ?? p.tokensAvailable ?? 0)
          return sum + (tokenPrice * totalTokens)
        }, 0)
        
        const totalSold = propertiesData.reduce((sum, p) => {
          const totalTokens = Number(p.totalTokens ?? p.tokensAvailable ?? 0)
          const remaining = Number(p.remainingTokens ?? p.tokensAvailable ?? 0)
          return sum + (totalTokens - remaining)
        }, 0)
        
        const totalAvailable = propertiesData.reduce((sum, p) => {
          return sum + Number(p.totalTokens ?? p.tokensAvailable ?? 0)
        }, 0)
        
        const avgYield = propertiesData.reduce((sum, p) => sum + Number(p.monthlyYield ?? 0), 0) / totalProps
        
        const revenue = propertiesData.reduce((sum, p) => {
          const tokenPrice = Number(p.tokenPrice ?? 0)
          const totalTokens = Number(p.totalTokens ?? p.tokensAvailable ?? 0)
          const remaining = Number(p.remainingTokens ?? p.tokensAvailable ?? 0)
          const sold = totalTokens - remaining
          return sum + (tokenPrice * sold)
        }, 0)
        
        setStats({
          totalProperties: totalProps,
          totalInvestment: totalInv,
          totalRevenue: revenue,
          averageYield: avgYield,
          totalTokensSold: totalSold,
          totalTokensAvailable: totalAvailable
        })
      }
    } catch (err) {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (!getToken()) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Activity className="mx-auto text-gray-400" size={64} />
          <div className="text-gray-600">Please login to view the dashboard.</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-emerald-600 mx-auto" size={40} />
          <div className="text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
        <AlertCircle className="text-red-600" size={20} />
        <span className="text-red-700">{error}</span>
      </div>
    )
  }

  const soldPercentage = stats.totalTokensAvailable > 0 
    ? ((stats.totalTokensSold / stats.totalTokensAvailable) * 100).toFixed(1)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600">Overview of your real estate investment portfolio</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Properties */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="text-blue-600" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <ArrowUpRight size={16} />
              <span>Active</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalProperties}</div>
          <div className="text-sm text-gray-600">Total Properties</div>
        </div>

        {/* Total Investment Value */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-emerald-600" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-emerald-600">
              <TrendingUp size={16} />
              <span>{soldPercentage}%</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats.totalInvestment.toLocaleString()} SAR
          </div>
          <div className="text-sm text-gray-600">Total Investment Value</div>
        </div>

        {/* Revenue Generated */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-purple-600" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-purple-600">
              <Activity size={16} />
              <span>Revenue</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats.totalRevenue.toLocaleString()} SAR
          </div>
          <div className="text-sm text-gray-600">Revenue Generated</div>
        </div>

        {/* Average Yield */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <PieChart className="text-orange-600" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-orange-600">
              <BarChart3 size={16} />
              <span>Monthly</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{stats.averageYield.toFixed(2)}%</div>
          <div className="text-sm text-gray-600">Average Yield</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Token Sales Overview */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Token Sales Overview</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Tokens Sold</span>
                <span className="font-semibold text-gray-900">
                  {stats.totalTokensSold.toLocaleString()} / {stats.totalTokensAvailable.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-emerald-600 h-4 rounded-full transition-all flex items-center justify-end pr-2" 
                  style={{ width: `${soldPercentage}%` }}
                >
                  <span className="text-xs text-white font-semibold">{soldPercentage}%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="text-emerald-600 text-sm mb-1">Sold</div>
                <div className="text-2xl font-bold text-emerald-700">
                  {stats.totalTokensSold.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-gray-600 text-sm mb-1">Available</div>
                <div className="text-2xl font-bold text-gray-700">
                  {(stats.totalTokensAvailable - stats.totalTokensSold).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Summary */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Wallet Summary</h2>
          {wallet ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4">
                <div className="text-emerald-700 text-sm mb-1">Total Balance</div>
                <div className="text-3xl font-bold text-emerald-900">
                  {((wallet.cashBalance ?? 0) + (wallet.investedValue ?? 0)).toLocaleString()} SAR
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-blue-600 text-sm mb-1">Cash Balance</div>
                  <div className="text-xl font-bold text-blue-700">
                    {(wallet.cashBalance ?? 0).toLocaleString()} SAR
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-purple-600 text-sm mb-1">Invested</div>
                  <div className="text-xl font-bold text-purple-700">
                    {(wallet.investedValue ?? 0).toLocaleString()} SAR
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-gray-600 text-sm mb-1">Holdings</div>
                <div className="text-xl font-bold text-gray-900">
                  {wallet.holdings?.length ?? 0} Properties
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="mx-auto mb-2 text-gray-300" size={48} />
              <div>No wallet data available</div>
            </div>
          )}
        </div>
      </div>

      {/* Properties Performance */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Properties Performance</h2>
        
        {properties.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Building2 className="mx-auto mb-2 text-gray-300" size={48} />
            <div>No properties to display</div>
          </div>
        ) : (
          <div className="space-y-3">
            {properties.map(property => {
              const tokenPrice = Number(property.tokenPrice ?? 0)
              const monthlyYield = property.monthlyYield ?? 0
              const remainingTokens = property.remainingTokens ?? property.tokensAvailable ?? 0
              const totalTokens = property.totalTokens ?? remainingTokens
              const soldTokens = totalTokens - remainingTokens
              const percentageSold = totalTokens > 0 ? ((soldTokens / totalTokens) * 100).toFixed(0) : 0
              const revenue = tokenPrice * soldTokens

              return (
                <div key={property.id} className="border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="text-white" size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{property.name || property.title}</h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin size={12} />
                          <span>{property.location || 'Riyadh, Saudi Arabia'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-emerald-600">{monthlyYield}% Yield</div>
                      <div className="text-xs text-gray-500">{revenue.toLocaleString()} SAR Revenue</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-xs text-gray-500">Price</div>
                      <div className="text-sm font-semibold text-gray-900">{tokenPrice.toLocaleString()} SAR</div>
                    </div>
                    <div className="bg-blue-50 rounded p-2">
                      <div className="text-xs text-blue-600">Total</div>
                      <div className="text-sm font-semibold text-blue-700">{totalTokens.toLocaleString()}</div>
                    </div>
                    <div className="bg-emerald-50 rounded p-2">
                      <div className="text-xs text-emerald-600">Sold</div>
                      <div className="text-sm font-semibold text-emerald-700">{soldTokens.toLocaleString()}</div>
                    </div>
                    <div className="bg-purple-50 rounded p-2">
                      <div className="text-xs text-purple-600">Progress</div>
                      <div className="text-sm font-semibold text-purple-700">{percentageSold}%</div>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-emerald-600 h-2 rounded-full transition-all" 
                      style={{ width: `${percentageSold}%` }}
                    />
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