import { useState, useEffect } from 'react'
import { FileText, Download, QrCode, CheckCircle, Clock, XCircle } from 'lucide-react'
import { fetchJson, getToken, authHeader } from '../../lib/api'
import { QRCodeSVG } from 'qrcode.react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export default function MyDeeds() {
  const [deeds, setDeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDeed, setSelectedDeed] = useState(null)

  useEffect(() => {
    loadDeeds()
  }, [])

  async function downloadDeedPDF(deed) {
    // Create a hidden div with deed content
    const element = document.createElement('div')
    element.style.position = 'absolute'
    element.style.left = '-9999px'
    element.innerHTML = `
      <div style="padding: 40px; font-family: Arial, sans-serif; width: 800px;">
        <h1 style="text-align: center; color: #1e40af;">Digital Title Deed</h1>
        <h2 style="text-align: center; color: #6b7280;">صك ملكية رقمي</h2>
        
        <div style="margin-top: 30px;">
          <p><strong>Deed Number:</strong> ${deed.deedNumber}</p>
          <p><strong>Property:</strong> ${deed.property?.title}</p>
          <p><strong>Location:</strong> ${deed.property?.location}</p>
          <p><strong>Municipality:</strong> ${deed.property?.municipality || 'N/A'}</p>
          <p><strong>District:</strong> ${deed.property?.district || 'N/A'}</p>
          <p><strong>Owned Tokens:</strong> ${deed.ownedTokens.toLocaleString()}</p>
          <p><strong>Ownership:</strong> ${deed.ownershipPct.toFixed(4)}%</p>
          <p><strong>Issued Date:</strong> ${new Date(deed.issuedAt).toLocaleDateString('en-SA')}</p>
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
          <p style="font-size: 12px; color: #6b7280;">
            Verified on Hyperledger Fabric Blockchain
          </p>
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
            setError(err.message || 'Failed to load deeds')
            setDeeds([]) // Set empty array on error to prevent crashes
    } finally {
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
        return 'Issued'
      case 'PENDING_APPROVAL':
        return 'Pending Approval'
      case 'REVOKED':
        return 'Revoked'
      case 'TRANSFERRED':
        return 'Transferred'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your deeds...</p>
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
        Try Again
        </button>
        <button
        onClick={() => window.location.href = '/login'}
        className="px-4 py-2 border border-yellow-300 text-yellow-700 rounded hover:bg-yellow-100 font-medium"
        >
        Login Again
        </button>
        </div>
        </div>
        {/* Still show empty deeds UI */}
        <div className="mt-8 bg-white rounded-lg shadow p-12 text-center">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Deeds Available</h3>
        <p className="text-gray-600">
        Unable to load deeds. Please try refreshing or login again.
        </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Digital Deeds</h1>
        <p className="mt-2 text-gray-600">
          صكوك الملكية الرقمية - Your Saudi Digital Title Deeds
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Deeds</p>
              <p className="text-2xl font-bold text-gray-900">{deeds.length}</p>
            </div>
            <FileText className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Issued Deeds</p>
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
              <p className="text-sm text-gray-600">Total Ownership</p>
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Deeds Yet</h3>
          <p className="text-gray-600">
            Your digital title deeds will appear here once you purchase property tokens.
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
                      {deed.property?.title || 'Property'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {deed.property?.location || 'Location'}
                    </p>
                  </div>
                </div>

                {/* Deed Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Deed Number</span>
                    <span className="text-sm font-mono font-medium text-gray-900">
                      {deed.deedNumber}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Owned Tokens</span>
                    <span className="text-sm font-medium text-gray-900">
                      {deed.ownedTokens.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Ownership</span>
                    <span className="text-sm font-medium text-blue-600">
                      {deed.ownershipPct.toFixed(2)}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Issued Date</span>
                    <span className="text-sm font-medium text-gray-900">
                      {deed.issuedAt
                        ? new Date(deed.issuedAt).toLocaleDateString('en-SA')
                        : 'Pending'}
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
                      Download PDF
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
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Digital Title Deed
                  </h2>
                  <p className="text-gray-600">صك ملكية رقمي</p>
                </div>
                <button
                  onClick={() => setSelectedDeed(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Deed Information */}
              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Property Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Title:</span>
                      <span className="font-medium">{selectedDeed.property?.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{selectedDeed.property?.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Municipality:</span>
                      <span className="font-medium">
                        {selectedDeed.property?.municipality || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">District:</span>
                      <span className="font-medium">
                        {selectedDeed.property?.district || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Ownership Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Deed Number:</span>
                      <span className="font-mono font-medium">{selectedDeed.deedNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Owned Tokens:</span>
                      <span className="font-medium">
                        {selectedDeed.ownedTokens.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ownership Percentage:</span>
                      <span className="font-medium text-blue-600">
                        {selectedDeed.ownershipPct.toFixed(4)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium">{getStatusText(selectedDeed.status)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Issued Date:</span>
                      <span className="font-medium">
                        {selectedDeed.issuedAt
                          ? new Date(selectedDeed.issuedAt).toLocaleString('en-SA')
                          : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                {selectedDeed.qrCodeData && (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <h3 className="font-semibold text-gray-900 mb-3">Verification QR Code</h3>
                    <div className="bg-white p-4 inline-block rounded-lg">
                      <QRCodeSVG 
                        value={selectedDeed.qrCodeData}
                        size={192}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Scan to verify deed authenticity
                    </p>
                  </div>
                )}

                {/* Blockchain Info */}
                {selectedDeed.blockchainTxId && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Blockchain Verification</h3>
                    <p className="text-sm text-gray-600 mb-1">Transaction ID:</p>
                    <p className="text-xs font-mono bg-white p-2 rounded break-all">
                      {selectedDeed.blockchainTxId}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => {
                    downloadDeedPDF(selectedDeed)
                  }}
                >
                  <Download className="w-5 h-5" />
                  Download PDF Deed
                </button>
                <button
                  className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setSelectedDeed(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}