import { useState, useEffect } from 'react'
import { QrCode, CheckCircle, XCircle, Search, Camera, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchJson } from '../lib/api'
import { useTranslation } from 'react-i18next'

export default function VerifyDeed() {
  const { i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'

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
      alert(isRTL ? 'يرجى إدخال رقم الصك والرمز التحقق' : 'Please enter both deed number and hash')
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

  useEffect(() => {
    if (showScanner) {
      console.log('QR Scanner activated')
    }
  }, [showScanner])

  function handleFileUpload(event) {
    const file = event.target.files?.[0]
    if (file) {
      alert(isRTL
        ? 'سيتم تفعيل قراءة رمز QR من الصورة قريباً. يرجى إدخال التفاصيل يدوياً.'
        : 'QR code scanning from image will be implemented. Please enter deed details manually.')
      setShowScanner(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-2xl">

        {/* Brand Header */}
        <div className="text-center py-10 bg-brand-primary rounded-2xl mb-0">
          <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-7 h-7 text-brand-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isRTL ? 'التحقق من الصك الرقمي' : 'Verify Digital Deed'}
          </h1>
          <p className="text-white/75">
            {isRTL ? 'تحقق من أصالة صك الملكية الرقمي' : 'Verify the authenticity of a digital ownership deed'}
          </p>
        </div>

        {/* QR Scanner Panel */}
        {showScanner && (
          <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-8 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-strong">
                {isRTL ? 'رفع صورة رمز QR' : 'Upload QR Code Image'}
              </h3>
              <button
                onClick={() => setShowScanner(false)}
                className="text-text-muted hover:text-text-strong text-2xl transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="border-2 border-dashed border-border-soft rounded-xl p-8 text-center">
              <Camera className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted mb-4">
                {isRTL
                  ? 'ارفع صورة رمز QR أو أدخل التفاصيل يدوياً أدناه'
                  : 'Upload an image of the QR code or enter details manually below'}
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
                className="inline-block px-6 py-3 bg-brand-accent text-white rounded-full font-semibold hover:bg-brand-accent/90 cursor-pointer transition-colors"
              >
                {isRTL ? 'اختر صورة' : 'Choose Image'}
              </label>
            </div>
            <p className="text-sm text-text-muted mt-4 text-center">
              {isRTL ? 'أو أدخل تفاصيل الصك يدوياً في النموذج أدناه' : 'Or enter the deed details manually in the form below'}
            </p>
          </div>
        )}

        {/* Scan QR Button */}
        {!showScanner && (
          <button
            onClick={() => setShowScanner(true)}
            className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-brand-accent text-white rounded-xl font-semibold hover:bg-brand-accent/90 transition-colors shadow-sm"
          >
            <Camera className="w-5 h-5" />
            {isRTL ? 'مسح رمز QR' : 'Scan QR Code'}
          </button>
        )}

        {/* Verification Form */}
        <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-8 mt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-body mb-2">
                {isRTL ? 'رقم الصك' : 'Deed Number'}
              </label>
              <input
                type="text"
                value={deedNumber}
                onChange={(e) => setDeedNumber(e.target.value)}
                placeholder="DEED-2025-00001"
                className="w-full px-4 py-3 border border-border-soft rounded-xl bg-surface-base focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-body mb-2">
                {isRTL ? 'رمز التحقق' : 'Verification Hash'}
              </label>
              <input
                type="text"
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                placeholder={isRTL ? 'أدخل رمز التحقق من رمز QR' : 'Enter deed hash from QR code'}
                className="w-full px-4 py-3 border border-border-soft rounded-xl bg-surface-base focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors font-mono text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-accent text-white rounded-xl font-semibold hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {verifying ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {isRTL ? 'جاري التحقق...' : 'Verifying...'}
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  {isRTL ? 'التحقق من الصك' : 'Verify Deed'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Verification Result */}
        {result && (
          <div className={`mt-6 rounded-2xl shadow-card p-8 ${
            result.valid ? 'bg-brand-accent-soft border-2 border-brand-accent' : 'bg-red-50 border-2 border-red-400'
          }`}>
            <div className="flex items-center gap-4 mb-6">
              {result.valid ? (
                <CheckCircle className="w-12 h-12 text-brand-accent flex-shrink-0" />
              ) : (
                <XCircle className="w-12 h-12 text-red-600 flex-shrink-0" />
              )}
              <div>
                <h2 className={`text-2xl font-bold ${result.valid ? 'text-text-strong' : 'text-red-900'}`}>
                  {result.valid
                    ? (isRTL ? 'تم التحقق من الصك ✓' : 'Deed Verified ✓')
                    : (isRTL ? 'فشل التحقق ✗' : 'Verification Failed ✗')}
                </h2>
                <p className={result.valid ? 'text-text-body' : 'text-red-700'}>
                  {result.valid
                    ? (isRTL ? 'هذا الصك أصلي وصالح' : 'This deed is authentic and valid')
                    : (isRTL ? 'تعذر التحقق من هذا الصك' : 'This deed could not be verified')}
                </p>
              </div>
            </div>

            {result.valid && result.deed && (
              <div className="bg-surface-card border border-border-soft rounded-xl p-6 space-y-3">
                <h3 className="font-semibold text-text-strong mb-4">
                  {isRTL ? 'معلومات الصك' : 'Deed Information'}
                </h3>

                <div className="flex justify-between py-2 border-b border-border-soft">
                  <span className="text-text-muted">{isRTL ? 'رقم الصك:' : 'Deed Number:'}</span>
                  <span className="font-mono font-medium text-text-strong">{result.deed.deedNumber}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-border-soft">
                  <span className="text-text-muted">{isRTL ? 'المالك:' : 'Owner:'}</span>
                  <span className="font-medium text-text-strong">{result.deed.userName}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-border-soft">
                  <span className="text-text-muted">{isRTL ? 'العقار:' : 'Property:'}</span>
                  <span className="font-medium text-text-strong">{result.deed.propertyTitle}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-border-soft">
                  <span className="text-text-muted">{isRTL ? 'الرموز المملوكة:' : 'Owned Tokens:'}</span>
                  <span className="font-medium text-text-strong">{result.deed.ownedTokens?.toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-border-soft">
                  <span className="text-text-muted">{isRTL ? 'نسبة الملكية:' : 'Ownership:'}</span>
                  <span className="font-semibold text-brand-accent">
                    {result.deed.ownershipPct?.toFixed(2)}%
                  </span>
                </div>

                <div className="flex justify-between py-2">
                  <span className="text-text-muted">{isRTL ? 'تاريخ الإصدار:' : 'Issued Date:'}</span>
                  <span className="font-medium text-text-strong">
                    {result.deed.issuedAt ? new Date(result.deed.issuedAt).toLocaleDateString('en-SA') : 'N/A'}
                  </span>
                </div>

                {result.blockchainVerification && (
                  <div className="mt-4 pt-4 border-t border-border-soft">
                    <p className="text-sm text-brand-accent font-medium mb-1">
                      ✓ {isRTL ? 'تم التحقق على البلوكشين' : 'Verified on blockchain'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {isRTL
                        ? 'تم التحقق من هذا الصك على شبكة Hyperledger Fabric'
                        : 'This deed has been verified against the Hyperledger Fabric blockchain'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!result.valid && result.error && (
              <div className="bg-surface-card border border-border-soft rounded-xl p-6">
                <p className="text-red-800 font-medium">{isRTL ? 'خطأ:' : 'Error:'} {result.error}</p>
                <p className="text-sm text-text-muted mt-2">
                  {isRTL
                    ? 'يرجى التحقق من رقم الصك ورمز التحقق والمحاولة مرة أخرى.'
                    : 'Please check the deed number and hash and try again.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* How to Verify */}
        <div className="mt-6 bg-surface-card border border-border-soft rounded-2xl shadow-card p-6">
          <h3 className="font-semibold text-text-strong mb-3">
            {isRTL ? 'كيفية التحقق' : 'How to Verify'}
          </h3>
          <ol className="space-y-2 text-sm text-text-body">
            <li className="flex gap-2">
              <span className="font-bold text-brand-accent">1.</span>
              <span>{isRTL ? 'امسح رمز QR على صك الملكية الرقمي (PDF)' : 'Scan the QR code on the digital deed PDF'}</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand-accent">2.</span>
              <span>{isRTL ? 'أو أدخل رقم الصك ورمز التحقق يدوياً' : 'Or manually enter the deed number and verification hash'}</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand-accent">3.</span>
              <span>{isRTL ? 'انقر على "التحقق من الصك" للتحقق من الأصالة' : 'Click "Verify Deed" to check authenticity'}</span>
            </li>
          </ol>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-sm text-brand-accent hover:text-brand-accent/80 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {isRTL ? 'العودة لتسجيل الدخول' : 'Back to Login'}
          </Link>
        </div>

      </div>
    </div>
  )
}
