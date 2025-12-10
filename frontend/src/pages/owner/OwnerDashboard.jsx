import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Building2, DollarSign, Users, TrendingUp, 
  Clock, CheckCircle, AlertCircle, Plus, Loader2, Eye, Edit2 
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authHeader, fetchJson, getToken } from '../../lib/api'

export default function OwnerDashboard() {
  const { t } = useTranslation('pages')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [properties, setProperties] = useState([])
  const [stats, setStats] = useState({
    totalProperties: 0,
    approvedProperties: 0,
    pendingProperties: 0,
    rejectedProperties: 0,
    totalRevenue: 0,
    monthlyYield: 0
  })

  useEffect(() => {
    loadOwnerData()
  }, [])

  async function loadOwnerData() {
    try {
      setLoading(true)
      setError('')
      
      if (!getToken()) {
        setError(t('owner.dashboard.loginRequired'))
        setLoading(false)
        return
      }

      // Fetch all properties and filter by owner ID
      const propertiesData = await fetchJson('/api/properties', { 
        headers: { ...authHeader() } 
      })
      
      const allProperties = Array.isArray(propertiesData) ? propertiesData : []
      
      // Get current user's ID from localStorage
      const currentUserId = localStorage.getItem('userId')
      
      // Filter to show only properties owned by this user (exclude drafts)
      const ownerProperties = allProperties.filter(p => p.ownerId === currentUserId && !p.isDraft)
      
      console.log(`🏠 Owner Dashboard: Showing ${ownerProperties.length} properties out of ${allProperties.length} total (Owner ID: ${currentUserId})`)
      
      setProperties(ownerProperties)

      // Calculate stats from owner's properties only
 const approved = ownerProperties.filter(p => p.status === 'APPROVED')
 const pending = ownerProperties.filter(p => p.status === 'PENDING')
 const rejected = ownerProperties.filter(p => p.status === 'REJECTED')
      
      const totalRevenue = approved.reduce((sum, p) => {
        const raised = (p.totalTokens - (p.remainingTokens || p.tokensAvailable || 0)) * (p.tokenPrice || 0)
        return sum + raised
      }, 0)
      
      const avgYield = approved.length > 0 
        ? approved.reduce((sum, p) => sum + (p.monthlyYield || 0), 0) / approved.length 
        : 0

      setStats({
        totalProperties: ownerProperties.length,
        approvedProperties: approved.length,
        pendingProperties: pending.length,
        rejectedProperties: rejected.length,
        totalRevenue,
        monthlyYield: avgYield
      })
    } catch (err) {
      console.error('Owner dashboard load error:', err)
      setError(err.message || t('owner.dashboard.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      Pending: 'bg-yellow-100 text-yellow-700',
      Approved: 'bg-green-100 text-green-700',
      Rejected: 'bg-red-100 text-red-700'
    }
    return styles[status] || 'bg-gray-100 text-gray-700'
  }

  if (!getToken()) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Building2 className="mx-auto text-gray-400" size={64} />
          <div className="text-gray-600">{t('owner.dashboard.loginRequired')}</div>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors"
          >
            {t('owner.dashboard.loginCta')}
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-amber-600 mx-auto" size={40} />
          <div className="text-gray-600">{t('owner.dashboard.loading')}</div>
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

  const statCards = [
    {
      title: t('owner.dashboard.stats.totalProperties.title'),
      value: stats.totalProperties,
      icon: Building2,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      change: t('owner.dashboard.stats.totalProperties.caption')
    },
    {
      title: t('owner.dashboard.stats.approvedProperties.title'),
      value: stats.approvedProperties,
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      change: t('owner.dashboard.stats.approvedProperties.caption')
    },
    {
      title: t('owner.dashboard.stats.pendingProperties.title'),
      value: stats.pendingProperties,
      icon: Clock,
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      change: t('owner.dashboard.stats.pendingProperties.caption')
    },
    {
      title: t('owner.dashboard.stats.totalRevenue.title'),
      value: `${(stats.totalRevenue / 1000).toFixed(0)}K ${tCommon('currency.sar')}`,
      icon: DollarSign,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      change: t('owner.dashboard.stats.totalRevenue.caption')
    },
    {
      title: t('owner.dashboard.stats.monthlyYield.title'),
      value: `${stats.monthlyYield.toFixed(1)}%`,
      icon: TrendingUp,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      change: t('owner.dashboard.stats.monthlyYield.caption')
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('owner.dashboard.title')}</h1>
            <p className="text-amber-100 text-lg">
              {t('owner.dashboard.subtitle')}
            </p>
          </div>
          <button
            onClick={() => navigate('/owner/properties/new')}
            className="flex items-center gap-2 px-6 py-3 bg-white text-amber-600 rounded-xl font-semibold hover:bg-amber-50 transition-all hover:scale-105 shadow-lg"
          >
            <Plus size={20} />
            {t('owner.dashboard.ctaNewProperty')}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</h3>
                  <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`${stat.bgColor} p-4 rounded-xl`}>
                  <Icon className={stat.iconColor} size={28} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Properties Overview */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{t('owner.dashboard.propertiesSection.title')}</h2>
          <button
            onClick={() => navigate('/owner/properties')}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            {t('owner.dashboard.propertiesSection.viewAll')} →
          </button>
        </div>
        
        {properties.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Building2 className="mx-auto text-gray-400 mb-3" size={48} />
            <div className="text-gray-600 mb-4">{t('owner.dashboard.propertiesSection.emptyTitle')}</div>
            <button
              onClick={() => navigate('/owner/properties/new')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <Plus size={20} />
              {t('owner.dashboard.propertiesSection.emptyCta')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => {
              const status = property.status || 'PENDING'
              const totalTokens = property.totalTokens || 0
              const remainingTokens = property.remainingTokens ?? property.tokensAvailable ?? 0
              const soldTokens = totalTokens - remainingTokens
              const tokenPrice = property.tokenPrice || 0
              const raised = soldTokens * tokenPrice
              const targetAmount = totalTokens * tokenPrice
              const progress = targetAmount > 0 ? (raised / targetAmount) * 100 : 0
              
              return (
                <div
                  key={property.id}
                  className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="text-white" size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{property.name || property.title}</h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold mt-1 ${getStatusBadge(status)}`}>
                          {t(`owner.dashboard.propertyStatus.${status.toLowerCase()}`)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/properties/${property.id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg.white text-gray-700 text-sm font-medium transition-colors"
                      >
                        <Eye size={16} />
                        <span>{t('owner.dashboard.actions.view')}</span>
                      </button>
                    </div>
                  </div>

                  {status === 'APPROVED' && (
                    <>
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-600">{t('owner.dashboard.propertiesSection.progressLabel', { percent: progress.toFixed(1) })}</p>
                          <p className="text-sm font-semibold text-emerald-600">
                            {raised.toLocaleString()} {tCommon('currency.sar')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">{t('owner.dashboard.metrics.target')}</p>
                          <span className="text-sm font-medium text-gray-700">{t('owner.dashboard.metrics.fundingProgress')}</span>
                          <p className="text-sm font-semibold text-gray-900">
                            {targetAmount.toLocaleString()} {tCommon('currency.sar')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">{t('owner.dashboard.metrics.tokensSold')}</p>
                          <p className="text-sm font-semibold text-blue-600">
                            {soldTokens} / {totalTokens}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">{t('owner.dashboard.metrics.yield')}</p>
                          <p className="text-sm font-semibold text-purple-600">
                            {property.monthlyYield || 0}%
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-orange-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {progress.toFixed(1)}% funded
                      </p>
                    </>
                  )}

                  {status === 'PENDING' && (
                    <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg">
                      <Clock size={16} />
                      <span>{t('owner.dashboard.statusMessages.pending')}</span>
                    </div>
                  )}

                  {status === 'REJECTED' && (
                    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-lg">
                      <AlertCircle size={16} />
                      <span>{t('owner.dashboard.statusMessages.rejected')}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}