import { useState, useEffect } from 'react'
import { QrCode, CheckCircle, XCircle, Search, Camera } from 'lucide-react'
import { fetchJson } from '../lib/api'

export default function VerifyDeed() {
  const [deedNumber, setDeedNumber] = useState('')
  const [hash, setHash] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState(null)
  const [showScanner, setShowScanner] = useState(false)

  // Get deed number and hash from URL params
  useState(() => {
    const params = new URLSearchParams(window.location.search)
    const deedParam = params.get('deed')
    const hashParam = params.get('hash')
    if (deedParam) setDeedNumber(deedParam)
    if (hashParam) setHash(hashParam)
    if (deedParam && hashParam) {
      verifyDeed(deedParam, hashParam)
    }
  }, [])

  async function verifyDeed(deedNum = deedNumber, deedHash = hash) {
    if (!deedNum || !deedHash) {
      alert('Please enter both deed number and hash')
      return
    }

    try {
      setVerifying(true)
      setResult(null)
      const data = await fetchJson('/api/deeds/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deedNumber: deedNum,
          hash: deedHash
        })
      })
      setResult(data)
    } catch (err) {
      console.error('Verification failed:', err)
      setResult({ valid: false, error: err.message })
    } finally {
      setVerifying(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    verifyDeed()
  }

  // QR Scanner with HTML5 QRCode (simplified version)
  useEffect(() => {
    if (showScanner) {
      // For now, we'll use a file input as a simpler alternative
      // In production, you can integrate html5-qrcode library
      console.log('QR Scanner activated')
    }
  }, [showScanner])

  function handleFileUpload(event) {
    const file = event.target.files?.[0]
    if (file) {
      // In production, use a QR code reader library to decode the image
      // For now, show instructions
      alert('QR code scanning from image will be implemented. Please enter deed details manually.')
      setShowScanner(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <QrCode className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Verify Digital Deed
          </h1>
          <p className="text-gray-600">
            التحقق من صك الملكية الرقمي
          </p>
        </div>

        {/* QR Scanner - File Upload Alternative */}
        {showScanner && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload QR Code Image</h3>
              <button
                onClick={() => setShowScanner(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Upload an image of the QR code or enter details manually below
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="qr-upload"
              />
              <label
                htmlFor="qr-upload"
                className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
              >
                Choose Image
              </label>
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center">
              Or enter the deed details manually in the form below
            </p>
          </div>
        )}

        {/* Scan Button */}
        {!showScanner && (
          <button
            onClick={() => setShowScanner(true)}
            className="w-full mb-6 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Camera className="w-5 h-5" />
            Scan QR Code
          </button>
        )}

        {/* Verification Form */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deed Number
              </label>
              <input
                type="text"
                value={deedNumber}
                onChange={(e) => setDeedNumber(e.target.value)}
                placeholder="DEED-2025-00001"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Hash
              </label>
              <input
                type="text"
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                placeholder="Enter deed hash from QR code"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {verifying ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Verify Deed
                </>
              )}
            </button>
          </form>
        </div>

        {/* Verification Result */}
        {result && (
          <div className={`rounded-lg shadow-lg p-8 ${
            result.valid ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'
          }`}>
            <div className="flex items-center gap-4 mb-6">
              {result.valid ? (
                <CheckCircle className="w-12 h-12 text-green-600" />
              ) : (
                <XCircle className="w-12 h-12 text-red-600" />
              )}
              <div>
                <h2 className={`text-2xl font-bold ${
                  result.valid ? 'text-green-900' : 'text-red-900'
                }`}>
                  {result.valid ? 'Deed Verified ✓' : 'Verification Failed ✗'}
                </h2>
                <p className={result.valid ? 'text-green-700' : 'text-red-700'}>
                  {result.valid ? 'This deed is authentic and valid' : 'This deed could not be verified'}
                </p>
              </div>
            </div>

            {result.valid && result.deed && (
              <div className="bg-white rounded-lg p-6 space-y-3">
                <h3 className="font-semibold text-gray-900 mb-4">Deed Information</h3>
                
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Deed Number:</span>
                  <span className="font-mono font-medium">{result.deed.deedNumber}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Owner:</span>
                  <span className="font-medium">{result.deed.userName}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Property:</span>
                  <span className="font-medium">{result.deed.propertyTitle}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Owned Tokens:</span>
                  <span className="font-medium">{result.deed.ownedTokens?.toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Ownership:</span>
                  <span className="font-medium text-blue-600">
                    {result.deed.ownershipPct?.toFixed(2)}%
                  </span>
                </div>

                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Issued Date:</span>
                  <span className="font-medium">
                    {result.deed.issuedAt ? new Date(result.deed.issuedAt).toLocaleDateString('en-SA') : 'N/A'}
                  </span>
                </div>

                {result.blockchainVerification && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">
                      ✓ Verified on blockchain
                    </p>
                    <p className="text-xs text-gray-500">
                      This deed has been verified against the Hyperledger Fabric blockchain
                    </p>
                  </div>
                )}
              </div>
            )}

            {!result.valid && result.error && (
              <div className="bg-white rounded-lg p-6">
                <p className="text-red-800 font-medium">Error: {result.error}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Please check the deed number and hash and try again.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-3">How to Verify</h3>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="font-bold">1.</span>
              <span>Scan the QR code on the digital deed PDF</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">2.</span>
              <span>Or manually enter the deed number and verification hash</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">3.</span>
              <span>Click "Verify Deed" to check authenticity</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}