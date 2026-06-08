import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Building2, Users, CheckCircle, Clock, TrendingUp,
  AlertCircle, Loader2, Eye, X, Shield
} from 'lucide-react'
import { authHeader, fetchJson, getToken } from '../../lib/api'
import { useTranslation } from 'react-i18next'

export default function AdminOverview() {
  const { t, i18n } = useTranslation('pages')
  const isArabic = i18n.language === 'ar'

  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [notification, setNotification] = useState(null)
  const [properties, setProperties] = useState([])
  const [pendingProperties, setPendingProperties] = useState([])
  const [stats, setStats] = useState({
    totalProperties: 0,
    approvedProperties: 0,
    pendingProperties: 0,
    rejectedProperties: 0,
    activeInvestors: 0,
    totalInvestmentVolume: 0,
  })

  const formatDate = (value) => {
    if (!value) return t('admin.overview.pending.unknownDate')
    const d = new Date(value)
    if (isNaN(d.getTime())) return t('admin.overview.pending.unknownDate')
    const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US'
    return d.toLocaleDateString(locale)
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  async function loadAdminData() {
    try {
      setLoading(true)
      setError('')

      if (!getToken()) {
        setError(t('admin.overview.loginRequired'))
        setLoading(false)
        return
      }

      const [propertiesResult, usersResult] = await Promise.allSettled([
        fetchJson('/api/properties', { headers: { ...authHeader() } }),
        fetchJson('/api/users', { headers: { ...authHeader() } }),
      ])

      const allProperties =
        propertiesResult.status === 'fulfilled' && Array.isArray(propertiesResult.value)
          ? propertiesResult.value
          : []
      const allUsers =
        usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)
          ? usersResult.value
          : []

      setProperties(allProperties)

      const pending = allProperties.filter(p => p.status === 'PENDING')
      setPendingProperties(pending)

      const approved = allProperties.filter(p => p.status === 'APPROVED')
      const rejected = allProperties.filter(p => p.status === 'REJECTED')

      const totalInvestmentVolume = approved.reduce((sum, p) => {
        return sum + ((p.totalTokens || 0) * (p.tokenPrice || 0))
      }, 0)

      const activeInvestors = allUsers.filter(
        u => u.role === 'investor' || u.role === 'INVESTOR'
      ).length

      setStats({
        totalProperties: allProperties.length,
        approvedProperties: approved.length,
        pendingProperties: pending.length,
        rejectedProperties: rejected.length,
        activeInvestors,
        totalInvestmentVolume,
      })

      if (propertiesResult.status === 'rejected') {
        console.error('Failed to load properties:', propertiesResult.reason)
        setError(t('admin.overview.loadError'))
      }
    } catch (err) {
      console.error('Admin data load error:', err)
      setError(err.message || t('admin.overview.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const handlePropertyAction = async (propertyId, action) => {
    setActionLoading(propertyId)
    try {
      const response = await fetchJson(`/api/properties/${propertyId}/${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() }
      })

      if (response.success) {
        setNotification({
          type: 'success',
          message: t(`admin.overview.${action}Success`)
        })
        loadAdminData() // Refresh data
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: t(`admin.overview.${action}Error`)
      })
    } finally {
      setActionLoading(null)
    }
  }

  if (!getToken()) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Shield className="mx-auto text-gray-400" size={64} />
          <div className="text-gray-600">{t('admin.overview.loginRequired')}</div>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            {t('admin.overview.loginCta')}
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-blue-600 mx-auto" size={40} />
          <div className="text-gray-600">{t('admin.overview.loading')}</div>
        </div>
      </div>
    )
  }

  if (error && !notification) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
        <AlertCircle className="text-red-600" size={20} />
        <span className="text-red-700">{t('admin.overview.loadError')}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1E1958]">
          {t('admin.overview.headerTitle')}
        </h1>
        <p className="text-gray-600 mt-2">
          {t('admin.overview.headerSubtitle')}
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div className="max-w-7xl mx-auto px-6">
          <div className={`rounded-lg p-4 flex items-center gap-2 ${
            notification.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <CheckCircle className={notification.type === 'success' ? 'text-green-600' : 'text-red-600'} size={20} />
            <span className={notification.type === 'success' ? 'text-green-700' : 'text-red-700'}>{notification.message}</span>
          </div>
        </div>
      )}
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Properties Card */}
        <div className="bg-gradient-to-br from-[#1E1958] to-[#2a2458] rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Building2 className="text-white" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded">
              <TrendingUp size={14} />
              <span>{isArabic ? 'إجمالي' : 'Total'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.totalProperties}</div>
          <div className="text-white/80 text-sm">
            {t('admin.overview.stats.totalProperties')}
          </div>
        </div>

        {/* Approved Properties Card */}
        <div className="bg-[#41EAD4]/10 border border-[#41EAD4]/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#41EAD4]/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-[#41EAD4]" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-[#41EAD4]">
              <CheckCircle size={14} />
              <span>{isArabic ? 'موافق عليه' : 'Approved'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1E1958] mb-1">{stats.approvedProperties}</div>
          <div className="text-sm text-gray-600">
            {t('admin.overview.stats.approvedProperties')}
          </div>
        </div>

        {/* Pending Properties Card */}
        <div className="bg-[#ED9072]/10 border border-[#ED9072]/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#ED9072]/20 rounded-lg flex items-center justify-center">
              <Clock className="text-[#ED9072]" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-[#ED9072]">
              <Clock size={14} />
              <span>{isArabic ? 'معلق' : 'Pending'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1E1958] mb-1">{stats.pendingProperties}</div>
          <div className="text-sm text-gray-600">
            {t('admin.overview.stats.pendingProperties')}
          </div>
        </div>

        {/* Active Investors Card */}
        <div className="bg-[#CDB9A1]/30 border border-[#CDB9A1]/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#1E1958]/10 rounded-lg flex items-center justify-center">
              <Users className="text-[#1E1958]" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-[#1E1958]">
              <TrendingUp size={14} />
              <span>{isArabic ? 'نشط' : 'Active'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1E1958] mb-1">{stats.activeInvestors}</div>
          <div className="text-sm text-gray-600">
            {t('admin.overview.stats.activeInvestors')}
          </div>
        </div>
      </div>

      {/* Pending Properties Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1E1958] mb-2">{t('admin.overview.pending.title')}</h2>
              <p className="text-gray-600">{t('admin.overview.pending.subtitle', { count: pendingProperties.length })}</p>
            </div>
            <button 
              onClick={() => navigate('/admin/opportunities')}
              className="px-6 py-3 bg-gradient-to-r from-[#1E1958] to-[#2a2458] text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
            >
                 {t('admin.overview.pending.viewAll')}
            </button>
          </div>
        </div>
        
        {pendingProperties.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <div className="text-gray-600">{t('admin.overview.pending.emptyTitle')}</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1E1958]/5 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#1E1958] uppercase">{t('admin.overview.pending.table.propertyTitle')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#1E1958] uppercase">{t('admin.overview.pending.table.owner')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#1E1958] uppercase">{t('admin.overview.pending.table.submitted')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#1E1958] uppercase">{t('admin.overview.pending.table.value')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#1E1958] uppercase">{t('admin.overview.pending.table.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#1E1958] uppercase">{t('admin.overview.pending.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pendingProperties.map((property) => (
                  <tr key={property.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#1E1958] to-[#2a2458] rounded-lg flex items-center justify-center">
                          <Building2 className="text-white" size={20} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {property.name || property.title}
                            {property.propertyType && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({t(`owner.newProperty.step2.propertyTypes.${property.propertyType}`, property.propertyType)})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{property.location || 'Riyadh, SA'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {property.ownerName || t('admin.overview.pending.defaultOwner')}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {formatDate(property.submittedDate || property.createdAt)}
                    </td>
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">
                      {((property.totalTokens || 0) * (property.tokenPrice || 0)).toLocaleString()} {t('admin.overview.currency')}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/properties/${property.id}`)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title={t('admin.overview.pending.viewDetailsTitle')}
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handlePropertyAction(property.id, 'approve')}
                          disabled={actionLoading === property.id}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                        >
                          {actionLoading === property.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                          {t('admin.overview.pending.approve')}
                        </button>
                        <button
                          onClick={() => handlePropertyAction(property.id, 'reject')}
                          disabled={actionLoading === property.id}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                        >
                          <X size={14} />
                          {t('admin.overview.pending.reject')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('admin.overview.activity.title')}
            </h2>
          </div>
          <div className="space-y-3">
            {properties.slice(0, 5).map((property) => {
              const isApproved = property.status === 'APPROVED'
              const isPending = property.status === 'PENDING'
              const isRejected = property.status === 'REJECTED'
              
              return (
                <div
                  key={property.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isApproved ? 'bg-green-100' : isPending ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    {isApproved && <CheckCircle className="text-green-600" size={20} />}
                    {isPending && <Clock className="text-yellow-600" size={20} />}
                    {isRejected && <AlertCircle className="text-red-600" size={20} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {isApproved && <span className="text-green-600">{t('admin.overview.approved')}: </span>}
                      {isPending && <span className="text-yellow-600">{t('admin.overview.pending.statusPending')}: </span>}
                      {isRejected && <span className="text-red-600">{t('admin.overview.rejected')}: </span>}
                      {property.name || property.title}
                      {property.propertyType && (
                        <span className="text-xs text-gray-500 ml-1">
                          ({t(`owner.newProperty.step2.propertyTypes.${property.propertyType}`, property.propertyType)})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(property.submittedDate || property.createdAt)} 
                      • {((property.totalTokens || 0) * (property.tokenPrice || 0)).toLocaleString()} {t('admin.overview.currency')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}