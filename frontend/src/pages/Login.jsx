import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { fetchJson, setToken } from '../lib/api'
import { Mail, Lock, AlertCircle, Loader2, Phone, Shield, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import PageWrapper from '../components/ui/PageWrapper'
import SectionCard from '../components/ui/SectionCard'
import PrimaryButton from '../components/ui/PrimaryButton'
import IconBox from '../components/ui/IconBox'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('pages')
  const lang = i18n.language
  const isRtl = i18n.dir() === 'rtl'

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

      // Navigate based on role
      if (userRole === 'admin') {
        navigate('/admin/overview')
      } else if (userRole === 'owner') {
        navigate('/owner/dashboard')
      } else {
        navigate('/investor/dashboard')
      }

    } catch (err) {
      const status = err.status
      const serverMessage = err.message || ''

      let errorMessage

      if (status === 401) {
        errorMessage = lang === 'ar' ? 'Invalid email/phone or password' : 'Invalid email/phone or password'
      } else if (status === 429) {
        errorMessage = lang === 'ar' ? 'Too many attempts. Please try again later.' : 'Too many attempts. Please try again later.'
      } else {
        errorMessage = lang === 'ar' ? 'Unexpected error occurred. Please try again.' : 'Unexpected error occurred. Please try again.'
      }

      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Full-width Header Section */}
      <div className="bg-brand-primary text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto mb-8">
              <img 
                src="/Icon 3.png" 
                alt="ALWASM" 
                className="w-24 h-24 mx-auto object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">
              {t('auth.login.welcomeBack')}
            </h1>
            <p className="text-white/90 text-lg leading-relaxed max-w-2xl mx-auto">
              {t('auth.login.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="flex items-center justify-center py-6">
        <div className="w-full max-w-md mx-auto px-4">
          <SectionCard padding="xl">
            <form onSubmit={onSubmit} className="space-y-8">
              {/* Email/Phone Field */}
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-text-body mb-3">
                  {t('auth.login.emailLabel')}
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                    {isEmail(identifier) || identifier.includes('@') ? (
                      <Mail className="text-text-muted" size={20} />
                    ) : (
                      <Phone className="text-text-muted" size={20} />
                    )}
                  </div>
                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    className={`border border-border-soft rounded-xl w-full ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors bg-surface-base`}
                    placeholder={t('auth.login.emailPlaceholder')}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-body mb-3">
                  {t('auth.login.passwordLabel')}
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                    <Lock className="text-text-muted" size={20} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`border border-border-soft rounded-xl w-full ${isRtl ? 'pr-12 pl-12' : 'pl-12 pr-12'} py-4 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors bg-surface-base`}
                    placeholder={t('auth.login.passwordPlaceholder')}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute inset-y-0 ${isRtl ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center text-text-muted hover:text-brand-accent transition-colors`}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3" role="alert">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              <div className="mt-2">
                <PrimaryButton
                  type="submit"
                  loading={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>{t('auth.login.signingIn')}</span>
                    </>
                  ) : (
                    <span>{t('auth.login.signIn')}</span>
                  )}
                </PrimaryButton>
              </div>
            </form>

            {/* Password Reset Link */}
            <div className="mt-8 text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-brand-accent hover:text-brand-accent/90 font-medium no-underline"
              >
                {t('auth.login.forgotPassword')}
              </Link>
            </div>
          </SectionCard>

          {/* Footer Links */}
          <div className="mt-12 text-center text-sm text-text-muted">
            <p>
              {t('auth.login.noAccount')} {' '}
              <Link
                to="/role-selection"
                className="text-brand-accent hover:text-brand-accent/90 font-medium no-underline"
              >
                {t('auth.login.footerLogin')}
              </Link>
            </p>
          </div>

          {/* Security Notice */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-surface-muted rounded-full border border-border-soft shadow-sm">
              <Shield className="text-brand-accent" size={14} />
              <span className="text-xs text-text-muted">
                {t('auth.login.demoCredentials')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
