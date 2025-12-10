import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchJson, setToken } from '../lib/api'
import { Building2, Mail, Lock, AlertCircle, Loader2, UserPlus, User, Building, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    tenantName: '',
    role: 'INVESTOR'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const navigate = useNavigate()
const { t, i18n } = useTranslation('pages')
const isRtl = i18n.dir() === 'rtl'  

 const handleInputChange = (e) => {
  const { name, value } = e.target
  setFormData(prev => ({ ...prev, [name]: value }))
}

const validateForm = () => {
  if (!formData.email || !formData.password || !formData.name) {
    setError(t('auth.signup.errorRequired'))
    return false
  }

  if (formData.password.length < 8) {
    setError(t('auth.signup.errorPasswordLength'))
    return false
  }

  if (formData.password !== formData.confirmPassword) {
    setError(t('auth.signup.errorPasswordMismatch'))
    return false
  }

  if (!formData.email.includes('@')) {
    setError(t('auth.signup.errorEmailInvalid'))
    return false
  }

  return true
}


  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    
    console.log('🔐 Starting signup...', formData)
    
    try {
      const { confirmPassword, ...signupData } = formData
      
      const res = await fetchJson('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      })
      
      console.log('✅ Signup response:', res)
      
      if (!res || !res.token) {
        throw new Error('Invalid response from server')
      }
      
      setToken(res.token);
      
      // Store user data from server response
      const userRole = (res.user?.role || 'INVESTOR').toUpperCase()
      localStorage.setItem('role', userRole.toLowerCase()) // Store in lowercase for frontend
      localStorage.setItem('userId', res.user?.id || '')
      localStorage.setItem('userName', res.user?.name || res.user?.email || '')
      localStorage.setItem('tenantName', res.user?.tenant?.name || '')
      
      console.log('✅ Signup successful - Role:', userRole, 'UserId:', res.user?.id)
      
      // Navigate based on role from server
      const redirectUrl = userRole === 'ADMIN' 
        ? '/admin/overview'
        : userRole === 'OWNER'
        ? '/owner/dashboard'
        : '/investor/dashboard'
      
     navigate(redirectUrl)
    } catch (err) {
      console.error('❌ Signup error:', err)
      setError(err.message || 'Signup failed. Please try again.')
      setLoading(false)
    }
  }

  return (
   <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-2 sm:px-4">
  <div className="w-full max-w-3xl">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="text-emerald-600" size={40} />
            <span className="text-3xl font-bold text-gray-900">Estathub</span>
          </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
  {t('auth.signup.title')}
</h1>
<p className="text-gray-600">
  {t('auth.signup.subtitle')}
</p>
        </div>

        {/* Signup Form Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-8">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Name Field */}
          
             <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.signup.nameLabel')}
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-gray-400" size={20} />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded-lg w-full pl-10 pr-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors block text-sm font-medium text-gray-700 mb-2"
                  placeholder={t('auth.signup.namePlaceholder')}
                  required
                /> 
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.signup.emailLabel')} 
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="text-gray-400" size={20} />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded-lg w-full pl-10 pr-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors block text-sm font-medium text-gray-700 mb-2"
                  placeholder={t('auth.signup.emailPlaceholder')}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.signup.passwordLabel')} 
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={20} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded-lg w-full pl-10 pr-12 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors block text-sm font-medium text-gray-700 mb-2"
                  placeholder={t('auth.signup.passwordPlaceholder')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? <EyeOff className="text-gray-400" size={20} /> : <Eye className="text-gray-400" size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.signup.confirmPasswordLabel')} 
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={20} />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded-lg w-full pl-10 pr-12 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors block text-sm font-medium text-gray-700 mb-2"
                  placeholder={t('auth.signup.confirmPasswordPlaceholder')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? <EyeOff className="text-gray-400" size={20} /> : <Eye className="text-gray-400" size={20} />}
                </button>
              </div>
            </div>

            {/* Tenant Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
  {t('auth.signup.tenantLabel')}
</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="text-gray-400" size={20} />
                </div>
                <input
                  type="text"
                  name="tenantName"
                  value={formData.tenantName}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded-lg w-full pl-10 pr-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors block text-sm font-medium text-gray-700 mb-2"
                 placeholder={t('auth.signup.tenantPlaceholder')}
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.signup.accountTypeLabel')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'INVESTOR' }))}
                  className={`px-3 py-2 rounded-lg border-2 font-medium transition-all text-sm ${
                    formData.role === 'INVESTOR'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {t('auth.signup.roleInvestor')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'OWNER' }))}
                  className={`px-3 py-2 rounded-lg border-2 font-medium transition-all text-sm ${
                    formData.role === 'OWNER'
                      ? 'border-amber-600 bg-amber-50 text-amber-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {t('auth.signup.roleOwner')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'ADMIN' }))}
                  className={`px-3 py-2 rounded-lg border-2 font-medium transition-all text-sm ${
                    formData.role === 'ADMIN'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {t('auth.signup.roleAdmin')}
                </button>
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
    <span>{t('auth.signup.creatingAccount')}</span>
  </>
) : (
  <>
    <UserPlus size={20} />
    <span>{t('auth.signup.submit')}</span>
  </>
)}
            </button>
          </form>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            {t('auth.signup.footerQuestion')} {' '}
            <button 
              onClick={() => navigate('/login')}
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
                {t('auth.signup.footerLogin')}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}