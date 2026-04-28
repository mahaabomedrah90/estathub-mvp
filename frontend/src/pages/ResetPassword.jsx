import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'

export default function ResetPassword() {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [tokenValid, setTokenValid] = useState(true)
  const isRTL = i18n.language === 'ar'

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token')
    if (!tokenFromUrl) {
      setTokenValid(false)
      setError(isRTL ? 'رابط إعادة التعيين غير صالح' : 'Invalid reset link')
    } else {
      setToken(tokenFromUrl)
    }
  }, [searchParams, isRTL])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language
        },
        body: JSON.stringify({ token, password, confirmPassword })
      })

      const data = await response.json()

      if (response.ok) {
        setIsSuccess(true)
      } else {
        setError(data.message || (isRTL ? 'فشل إعادة تعيين كلمة المرور' : 'Password reset failed'))
      }
    } catch (err) {
      setError(isRTL ? 'فشل الاتصال بالخادم' : 'Failed to connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-strong mb-2">
              {isRTL ? 'رابط غير صالح' : 'Invalid Link'}
            </h2>
            <p className="text-text-muted leading-relaxed">{error}</p>
          </div>
          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-accent text-white rounded-full font-semibold hover:bg-brand-accent/90 transition-colors shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            {isRTL ? 'طلب رابط جديد' : 'Request New Link'}
          </Link>
        </div>
      </div>
    )
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-brand-accent-soft rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-brand-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-strong mb-2">
              {isRTL ? 'تم إعادة التعيين بنجاح' : 'Password Reset Successful'}
            </h2>
            <p className="text-text-muted leading-relaxed">
              {isRTL
                ? 'تم إعادة تعيين كلمة المرور الخاصة بك بنجاح. يمكنك الآن استخدام كلمة المرور الجديدة لتسجيل الدخول.'
                : 'Your password has been successfully reset. You can now use your new password to login.'}
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-accent text-white rounded-full font-semibold hover:bg-brand-accent/90 transition-colors shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            {isRTL ? 'تسجيل الدخول' : 'Login'}
          </Link>
        </div>
      </div>
    )
  }

  // Main form
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md">

        {/* Brand Header */}
        <div className="text-center py-10 bg-brand-primary rounded-2xl">
          <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-brand-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
          </h1>
          <p className="text-white/75">
            {isRTL ? 'أدخل كلمة المرور الجديدة الخاصة بك' : 'Enter your new password'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-body mb-2">
                {isRTL ? 'كلمة المرور الجديدة' : 'New Password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={18} />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border border-border-soft rounded-xl w-full pl-10 pr-4 py-3 bg-surface-base focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors"
                  placeholder={isRTL ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-body mb-2">
                {isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={18} />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border border-border-soft rounded-xl w-full pl-10 pr-4 py-3 bg-surface-base focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors"
                  placeholder={isRTL ? 'أعد إدخال كلمة المرور' : 'Re-enter password'}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 font-semibold transition-colors shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>{isRTL ? 'جاري إعادة التعيين...' : 'Resetting...'}</span>
                </>
              ) : (
                <span>{isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}</span>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
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
    </div>
  )
}
