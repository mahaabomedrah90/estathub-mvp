import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchJson, setToken } from '../lib/api'
import { FormProvider, useFormContext } from '../contexts/FormContext'
import {
  Building2,
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  UserPlus,
  User,
  Eye,
  EyeOff,
  Phone,
  CreditCard,
  Shield
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

const InputField = React.memo(({ icon: Icon, label, name, type = 'text', placeholder, hint, maxLength }) => {
  const { formData, handleInputChange, fieldErrors } = useFormContext()
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="text-gray-400" size={20} />
        </div>
        <input
          type={type}
          name={name}
          value={formData[name] || ''}
          onChange={handleInputChange}
          maxLength={maxLength}
          className={`border ${fieldErrors[name] ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'} rounded-lg w-full pl-10 pr-4 py-3 focus:ring-2 transition-colors block text-sm font-medium text-gray-700`}
          placeholder={placeholder}
          required
        />
      </div>
      {fieldErrors[name] && <p className="mt-1 text-sm text-red-600">{fieldErrors[name]}</p>}
      {hint && !fieldErrors[name] && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  )
})

const SignupForm = React.memo(() => {
  const { formData, handleInputChange, fieldErrors, setFieldErrors } = useFormContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('pages')
  const isRtl = i18n.dir() === 'rtl'
  const lang = i18n.language

  const validateForm = useCallback(() => {
    const errors = {}
    if (!formData.fullName || formData.fullName.trim().length < 2) {
      errors.fullName = lang === 'ar' ? 'الاسم الكامل مطلوب' : 'Full name is required'
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email || !emailRegex.test(formData.email)) {
      errors.email = lang === 'ar' ? 'بريد إلكتروني غير صحيح' : 'Invalid email address'
    }
    const phoneDigits = formData.phoneNumber.replace(/\D/g, '')
    let phoneValid = false
    if (phoneDigits.length === 9 && phoneDigits.startsWith('5')) phoneValid = true
    else if (phoneDigits.length === 10 && phoneDigits.startsWith('05')) phoneValid = true
    else if (phoneDigits.length === 12 && phoneDigits.startsWith('9665')) phoneValid = true
    if (!phoneValid) {
      errors.phoneNumber = lang === 'ar'
        ? 'رقم جوال سعودي غير صحيح (مثال: 05XXXXXXXX)'
        : 'Invalid Saudi mobile number (e.g., 05XXXXXXXX)'
    }
    const nationalIdClean = formData.nationalId.trim()
    if (!/^\d{10}$/.test(nationalIdClean)) {
      errors.nationalId = lang === 'ar'
        ? 'رقم الهوية يجب أن يكون 10 أرقام'
        : 'National ID must be 10 digits'
    } else if (!/^[12]/.test(nationalIdClean)) {
      errors.nationalId = lang === 'ar'
        ? 'يجب أن يبدأ بـ 1 (مواطن) أو 2 (مقيم)'
        : 'Must start with 1 (citizen) or 2 (resident)'
    }
    if (formData.password.length < 10) {
      errors.password = lang === 'ar'
        ? 'كلمة المرور يجب أن تكون 10 أحرف على الأقل'
        : 'Password must be at least 10 characters'
    } else if (!/[A-Z]/.test(formData.password)) {
      errors.password = lang === 'ar'
        ? 'يجب أن تحتوي على حرف كبير واحد على الأقل'
        : 'Must contain at least one uppercase letter'
    } else if (!/[a-z]/.test(formData.password)) {
      errors.password = lang === 'ar'
        ? 'يجب أن تحتوي على حرف صغير واحد على الأقل'
        : 'Must contain at least one lowercase letter'
    } else if (!/[0-9]/.test(formData.password)) {
      errors.password = lang === 'ar'
        ? 'يجب أن تحتوي على رقم واحد على الأقل'
        : 'Must contain at least one number'
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = lang === 'ar'
        ? 'كلمتا المرور غير متطابقتين'
        : 'Passwords do not match'
    }
    if (!formData.termsAccepted) {
      errors.termsAccepted = lang === 'ar'
        ? 'يجب قبول الشروط والأحكام'
        : 'You must accept the Terms and Conditions'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData, lang, setFieldErrors])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!validateForm()) return
    setLoading(true)
    try {
      let phoneDigits = formData.phoneNumber.replace(/\D/g, '')
      let normalizedPhone = phoneDigits.startsWith('966')
        ? '+' + phoneDigits
        : phoneDigits.startsWith('05')
          ? '+966' + phoneDigits.slice(1)
          : '+966' + phoneDigits
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: normalizedPhone,
        nationalId: formData.nationalId,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: formData.role,
        termsAccepted: true
      }
      const res = await fetchJson('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': lang
        },
        body: JSON.stringify(payload)
      })
      if (!res || !res.token) throw new Error('Invalid response from server')
      setToken(res.token)
      const userRole = (res.user?.role || 'INVESTOR').toUpperCase()
      localStorage.setItem('role', userRole.toLowerCase())
      localStorage.setItem('userId', res.user?.id || '')
      localStorage.setItem('userName', res.user?.fullName || res.user?.email || '')
      const redirectUrl = userRole === 'ADMIN' ? '/admin/overview'
        : userRole === 'OWNER' ? '/owner/dashboard'
          : '/investor/dashboard'
      navigate(redirectUrl)
    } catch (err) {
      console.error('Registration error:', err)
      if (err.status === 409) {
        const field = err.error?.field || 'email'
        setFieldErrors(prev => ({
          ...prev,
          [field]: err.message || (lang === 'ar' ? 'هذا البيان مسجل مسبقاً' : 'This information is already registered')
        }))
      } else if (err.status === 429) {
        setError(lang === 'ar' ? 'عدد محاولات كثيرة. يرجى المحاولة لاحقاً.' : 'Too many attempts. Please try again later.')
      } else {
        setError(err.message || (lang === 'ar' ? 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.' : 'Registration failed. Please try again.'))
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-2 sm:px-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="text-emerald-600" size={40} />
            <span className="text-3xl font-bold text-gray-900">ALWASM</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {lang === 'ar' ? 'إنشاء حساب جديد' : 'Create New Account'}
          </h1>
          <p className="text-gray-600">
            {lang === 'ar'
              ? 'انضم إلى الوسم وابدأ استثمارك العقاري بثقة وأمان'
              : 'Join ALWASM and start your real estate investment journey with confidence'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            <InputField icon={User} label={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'} name="fullName" placeholder={lang === 'ar' ? 'محمد أحمد' : 'John Smith'} />
            <InputField icon={Mail} label={lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'} name="email" type="email" placeholder="you@example.com" />
            <InputField icon={Phone} label={lang === 'ar' ? 'رقم الجوال' : 'Phone Number'} name="phoneNumber" placeholder="05XXXXXXXX" hint={lang === 'ar' ? 'رقم جوال سعودي (مثال: 05XXXXXXXX)' : 'Saudi mobile number (e.g., 05XXXXXXXX)'} maxLength={14} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang === 'ar' ? 'رقم الهوية الوطنية / الإقامة' : 'National ID / Iqama'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CreditCard className="text-gray-400" size={20} />
                </div>
                <input
                  type="text"
                  name="nationalId"
                  value={formData.nationalId || ''}
                  onChange={handleInputChange}
                  maxLength={10}
                  key="nationalId"
                  className={`border ${fieldErrors.nationalId ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'} rounded-lg w-full pl-10 pr-4 py-3 focus:ring-2 transition-colors block text-sm font-medium text-gray-700`}
                  placeholder="1XXXXXXXXX"
                  required
                />
              </div>
              {fieldErrors.nationalId && <p className="mt-1 text-sm text-red-600">{fieldErrors.nationalId}</p>}
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
                <Shield className="text-blue-500 flex-shrink-0" size={18} />
                <p className="text-xs text-blue-700">
                  {lang === 'ar'
                    ? 'رقم الهوية مطلوب للتحقق من هويتك وفقاً لأنظمة مكافحة غسل الأموال ومعايير PDPL السعودية. يتم تخزينه بشكل آمن ومشفر.'
                    : 'National ID is required for identity verification per Saudi AML regulations and PDPL standards. Stored securely and encrypted.'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang === 'ar' ? 'كلمة المرور' : 'Password'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={20} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password || ''}
                  onChange={handleInputChange}
                  key="password"
                  className={`border ${fieldErrors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'} rounded-lg w-full pl-10 pr-12 py-3 focus:ring-2 transition-colors block text-sm font-medium text-gray-700`}
                  placeholder={lang === 'ar' ? '10 أحرف على الأقل' : 'Min. 10 characters'}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {showPassword ? <EyeOff className="text-gray-400" size={20} /> : <Eye className="text-gray-400" size={20} />}
                </button>
              </div>
              {fieldErrors.password && <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>}
              {!fieldErrors.password && (
                <p className="mt-1 text-xs text-gray-500">
                  {lang === 'ar'
                    ? '10 أحرف على الأقل: حرف كبير، حرف صغير، رقم'
                    : 'Min. 10 characters: uppercase, lowercase, number'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={20} />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword || ''}
                  onChange={handleInputChange}
                  key="confirmPassword"
                  className={`border ${fieldErrors.confirmPassword ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'} rounded-lg w-full pl-10 pr-12 py-3 focus:ring-2 transition-colors block text-sm font-medium text-gray-700`}
                  placeholder={lang === 'ar' ? 'أعد كتابة كلمة المرور' : 'Re-enter password'}
                  required
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {showConfirmPassword ? <EyeOff className="text-gray-400" size={20} /> : <Eye className="text-gray-400" size={20} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>}
            </div>

            <div className={`p-4 border ${fieldErrors.termsAccepted ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-lg`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={formData.termsAccepted || false}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <div className="text-sm">
                  <span className="text-gray-700">
                    {lang === 'ar' ? 'أقر بأنني قد قرأت ووافقت على ' : 'I have read and agree to the '}
                  </span>
                  <button type="button" onClick={() => navigate('/terms')} className="text-emerald-600 hover:text-emerald-700 font-medium">
                    {lang === 'ar' ? 'الشروط والأحكام' : 'Terms and Conditions'}
                  </button>
                  <span className="text-gray-700"> {lang === 'ar' ? 'و' : 'and '}</span>
                  <button type="button" onClick={() => navigate('/privacy')} className="text-emerald-600 hover:text-emerald-700 font-medium">
                    {lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                  </button>
                  <span className="text-red-500"> *</span>
                </div>
              </label>
              {fieldErrors.termsAccepted && <p className="mt-2 text-sm text-red-600">{fieldErrors.termsAccepted}</p>}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2" role="alert">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-3 font-semibold transition-colors">
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>{lang === 'ar' ? 'جاري إنشاء الحساب...' : 'Creating account...'}</span>
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  <span>{lang === 'ar' ? 'إنشاء حساب' : 'Create Account'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            {lang === 'ar' ? 'لديك حساب مسبقاً؟ ' : 'Already have an account? '}
            <button onClick={() => navigate('/login')} className="text-emerald-600 hover:text-emerald-700 font-medium">
              {lang === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
            </button>
          </p>
        </div>

        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
            <Shield className="text-emerald-600" size={16} />
            <span className="text-xs text-gray-600">
              {lang === 'ar' ? 'نلتزم بمعايير حماية البيانات الشخصية PDPL' : 'PDPL compliant - Your data is protected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})

export default function Signup() {
  return (
    <FormProvider
      initialValues={{
        fullName: '',
        email: '',
        phoneNumber: '',
        nationalId: '',
        password: '',
        confirmPassword: '',
        role: 'INVESTOR',
        termsAccepted: false
      }}
    >
      <SignupForm />
    </FormProvider>
  )
}