import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchJson, setToken } from '../lib/api'
import { Building2, Mail, Lock, AlertCircle, Loader2, UserPlus, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { i18n } = useTranslation('pages')
  const lang = i18n.language

  const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const isEmailInput = isEmail(identifier)
      const payload = isEmailInput
        ? { email: identifier.toLowerCase().trim(), password }
        : { phoneNumber: identifier.trim(), password }

      const res = await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': lang,
          'X-Request-ID': crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()
        },
        body: JSON.stringify(payload)
      })

      if (!res || !res.token) {
        throw new Error('Invalid response from server')
      }

      setToken(res.token)

      const userRole = (res.user?.role || 'INVESTOR').toLowerCase()
      localStorage.setItem('role', userRole)
      localStorage.setItem('userId', res.user?.id || '')
      localStorage.setItem('userName', res.user?.fullName || res.user?.email || '')
      localStorage.setItem('tenantId', res.user?.tenantId || '')

      const redirectUrl =
        userRole === 'admin' ? '/admin/overview'
          : userRole === 'owner' ? '/owner/dashboard'
            : userRole === 'regulator' ? '/regulator/overview'
              : '/investor/dashboard'

      navigate(redirectUrl)
    } catch (err) {
  console.error('Login error:', err)

  // 🔍 استخراج status بطريقة آمنة (axios / fetch / custom errors)
  const status =
    err?.status ??
    err?.response?.status ??
    err?.error?.status ??
    null

  // 🔍 استخراج رسالة السيرفر لو كانت JSON نظيفة
  const serverMessage =
    err?.response?.data?.message ??
    err?.error?.message ??
    null

  // 🛡 فلترة أي رسالة تقنية غير مرغوبة
  const isSafeMessage = (msg) =>
    typeof msg === 'string' &&
    msg.length <= 150 &&
    !/http|<\/?html|<Error>|AccessDenied|Non-JSON|stack|trace|cloudfront|s3/i.test(msg)

  let errorMessage

  if (status === 401) {
    // ✅ رسالة موحدة لبيانات الدخول الخاطئة
    errorMessage =
      lang === 'ar'
        ? 'البريد الإلكتروني/الجوال أو كلمة المرور غير صحيحة'
        : 'Invalid email/phone or password'

  } else if (status === 429) {
    errorMessage =
      lang === 'ar'
        ? 'عدد محاولات كثيرة. يرجى المحاولة لاحقاً.'
        : 'Too many attempts. Please try again later.'

  } else {
    // أي خطأ آخر
    errorMessage =
      isSafeMessage(serverMessage)
        ? serverMessage
        : (lang === 'ar'
            ? 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'
            : 'Unexpected error occurred. Please try again.')
  }

  setError(errorMessage)
  setLoading(false)
}
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="text-emerald-600" size={40} />
            <span className="text-3xl font-bold text-gray-900">ALWASM</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {lang === 'ar' ? 'مرحباً بعودتك' : 'Welcome Back'}
          </h1>
          <p className="text-gray-600">
            {lang === 'ar' ? 'سجّل الدخول للوصول إلى محفظتك الاستثمارية' : 'Sign in to access your investment portfolio'}
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            {/* Email/Phone Field */}
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
                {lang === 'ar' ? 'البريد الإلكتروني أو رقم الجوال' : 'Email or Phone Number'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {isEmail(identifier) || identifier.includes('@') ? (
                    <Mail className="text-gray-400" size={20} />
                  ) : (
                    <Phone className="text-gray-400" size={20} />
                  )}
                </div>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="border border-gray-300 rounded-lg w-full pl-10 pr-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder={lang === 'ar' ? 'you@example.com أو 05XXXXXXXX' : 'you@example.com or 05XXXXXXXX'}
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {lang === 'ar'
                  ? 'أدخل بريدك الإلكتروني أو رقم جوالك المسجل'
                  : 'Enter your registered email or phone number'}
              </p>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {lang === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={20} />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="border border-gray-300 rounded-lg w-full pl-10 pr-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="••••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2" role="alert">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-3 font-semibold transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>{lang === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...'}</span>
                </>
              ) : (
                <>
                  <Lock size={20} />
                  <span>{lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>

          {/* Password Reset Link */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {lang === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
            </button>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            {lang === 'ar' ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
            <button
              onClick={() => navigate('/signup')}
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {lang === 'ar' ? 'إنشاء حساب' : 'Sign up'}
            </button>
          </p>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
            <Lock className="text-emerald-600" size={14} />
            <span className="text-xs text-gray-500">
              {lang === 'ar'
                ? 'تسجيل الدخول محمي بتشفير SSL ومراقبة الأمان'
                : 'Secure SSL encryption and security monitoring'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
