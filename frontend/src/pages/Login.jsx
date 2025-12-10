import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchJson, setToken } from '../lib/api'
import { Building2, Mail, Lock, AlertCircle, Loader2, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Login() {
  const { t, i18n } = useTranslation('pages')
  const isRtl = i18n.dir() === 'rtl'
  const [email, setEmail] = useState('admin@estathub.local')
  const [password, setPassword] = useState('Demo123!')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e) {    
    e.preventDefault()
    setError('')
    setLoading(true)
    
    console.log('🔐 Starting login...', { email, password })
    
    try {
      const res = await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      
      console.log('✅ Login response:', res)
      
      if (!res || !res.token) {
        throw new Error('Invalid response from server')
      }
      
      setToken(res.token)
      
      // Store user data from server response
      const rawRole = (res.user?.role || 'INVESTOR')
      const userRole = String(rawRole).toLowerCase() // normalize
      localStorage.setItem('role', userRole)
      localStorage.setItem('userId', res.user?.id || '')
      localStorage.setItem('userName', res.user?.name || res.user?.email || '')
      localStorage.setItem('tenantName', res.user?.tenant?.name || '')
      
      console.log('✅ Login successful - Role:', userRole, 'UserId:', res.user?.id)
      
      console.log('💾 Stored in localStorage:', {
        role: userRole,
        userId: res.user?.id,
        userName: res.user?.name,
        tenantName: res.user?.tenant?.name,
        token: !!localStorage.getItem('estathub_token')
      })
      
      // Navigate based on role from server
      const redirectUrl =
        userRole === 'admin'
          ? '/admin/overview'
          : userRole === 'owner'
          ? '/owner/dashboard'
          : userRole === 'regulator'
          ? '/regulator/overview'
          : '/investor/dashboard'
      
      console.log('🚀 Redirecting to:', redirectUrl)
      
      // Use React Router for navigation
      navigate(redirectUrl)
    } catch (err) {
  console.error('❌ Login error:', err)
  setError(err.message || t('auth.login.errorInvalid'))
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
            <span className="text-3xl font-bold text-gray-900">Estathub</span>
          </div>
         <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('auth.login.welcomeBack')}
          </h1>
          <p className="text-gray-600">
            {t('auth.login.subtitle')}
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.login.emailLabel')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="text-gray-400" size={20} />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="border border-gray-300 rounded-lg w-full pl-10 pr-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder={t('auth.login.emailPlaceholder')}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.login.passwordLabel')}
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
                  placeholder={t('auth.login.passwordPlaceholder')}
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
                  <span>{t('auth.login.signingIn')}</span>
                </>
              ) : (
                <>
                  <Lock size={20} />
                  <span>{t('auth.login.signIn')}</span>  
                </>
              )}
            </button>
          </form>

          {/* Demo Notice */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-medium mb-2">
          <strong>{t('auth.login.demoCredentials')}</strong>
          </p>
          <div className="text-xs text-blue-700 space-y-1">
          <p><strong>{t('auth.login.adminUser')}:</strong> admin@estathub.local / Demo123!</p>
          <p><strong>{t('auth.login.investorUser')}:</strong> investor@estathub.local / Demo123!</p>
          <p><strong>{t('auth.login.ownerUser')}:</strong> owner@estathub.local / Demo123!</p>
          </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            {t('auth.login.noAccount')} {' '}
           <button 
            onClick={() => navigate('/signup')}
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {t('auth.login.signupLink')}
          </button>
          </p>
        </div>
      </div>
    </div>
  )
}
