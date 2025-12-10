import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authHeader, fetchJson, getToken } from '../../lib/api'
import {
  Building2,
  ArrowLeft,
  MapPin,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  FileText,
  Image as ImageIcon,
  Clock,
  DollarSign,
} from 'lucide-react'

export default function AdminPropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('pages')
  const isRtl = i18n.dir() === 'rtl'

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [property, setProperty] = useState(null)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    try {
      setLoading(true)
      setError('')

      if (!getToken()) {
        setError(t('admin.overview.loginRequired'))
        return
      }

      const data = await fetchJson(`/api/properties/${id}`, {
        headers: { ...authHeader() },
      })
      setProperty(data)
    } catch (e) {
      console.error('Admin property detail error:', e)
      setError(e.message || t('admin.overview.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const images = property?.mainImagesUrls || []

  const openImageViewer = (index) => {
    if (!images.length) return
    setActiveImageIndex(index)
    setImageViewerOpen(true)
  }

  const closeImageViewer = () => setImageViewerOpen(false)

  const showNextImage = () => {
    if (!images.length) return
    setActiveImageIndex((prev) => (prev + 1) % images.length)
  }

  const showPrevImage = () => {
    if (!images.length) return
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  async function handleDecision(action) {
    if (!property) return
    try {
      setActionLoading(true)
      setError('')

      const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

      await fetchJson(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ status: newStatus }),
      })

      navigate('/admin/overview')
    } catch (e) {
      console.error('Admin property decision error:', e)
      setError(e.message || t('admin.overview.loadError'))
    } finally {
      setActionLoading(false)
    }
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

  if (error || !property) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/admin/overview')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          <span>{t('admin.overview.headerTitle')}</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="text-red-600" size={20} />
          <span className="text-red-700">{error || t('admin.overview.loadError')}</span>
        </div>
      </div>
    )
  }

  const documentRows = [
    { key: 'deedDocumentUrl', label: t('owner.newProperty.step1.propertyDeedDocument') },
    { key: 'sitePlanDocumentUrl', label: t('owner.newProperty.step1.sitePlanDocument') },
    { key: 'buildingPermitUrl', label: t('owner.newProperty.step1.buildingPermit') },
    { key: 'electricityBillUrl', label: t('owner.newProperty.step1.electricityBill') },
    { key: 'waterBillUrl', label: t('owner.newProperty.step1.waterBill') },
    { key: 'ownerIdDocumentUrl', label: t('owner.newProperty.step1.ownerIdDocument') },
    { key: 'valuationReportUrl', label: t('owner.newProperty.step3.valuationReportLabel', { defaultValue: 'Valuation report' }) },
  ]

  const fullUrl = (path) => {
    if (!path) return ''
    if (path.startsWith('http')) return path
    return `${import.meta.env.VITE_API_BASE}${path}`
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header / breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/overview')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          <span>{t('admin.overview.headerTitle')}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDecision('reject')}
            disabled={actionLoading}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white text-sm font-medium flex items-center gap-2"
          >
            <X size={16} />
            {t('admin.overview.pending.reject')}
          </button>
          <button
            onClick={() => handleDecision('approve')}
            disabled={actionLoading}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium flex items-center gap-2"
          >
            {actionLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            {t('admin.overview.pending.approve')}
          </button>
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="h-56 bg-gray-100 flex items-center justify-center relative">
          {property.imageUrl ? (
            <img
              src={fullUrl(property.imageUrl)}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Building2 className="text-emerald-300" size={80} />
          )}
        </div>
        <div className="p-6 space-y-3">
          <h1 className="text-2xl font-bold text-gray-900">{property.name || property.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <span>
                {property.location ||
                  [property.city, property.district, property.municipality]
                    .filter(Boolean)
                    .join(', ') ||
                  'Location not specified'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>{t('admin.overview.pending.table.owner')}: {property.ownerName || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout: left = description & technical, right = documents */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={18} className="text-indigo-600" />
                {t('owner.newProperty.step2.propertyDescriptionLabel')}
              </h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {property.propertyDescription || property.description || '-'}
            </p>
          </div>

          {/* Technical details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building2 size={18} className="text-emerald-600" />
                {t('owner.newProperty.step2.title')}
              </h2>
            </div>
            <dl className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <DetailRow label={t('owner.newProperty.step2.landAreaLabel')} value={property.landArea} suffix="m²" />
              <DetailRow label={t('owner.newProperty.step2.builtAreaLabel')} value={property.builtArea} suffix="m²" />
              <DetailRow label={t('owner.newProperty.step2.buildingAgeLabel')} value={property.buildingAge} suffix={t('owner.newProperty.step2.buildingAgePlaceholder')} />
              <DetailRow label={t('owner.newProperty.step2.floorsCountLabel')} value={property.floorsCount} />
              <DetailRow label={t('owner.newProperty.step2.unitsCountLabel')} value={property.unitsCount} />
              <DetailRow label={t('owner.newProperty.step2.propertyConditionLabel')} value={property.propertyCondition} />
              <DetailRow label={t('owner.newProperty.step2.cityLabel')} value={property.city} />
              <DetailRow label={t('owner.newProperty.step2.districtLabel')} value={property.district} />
              <DetailRow label={t('owner.newProperty.step2.municipalityLabel')} value={property.municipality} />
              <DetailRow label={t('owner.newProperty.step2.gpsLatitudeLabel')} value={property.gpsLatitude} />
              <DetailRow label={t('owner.newProperty.step2.gpsLongitudeLabel')} value={property.gpsLongitude} />
            </dl>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ImageIcon size={18} />
                {t('owner.newProperty.step2.propertyImagesRangeLabel', { min: 3, max: 10 })}
              </h2>
              <span className="text-sm text-gray-600">
                {(property.mainImagesUrls || []).length} / 10
              </span>
            </div>
            {images.length === 0 ? (
              <p className="text-sm text-gray-600">{t('owner.newProperty.step2.imageUploadFailed')}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((url, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => openImageViewer(index)}
                    className="relative block focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg"
                  >
                    <img
                      src={fullUrl(url)}
                      alt={`Property ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:scale-105 transition-transform"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: documents & financial */}
        <div className="space-y-4">
          {/* Documents */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={18} className="text-sky-600" />
                {t('owner.newProperty.step1.infoBoxTitle')}
              </h2>
            </div>
            <div className="space-y-2 text-sm">
              {documentRows.map((doc) => {
                const value = property[doc.key]
                return (
                  <div
                    key={doc.key}
                    className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={16} className="text-gray-500" />
                      <span className="text-gray-800 truncate">{doc.label}</span>
                    </div>
                    {value ? (
                      <a
                        href={fullUrl(value)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {t('fileUpload.viewDocument', { defaultValue: 'View document' })}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {t('fileUpload.noDocument', { defaultValue: 'Not provided' })}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Financial summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-600" />
                {t('owner.newProperty.step3.title', { defaultValue: 'Financial & tokenization' })}
              </h2>
            </div>
            <DetailRow
              label={t('owner.newProperty.step3.marketValueLabel', { defaultValue: 'Market value' })}
              value={property.marketValue?.toLocaleString?.()}
              suffix={t('admin.overview.currency')}
            />
            <DetailRow
              label={t('admin.overview.pending.table.value')}
              value={((property.totalTokens || 0) * (property.tokenPrice || 0)).toLocaleString()}
              suffix={t('admin.overview.currency')}
            />
            <DetailRow
              label={t('owner.newProperty.step3.totalTokensLabel', { defaultValue: 'Total tokens' })}
              value={property.totalTokens?.toLocaleString?.()}
            />
            <DetailRow
              label={t('owner.newProperty.step3.tokenPriceLabel', { defaultValue: 'Token price' })}
              value={property.tokenPrice?.toLocaleString?.()}
              suffix={t('admin.overview.currency')}
            />
            <DetailRow
              label={t('owner.newProperty.step3.ownerRetainedPercentageLabel', { defaultValue: 'Owner retained %' })}
              value={property.ownerRetainedPercentage}
              suffix="%"
            />
          </div>
        </div>
      </div>
    </div>
      {/* Image lightbox viewer */}
      {imageViewerOpen && images.length > 0 && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 w-full h-full cursor-zoom-out"
            onClick={closeImageViewer}
          />
          <div className="relative z-50 max-w-4xl w-full px-4">
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
                <span className="text-sm text-gray-600">
                  {activeImageIndex + 1} / {images.length}
                </span>
                <button
                  type="button"
                  onClick={closeImageViewer}
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                >
                  {t('fileUpload.close', { defaultValue: 'Close' })}
                </button>
              </div>
              <div className="bg-black flex items-center justify-center">
                <img
                  src={fullUrl(images[activeImageIndex])}
                  alt={`Property full ${activeImageIndex + 1}`}
                  className="max-h-[70vh] w-auto object-contain"
                />
              </div>
              {images.length > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-white">
                  <button
                    type="button"
                    onClick={showPrevImage}
                    className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm"
                  >
                    ‹ {t('owner.newProperty.step2.previous', { defaultValue: 'Previous' })}
                  </button>
                  <button
                    type="button"
                    onClick={showNextImage}
                    className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm"
                  >
                    {t('owner.newProperty.step2.next', { defaultValue: 'Next' })} ›
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function DetailRow({ label, value, suffix }) {
  const hasValue = value !== undefined && value !== null && value !== ''
  return (
    <div className="grid grid-cols-2 gap-2 items-baseline">
      <dt className="text-gray-500 text-sm">{label}</dt>
      <dd className="text-gray-900 text-sm font-medium text-left rtl:text-right">
        {hasValue ? (
          <>
            {value} {suffix}
          </>
        ) : (
          '-'
        )}
      </dd>
    </div>
  )
}

