import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

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
        // Backend returns 501 - not implemented
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className={`text-2xl font-bold text-gray-900 mb-2 ${isRTL ? 'font-arabic' : ''}`}>
            {isRTL ? 'تم الإرسال بنجاح' : 'Email Sent Successfully'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isRTL 
              ? 'سنرسل رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني إذا كان مسجلاً لدينا'
              : 'We will send a password reset link to your email if it is registered with us'
            }
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {isRTL ? 'العودة لتسجيل الدخول' : 'Back to Login'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className={`text-3xl font-bold text-gray-900 mb-2 ${isRTL ? 'font-arabic' : ''}`}>
            {isRTL ? 'نسيت كلمة المرور' : 'Forgot Password'}
          </h1>
          <p className="text-gray-600">
            {isRTL 
              ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور'
              : 'Enter your email and we will send you a password reset link'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right font-arabic' : ''}`}>
              {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right font-arabic' : ''}`}
              placeholder={isRTL ? 'example@email.com' : 'example@email.com'}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isRTL ? 'جاري الإرسال...' : 'Sending...'}
              </span>
            ) : (
              isRTL ? 'إرسال رابط إعادة التعيين' : 'Send Reset Link'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className={`inline-flex items-center text-blue-600 hover:text-blue-700 text-sm ${isRTL ? 'font-arabic' : ''}`}
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
            {isRTL ? 'العودة لتسجيل الدخول' : 'Back to Login'}
          </Link>
        </div>
      </div>
    </div>
  )
}
