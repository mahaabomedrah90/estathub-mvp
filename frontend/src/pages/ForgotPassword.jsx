import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, ArrowLeft, CheckCircle, Loader2, Lock } from 'lucide-react'

export default function ForgotPassword() {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')
  const isRTL = i18n.language === 'ar'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.status === 501) {
        setError(isRTL ? 'هذه الميزة ستكون متاحة قريباً في المرحلة الثانية' : 'This feature will be available soon in Phase 2')
      } else if (response.ok) {
        setIsSubmitted(true)
      } else {
        setError(data.message || (isRTL ? 'حدث خطأ ما' : 'An error occurred'))
      }
    } catch (err) {
      setError(isRTL ? 'فشل الاتصال بالخادم' : 'Failed to connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-brand-accent-soft rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-brand-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-strong mb-2">
              {isRTL ? 'تم إرسال رابط إعادة تعيين كلمة المرور' : 'Password reset link sent'}
            </h2>
            <p className="text-text-muted leading-relaxed">
              {isRTL
                ? 'إذا كان البريد الإلكتروني مسجلاً لدينا، ستصلك رسالة تحتوي على رابط إعادة تعيين كلمة المرور. يرجى التحقق من صندوق الوارد والبريد غير الهام.'
                : 'If this email is registered with us, you will receive a message with a password reset link. Please check your inbox and spam folder.'}
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-accent text-white rounded-full font-semibold hover:bg-brand-accent/90 transition-colors shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            {isRTL ? 'العودة لتسجيل الدخول' : 'Back to Login'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md">

        {/* Brand Header */}
        <div className="text-center py-10 bg-brand-primary rounded-2xl mb-6">
          <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-brand-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isRTL ? 'نسيت كلمة المرور' : 'Forgot Password'}
          </h1>
          <p className="text-white/75 max-w-xs mx-auto">
            {isRTL
              ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور'
              : 'Enter your email and we will send you a password reset link'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-body mb-2">
                {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="text-gray-400" size={18} />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border border-border-soft rounded-xl w-full pl-10 pr-4 py-3 bg-surface-base focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors"
                  placeholder="example@email.com"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-3">
              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 font-semibold transition-colors shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>{isRTL ? 'جاري الإرسال...' : 'Sending...'}</span>
                  </>
                ) : (
                  <span>{isRTL ? 'إرسال رابط إعادة التعيين' : 'Send Reset Link'}</span>
                )}
              </button>
            </div>
          </form>

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
    </div>
  )
}
