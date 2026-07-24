import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authHeader, fetchJson, getToken } from '../../lib/api'
import {
  Building2, FileText, Loader2, AlertCircle, ArrowLeft,
  CheckCircle, Clock, XCircle
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

const statusColors = {
  PENDING: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  APPROVED: 'bg-green-50 border-green-200 text-green-900',
  REJECTED: 'bg-red-50 border-red-200 text-red-900',
  ACTIVE: 'bg-blue-50 border-blue-200 text-blue-900',
  DRAFT: 'bg-gray-50 border-gray-200 text-gray-900'
}

const statusIcons = {
  PENDING: Clock,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  ACTIVE: CheckCircle,
  DRAFT: FileText
}

export default function ViewAllProperties() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [properties, setProperties] = useState([])
  const [filter, setFilter] = useState('ALL')
  const { t, i18n } = useTranslation('pages')
  const { t: tCommon } = useTranslation('common')
  const isAr = i18n.language === 'ar'

  useEffect(() => {
    loadProperties()
  }, [])

  async function loadProperties() {
    try {
      setLoading(true)
      setError('')

      if (!getToken()) {
        setError(isAr ? 'يرجى تسجيل الدخول' : 'Please login')
        return
      }

      // Get owner's properties
      const data = await fetchJson('/api/owner/properties', {
        headers: { ...authHeader() }
      })

      setProperties(Array.isArray(data) ? data : data?.properties || [])
    } catch (err) {
      console.error('Error loading properties:', err)
      setError(err.message || (isAr ? 'خطأ في تحميل العقارات' : 'Failed to load properties'))
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

  const filtered = filter === 'ALL'
    ? properties
    : properties.filter(p => (p.status || '').toUpperCase() === filter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/owner/properties')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-[#1E1958]">
            {isAr ? 'كل عقاراتي' : 'All My Properties'}
          </h1>
          <p className="text-gray-600">
            {isAr ? `${properties.length} عقار` : `${properties.length} properties`}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['ALL', 'DRAFT', 'PENDING', 'APPROVED', 'ACTIVE', 'REJECTED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-full font-medium transition-colors whitespace-nowrap ${
              filter === status
                ? 'bg-[#1E1958] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'ALL'
              ? (isAr ? 'الكل' : 'All')
              : status === 'DRAFT'
              ? (isAr ? 'مسودة' : 'Draft')
              : status === 'PENDING'
              ? (isAr ? 'قيد المراجعة' : 'Pending')
              : status === 'APPROVED'
              ? (isAr ? 'موافق عليه' : 'Approved')
              : status === 'ACTIVE'
              ? (isAr ? 'نشط' : 'Active')
              : (isAr ? 'مرفوض' : 'Rejected')}
            {filtered.length > 0 && status === filter && (
              <span className="ml-2 text-sm">({filtered.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Properties List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Building2 className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-600">
            {isAr ? 'لا توجد عقارات' : 'No properties found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((property) => {
            const Status = statusIcons[property.status] || FileText
            return (
              <div
                key={property.id}
                className={`border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer ${statusColors[property.status] || statusColors.DRAFT}`}
                onClick={() => navigate(`/owner/properties/${property.id}`)}
              >
                {property.imageUrl && (
                  <img
                    src={property.imageUrl}
                    alt={property.title}
                    className="w-full h-40 object-cover rounded-lg mb-4"
                  />
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{property.title || (isAr ? 'بدون عنوان' : 'Untitled')}</h3>
                    <p className="text-sm opacity-75">{property.location || property.city}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <Status size={20} />
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-3 inline-block px-3 py-1 rounded-full text-xs font-semibold">
                  {property.status === 'DRAFT'
                    ? (isAr ? '📝 مسودة' : '📝 Draft')
                    : property.status === 'PENDING'
                    ? (isAr ? '⏳ قيد المراجعة' : '⏳ Pending')
                    : property.status === 'APPROVED'
                    ? (isAr ? '✅ موافق عليه' : '✅ Approved')
                    : property.status === 'ACTIVE'
                    ? (isAr ? '🟢 نشط' : '🟢 Active')
                    : (isAr ? '❌ مرفوض' : '❌ Rejected')}
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm">
                  {property.totalValue && (
                    <div className="flex justify-between">
                      <span>{isAr ? 'القيمة الإجمالية' : 'Total Value'}</span>
                      <span className="font-semibold">{property.totalValue.toLocaleString()} ر.س</span>
                    </div>
                  )}
                  {property.landArea && (
                    <div className="flex justify-between">
                      <span>{isAr ? 'مساحة الأرض' : 'Land Area'}</span>
                      <span className="font-semibold">{property.landArea} م²</span>
                    </div>
                  )}
                  {property.builtArea && (
                    <div className="flex justify-between">
                      <span>{isAr ? 'المساحة المبنية' : 'Built Area'}</span>
                      <span className="font-semibold">{property.builtArea} م²</span>
                    </div>
                  )}
                </div>

                {property.rejectionReason && (
                  <div className="mt-4 p-3 bg-red-100/20 rounded text-xs">
                    <p className="font-semibold text-red-900 mb-1">
                      {isAr ? 'سبب الرفض:' : 'Rejection reason:'}
                    </p>
                    <p className="text-red-800">{property.rejectionReason}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
