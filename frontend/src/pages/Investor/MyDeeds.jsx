import { useState, useEffect } from 'react'
import { FileText, Download, QrCode, CheckCircle, Clock, XCircle } from 'lucide-react'
import { fetchJson, getToken, authHeader } from '../../lib/api'
import { QRCodeSVG } from 'qrcode.react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { useTranslation } from 'react-i18next'

export default function MyDeeds() {
  const [deeds, setDeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDeed, setSelectedDeed] = useState(null)
  const { t } = useTranslation('pages')

  useEffect(() => {
    loadDeeds()
  }, [])

  async function downloadDeedPDF(deed) {
    // Create a hidden div with deed content (RTL official-style layout)
    const element = document.createElement('div')
    element.style.position = 'absolute'
    element.style.left = '-9999px'
    element.innerHTML = `
      <div style="padding: 40px; font-family: Arial, sans-serif; width: 800px; direction: rtl; text-align: right; background-color: #f3f4f6;">
        <!-- Branded Header with logo -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px;">
          <div style="text-align: right;">
            <h1 style="margin: 0; font-size: 22px; color: #15803d; font-weight: 800;">
              ${t('investor.deeds.modalHeaderMain')}
            </h1>
            <p style="margin: 4px 0 0; font-size: 13px; color: #4b5563;">
              ${t('investor.deeds.modalSubtitle')}
            </p>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 36px; height: 36px; border-radius: 9999px; background: linear-gradient(135deg,#16a34a,#22c55e); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 700; font-size: 16px; box-shadow: 0 2px 6px rgba(22,163,74,0.35);">
              E
            </div>
            <div style="text-align: left;">
              <div style="font-size: 13px; font-weight: 700; color: #111827;">Estathub</div>
              <div style="font-size: 10px; color: #6b7280;">Digital Real Estate Platform</div>
            </div>
          </div>
        </div>

        <!-- Digital Seal -->
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="display: inline-block; padding: 6px 18px; border-radius: 9999px; border: 2px solid #16a34a; background-color: #ecfdf3; font-size: 11px; font-weight: 600; color: #15803d; letter-spacing: 0.03em;">
            ${t('investor.deeds.digitalSeal')}
          </span>
        </div>

        <!-- Main card -->
        <div style="border-radius: 12px; border: 1px solid #e5e7eb; background-color: #ffffff; padding: 20px;">
          <!-- Property Details -->
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; background-color: #f9fafb;">
            <h2 style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #111827;">
              ${t('investor.deeds.sectionProperty')}
            </h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <tbody>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.detailDeedNumber')}</td>
                  <td style="padding: 4px 0; font-family: monospace; font-weight: 600;">${deed.deedNumber || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.planNumber')}</td>
                  <td style="padding: 4px 0; font-weight: 500;">${deed.property?.planNumber || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.parcelNumber')}</td>
                  <td style="padding: 4px 0; font-weight: 500;">${deed.property?.parcelNumber || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.detailMunicipality')}</td>
                  <td style="padding: 4px 0; font-weight: 500;">${deed.property?.municipality || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.detailDistrict')}</td>
                  <td style="padding: 4px 0; font-weight: 500;">${deed.property?.district || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.city')}</td>
                  <td style="padding: 4px 0; font-weight: 500;">${deed.property?.city || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.area')}</td>
                  <td style="padding: 4px 0; font-weight: 500;">${
                    deed.property?.landArea ? `${deed.property.landArea} m²` : '-'
                  }</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.propertyType')}</td>
                  <td style="padding: 4px 0; font-weight: 500;">${
                    deed.property?.propertyTypeDetailed || deed.property?.type || '-'
                  }</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Ownership Details -->
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; background-color: #f9fafb;">
            <h2 style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #111827;">
              ${t('investor.deeds.sectionOwnership')}
            </h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <tbody>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.ownerName')}</td>
                  <td style="padding: 4px 0; font-weight: 500;">${deed.ownerName || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.ownerNationalId')}</td>
                  <td style="padding: 4px 0; font-family: monospace; font-weight: 600;">
                    ${deed.ownerNationalIdMasked || deed.ownerNationalId || '-'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.detailOwnedTokens')}</td>
                  <td style="padding: 4px 0; font-weight: 500;">${deed.ownedTokens.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.detailOwnershipPct')}</td>
                  <td style="padding: 4px 0; font-weight: 500;">${deed.ownershipPct.toFixed(4)}%</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.acquisitionDate')}</td>
                  <td style="padding: 4px 0; font-weight: 500;">
                    ${deed.acquiredAt
                      ? new Date(deed.acquiredAt).toLocaleDateString('en-SA')
                      : deed.issuedAt
                      ? new Date(deed.issuedAt).toLocaleDateString('en-SA')
                      : '-'}
                  </td>
                </tr>
                ${deed.blockchainTxId
                  ? `<tr>
                      <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.blockchainTxId')}</td>
                      <td style="padding: 4px 0; font-family: monospace; font-size: 10px;">${deed.blockchainTxId}</td>
                    </tr>`
                  : ''}
              </tbody>
            </table>
          </div>

          <!-- Issue Details -->
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; background-color: #f9fafb;">
            <h2 style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #111827;">
              ${t('investor.deeds.sectionIssue')}
            </h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <tbody>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.issuingAuthority')}</td>
                  <td style="padding: 4px 0; font-weight: 500;">Estathub</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.digitalRegistryNumber')}</td>
                  <td style="padding: 4px 0; font-family: monospace; font-weight: 600;">${deed.id || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.detailIssuedDate')}</td>
                  <td style="padding: 4px 0; font-weight: 500;">
                    ${deed.issuedAt ? new Date(deed.issuedAt).toLocaleString('en-SA') : '-'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">${t('investor.deeds.blockchainSystem')}</td>
                  <td style="padding: 4px 0; font-weight: 500;">${t('investor.deeds.blockchainSystemValue')}</td>
                </tr>
                ${Array.isArray(deed.events) && deed.events.length
                  ? `<tr><td colspan="2" style="padding-top:8px; font-weight:600; color:#111827;">سجل الإصدارات</td></tr>` +
                    deed.events
                      .map(
                        (evt) => `
                  <tr>
                    <td style="padding: 2px 0; color: #6b7280; font-size:10px;">+${evt.deltaTokens} توكن</td>
                    <td style="padding: 2px 0; font-size:10px; text-align:left; direction:ltr;">
                      ${new Date(evt.createdAt).toLocaleString('en-SA')}
                    </td>
                  </tr>`
                      )
                      .join('')
                  : ''}
              </tbody>
            </table>
          </div>

          <!-- Disclaimer -->
          <div style="margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 10px;">
            <p style="margin: 0; font-size: 10px; color: #6b7280; line-height: 1.6;">
              ${t('investor.deeds.disclaimer')}
            </p>
          </div>
        </div>
      </div>
    `
    document.body.appendChild(element)
    
    // Convert to canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      logging: false
    })
    
    // Generate PDF
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgWidth = 210
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
    pdf.save(`deed-${deed.deedNumber}.pdf`)
    
    // Cleanup
    document.body.removeChild(element)
  }

  async function loadDeeds() {
    try {
      setLoading(true)
      setError(null)
 if (!getToken()) {
        setError('Please login to view your deeds')
        return
        }
        const userId = localStorage.getItem('userId')
        if (!userId) {
        setError('User ID not found. Please login again.')
        return
        }
        console.log('📜 Loading deeds for user:', userId)
        const data = await fetchJson(`/api/deeds/user/${userId}`, {
        headers: { ...authHeader() }
        })
        console.log('✅ Deeds loaded:', data)
        setDeeds(Array.isArray(data) ? data : [])
} catch (err) {
  console.error('❌ Failed to load deeds:', err)
  setError(t('investor.deeds.loadFailed'))
  setDeeds([])
}
    finally {
      setLoading(false)
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'ISSUED':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'PENDING_APPROVAL':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'REVOKED':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  function getStatusText(status) {
  switch (status) {
    case 'ISSUED':
      return t('investor.deeds.statusIssued')
    case 'PENDING_APPROVAL':
      return t('investor.deeds.statusPending')
    case 'REVOKED':
      return t('investor.deeds.statusRevoked')
    case 'TRANSFERRED':
      return t('investor.deeds.statusTransferred')
    default:
      return status
  }
}

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
<p className="mt-4 text-gray-600">{t('investor.deeds.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">{error}</p>
        <div className="mt-4 flex gap-2">
        <button
        onClick={loadDeeds}
        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 font-medium"
        >
        {t('investor.deeds.errorTryAgain')}
        </button>
        <button
        onClick={() => window.location.href = '/login'}
        className="px-4 py-2 border border-yellow-300 text-yellow-700 rounded hover:bg-yellow-100 font-medium"
        >
        {t('investor.deeds.errorLoginAgain')}
        </button>
        </div>
        </div>
        {/* Still show empty deeds UI */}
        <div className="mt-8 bg-white rounded-lg shadow p-12 text-center">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Deeds Available</h3>
        <p className="text-gray-600">
        {t('investor.deeds.emptyErrorBody')}
        </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('investor.deeds.title')}</h1>
        <p className="mt-2 text-gray-600">
          {t('investor.deeds.subtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
  {t('investor.deeds.statsIssuedDeeds')}
</p>
              <p className="text-2xl font-bold text-gray-900">{deeds.length}</p>
            </div>
            <FileText className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('investor.deeds.statsIssuedDeeds')}</p>
              <p className="text-2xl font-bold text-green-600">
                {deeds.filter(d => d.status === 'ISSUED').length}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
             <p className="text-sm text-gray-600">
  {t('investor.deeds.statsTotalOwnership')}
</p>
              <p className="text-2xl font-bold text-blue-600">
                {deeds.reduce((sum, d) => sum + d.ownershipPct, 0).toFixed(2)}%
              </p>
            </div>
            <FileText className="w-10 h-10 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Deeds List */}
      {deeds.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('investor.deeds.emptyTitle')}</h3>
          <p className="text-gray-600">
            {t('investor.deeds.emptyBody')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {deeds.map((deed) => (
            <div
              key={deed.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedDeed(deed)}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(deed.status)}
                      <span className="text-sm font-medium text-gray-600">
                        {getStatusText(deed.status)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {deed.property?.title || t('investor.deeds.emptyTitle')}
                    </h3>
                    <p className="text-sm text-gray-600">
  {t('investor.deeds.statsTotalDeeds')}
</p>
                  </div>
                </div>

                {/* Deed Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">
  {t('investor.deeds.detailDeedNumber')}
</span>

                    <span className="text-sm font-mono font-medium text-gray-900">
                      {deed.deedNumber}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">
  {t('investor.deeds.cardTokens')}
</span>
                    <span className="text-sm font-medium text-gray-900">
                      {deed.ownedTokens.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                   <span className="text-sm text-gray-600">
  {t('investor.deeds.cardOwnership')}
</span>
                    <span className="text-sm font-medium text-blue-600">
                      {deed.ownershipPct.toFixed(2)}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">
  {t('investor.deeds.cardIssuedDate')}
</span>
                    <span className="text-sm font-medium text-gray-900">
  {deed.issuedAt
    ? new Date(deed.issuedAt).toLocaleDateString('en-SA')
    : t('investor.deeds.issuedDatePending')}
</span>
                  </div>
                </div>

                {/* Actions */}
                {deed.status === 'ISSUED' && (
                  <div className="flex gap-2">
                    <button
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadDeedPDF(deed)
                      }}
                    >
                     <Download className="w-4 h-4" />
{t('investor.deeds.downloadPdf')}
                    </button>
                    <button
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedDeed(deed)
                      }}
                    >
                        <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deed Detail Modal */}
      {selectedDeed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedDeed(null)}
        >
          <div
            className="bg-transparent max-w-3xl w-full max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-8" dir="rtl">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="text-right">
                  <h2 className="text-2xl font-extrabold text-gray-900 tracking-wide mb-1">
                    {t('investor.deeds.modalHeaderMain')}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {t('investor.deeds.modalSubtitle')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDeed(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  ✕
                </button>
              </div>

              {/* Seal */}
              <div className="mb-6 flex justify-center">
                <div className="inline-flex items-center justify-center px-6 py-3 border-2 border-blue-500 rounded-full bg-blue-50">
                  <span className="text-xs font-semibold text-blue-700 tracking-wide">
                    {t('investor.deeds.digitalSeal')}
                  </span>
                </div>
              </div>

              <div className="space-y-5 text-right">
                {/* Property Details */}
                <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">
                    {t('investor.deeds.sectionProperty')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t('investor.deeds.detailDeedNumber')}</span>
                      <span className="font-mono font-medium">{selectedDeed.deedNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t('investor.deeds.planNumber')}</span>
                      <span className="font-medium">
                        {selectedDeed.property?.planNumber || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t('investor.deeds.parcelNumber')}</span>
                      <span className="font-medium">
                        {selectedDeed.property?.parcelNumber || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t('investor.deeds.detailMunicipality')}</span>
                      <span className="font-medium">
                        {selectedDeed.property?.municipality || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t('investor.deeds.detailDistrict')}</span>
                      <span className="font-medium">
                        {selectedDeed.property?.district || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t('investor.deeds.city')}</span>
                      <span className="font-medium">
                        {selectedDeed.property?.city || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t('investor.deeds.area')}</span>
                      <span className="font-medium">
                        {selectedDeed.property?.landArea
                          ? `${selectedDeed.property.landArea} m²`
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t('investor.deeds.propertyType')}</span>
                      <span className="font-medium">
                        {selectedDeed.property?.propertyTypeDetailed || selectedDeed.property?.type || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ownership Details */}
                <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">
                    {t('investor.deeds.sectionOwnership')}
                  </h3>
                  <div className="space-y-2 text-xs md:text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t('investor.deeds.ownerName')}</span>
                      <span className="font-medium">
                        {selectedDeed.ownerName || selectedDeed.user?.name || selectedDeed.user?.email || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t('investor.deeds.ownerNationalId')}</span>
                      <span className="font-mono font-medium">
                        {selectedDeed.ownerNationalIdMasked || selectedDeed.ownerNationalId || selectedDeed.user?.nationalId || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t('investor.deeds.detailOwnedTokens')}</span>
                      <span className="font-medium">
                        {selectedDeed.ownedTokens?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t('investor.deeds.detailOwnershipPct')}</span>
                      <span className="font-medium">
                        {selectedDeed.ownershipPct?.toFixed(4)}%
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t('investor.deeds.acquisitionDate')}</span>
                      <span className="font-medium">
                        {selectedDeed.acquiredAt
                          ? new Date(selectedDeed.acquiredAt).toLocaleDateString('en-SA')
                          : selectedDeed.issuedAt
                          ? new Date(selectedDeed.issuedAt).toLocaleDateString('en-SA')
                          : '-'}
                      </span>
                    </div>
                    {selectedDeed.blockchainTxId && (
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">{t('investor.deeds.blockchainTxId')}</span>
                        <span className="font-mono text-[11px] bg-white px-2 py-1 rounded border border-gray-200 break-all max-w-xs text-left">
                          {selectedDeed.blockchainTxId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Issue Details + Issuance History */}
                <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">
                    {t('investor.deeds.sectionIssue')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm mb-3">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t('investor.deeds.issuingAuthority')}</span>
                      <span className="font-medium">Estathub</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t('investor.deeds.digitalRegistryNumber')}</span>
                      <span className="font-mono font-medium">{selectedDeed.id || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t('investor.deeds.detailIssuedDate')}</span>
                      <span className="font-medium">
                        {selectedDeed.issuedAt
                          ? new Date(selectedDeed.issuedAt).toLocaleString('en-SA')
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t('investor.deeds.blockchainSystem')}</span>
                      <span className="font-medium">
                        {t('investor.deeds.blockchainSystemValue')}
                      </span>
                    </div>
                  </div>

                  {Array.isArray(selectedDeed.events) && selectedDeed.events.length > 0 && (
                    <div className="mt-2 border-t border-gray-200 pt-2">
                      <p className="text-xs font-semibold text-gray-700 mb-1">سجل الإصدارات</p>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {selectedDeed.events.map((evt) => (
                          <div
                            key={evt.id || `${selectedDeed.id}-${evt.createdAt}-${evt.deltaTokens}`}
                            className="flex justify-between text-[11px] text-gray-600"
                          >
                            <span>+{evt.deltaTokens} توكن</span>
                            <span className="ltr:text-left rtl:text-right">
                              {new Date(evt.createdAt).toLocaleString('en-SA')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* QR + Disclaimer */}
                <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
                  <div className="flex flex-col items-center text-center gap-4">
                    {selectedDeed.qrCodeData && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                          {t('investor.deeds.qrTitle')}
                        </h3>
                        <div className="bg-white p-4 inline-block rounded-lg shadow-sm border border-gray-200">
                          <QRCodeSVG
                            value={selectedDeed.qrCodeData}
                            size={192}
                            level="H"
                            includeMargin={true}
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          {t('investor.deeds.qrDescription')}
                        </p>
                      </div>
                    )}

                    <p className="mt-2 text-[11px] text-gray-500 leading-relaxed max-w-2xl text-right">
                      {t('investor.deeds.disclaimer')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-row-reverse gap-3">
                <button
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => {
                    downloadDeedPDF(selectedDeed)
                  }}
                >
                  <Download className="w-5 h-5" />
                  {t('investor.deeds.modalDownloadPdf')}
                </button>
                <button
                  className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setSelectedDeed(null)}
                >
                  {t('investor.deeds.modalClose')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}