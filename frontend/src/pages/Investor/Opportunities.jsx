import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, TrendingUp, Coins, MapPin, ArrowRight, Loader2, Plus, Edit2, Eye, Shield } from 'lucide-react'
import { getToken } from '../../lib/api'
import { useTranslation } from 'react-i18next'

// Mask property ID for public view
const maskPropertyId = (id) => {
  if (!id || typeof id !== 'string') return id
  if (id.length <= 8) return id
  return id.substring(0, 8) + '**********' + id.substring(id.length - 8)
}

export default function Opportunities() {
  const { t, i18n } = useTranslation('property')
const isRtl = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    // Check user role
    const role = localStorage.getItem('role')
    setUserRole(role)
    
    setLoading(true)
    setError('')
    
    // Fetch properties based on role
    // Owners see ALL their properties, Investors see only APPROVED
    const url = role === 'owner' 
      ? import.meta.env.VITE_API_BASE + '/api/properties'
      : import.meta.env.VITE_API_BASE + '/api/properties?status=APPROVED'
    
    fetch(url)
      .then(async r => {
        if (!r.ok) throw new Error('failed_to_load')
        return r.json()
      })
      .then(data => setProperties(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Error loading properties:', err)
        setError(t('list.loadError'))
        console.error('Detailed error:', err);
      })
      .finally(() => setLoading(false))
  }, [])

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700'
    }
    return styles[status] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
         <h1 className="text-3xl font-bold text-gray-900">
  {userRole === 'owner'
    ? t('list.titleOwner')
    : t('list.titleInvestor')}
</h1>
<p className="text-gray-600">
  {userRole === 'owner'
    ? t('list.subtitleOwner')
    : t('list.subtitleInvestor')}
</p>
        </div>
        {userRole === 'owner' && (
          <button
            onClick={() => navigate('/owner/new')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:scale-105"
          >
           <Plus size={20} />
<span>{t('list.addNewProperty')}</span>
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Loader2 className="animate-spin text-emerald-600 mx-auto" size={40} />
            <div className="text-gray-600">{t('list.loading')}</div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
          {error}
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Building2 className="mx-auto text-gray-400 mb-3" size={48} />
          <div className="text-gray-600">{t('list.empty')}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map(p => {
            const status = p.status || 'APPROVED'
            const tokenPrice = Number(p.tokenPrice ?? 0)
            const monthlyYield = p.monthlyYield ?? 0
            const remainingTokens = p.remainingTokens ?? p.tokensAvailable ?? 0
            const totalTokens = p.totalTokens ?? remainingTokens
            const percentageSold = totalTokens > 0 ? ((totalTokens - remainingTokens) / totalTokens * 100).toFixed(0) : 0

            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow relative">
                {/* Image */}
                <div className="relative h-48 bg-gradient-to-br from-emerald-500 to-teal-600">
                  {/* Status Badge for Owners */}
                  {userRole === 'owner' && (
                    <div className="absolute top-4 right-4 z-10">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(status)}`}>
                        {status}
                      </span>
                    </div>
                  )}
                  {p.imageUrl ? (
                    <img 
                      src={p.imageUrl} 
                      alt={p.name ?? p.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div className={`absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 ${p.imageUrl ? 'hidden' : 'flex'} items-center justify-center`}>
                    <Building2 className="text-white opacity-50" size={64} />
                  </div>
                </div>

                {/* Property Details */}
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="font-semibold text-xl text-gray-900 mb-1">{p.name ?? p.title}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin size={14} />
                      <span>{t('list.locationFallback')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Shield size={12} />
                      <span>{t('list.idLabel')}: {maskPropertyId(p.id)}</span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
                        <Coins size={14} />
                        <span>{t('list.tokenPrice')}</span>
                      </div>
                      <div className="font-semibold text-gray-900">{tokenPrice.toLocaleString()} SAR</div>
                    </div>

                    <div className="bg-emerald-50 rounded-lg p-3">
                      <div className="flex items-center gap-1 text-emerald-600 text-xs mb-1">
                        <TrendingUp size={14} />
                        <span>{t('list.monthlyYield')}</span>
                      </div>
                      <div className="font-semibold text-emerald-700">{monthlyYield}%</div>
                    </div>
                  </div>

                  {/* Availability Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">{t('list.tokensAvailable')}</span>
                      <span className="font-medium text-gray-900">{remainingTokens.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-emerald-600 h-2 rounded-full transition-all" 
                        style={{ width: `${100 - percentageSold}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
  {t('list.percentSold', { value: percentageSold })}
</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-4 bg-gray-50 border-t border-gray-200">
                    {userRole === 'owner' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/properties/${p.id}`)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                        >
                          <Eye size={18} />
                          <span>{t('list.view')}</span>
                        </button>
                        {(status === 'PENDING' || status === 'REJECTED') && (
                          <button
                            onClick={() => navigate(`/owner/properties`)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                          >
                            <Edit2 size={18} />
                            <span>{t('list.edit')}</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <Link
                      to={`/investor/properties/${p.id}`}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <span>{t('list.viewDetails')}</span>
                     <ArrowRight
  size={18}
  className={isRtl ? 'rotate-180' : ''}
/>
                    </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
