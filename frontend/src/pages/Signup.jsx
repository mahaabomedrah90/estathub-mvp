import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  Shield,
  TrendingUp
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

const InputField = React.memo(({ icon: Icon, label, name, type = 'text', placeholder, hint, maxLength }) => {
  const { formData, handleInputChange, fieldErrors } = useFormContext()
  const { i18n } = useTranslation('pages')
  const isRtl = i18n.dir() === 'rtl'
  
  return (
    <div>
      <label className="block text-sm font-medium text-text-body mb-2">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
          <Icon className="text-text-muted" size={20} />
        </div>
        <input
          type={type}
          name={name}
          value={formData[name] || ''}
          onChange={handleInputChange}
          maxLength={maxLength}
          className={`border ${fieldErrors[name] ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-border-soft focus:ring-brand-accent focus:border-brand-accent'} rounded-xl w-full ${isRtl ? 'pl-4 pr-10' : 'pl-10 pr-4'} py-3 focus:ring-2 transition-colors bg-surface-base text-sm font-medium text-text-body`}
          placeholder={placeholder}
          required
        />
      </div>
      {fieldErrors[name] && <p className="mt-2 text-sm text-red-600">{fieldErrors[name]}</p>}
      {hint && !fieldErrors[name] && <p className="mt-2 text-sm text-text-muted">{hint}</p>}
    </div>
  )
})

const SignupForm = React.memo(() => {
  const { formData, handleInputChange, fieldErrors, setFieldErrors } = useFormContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [verificationPending, setVerificationPending] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { i18n } = useTranslation('pages')
  const isRtl = i18n.dir() === 'rtl'
  const lang = i18n.language

  // Read role from query params and validate it's safe for public signup
  useEffect(() => {
    const roleParam = searchParams.get('role')
    const safeRole = roleParam === 'OWNER' ? 'OWNER' : 'INVESTOR' // Default to INVESTOR, only allow OWNER
    
    if (formData.role !== safeRole) {
      handleInputChange({
        target: { name: 'role', value: safeRole }
      })
    }
  }, [searchParams, formData.role, handleInputChange])

  const getRoleInfo = () => {
    const role = formData.role || 'INVESTOR'
    return {
      title: lang === 'ar' ? (role === 'OWNER' ? 'مالك عقار' : 'مستثمر') : (role === 'OWNER' ? 'Property Owner' : 'Investor'),
      description: lang === 'ar' 
        ? (role === 'OWNER' ? 'أنت تسجل كمالك عقاري' : 'أنت تسجل كمستثمر')
        : (role === 'OWNER' ? 'You are signing up as a Property Owner' : 'You are signing up as an Investor'),
      icon: role === 'OWNER' ? Building2 : TrendingUp,
      color: role === 'OWNER' ? 'text-vision-purple' : 'text-brand-accent'
    }
  }

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
    
    // SAFETY: Prevent admin role in public signup
    if (formData.role === 'ADMIN') {
      setError(lang === 'ar' 
        ? 'غير مسموح بالتسجيل كمسؤول في التسجيل العام' 
        : 'Admin registration is not allowed in public signup')
      return
    }
    
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
      if (!res) throw new Error('Invalid response from server')
      if (res.requiresVerification) {
        setVerificationPending(true)
        setLoading(false)
        return
      }
      if (!res.token) throw new Error('Invalid response from server')
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

  // ✅ Normalize status + safe message (works with axios/fetch/custom errors)
  const status =
    err?.status ??
    err?.response?.status ??
    err?.error?.status ??
    null

  // fetchJson throws with err.data = parsed JSON body; check it first
  const serverMessage =
    err?.data?.message ??
    err?.response?.data?.message ??
    err?.error?.message ??
    null

  const isSafeText = (s) =>
    typeof s === 'string' &&
    s.length <= 160 &&
    !/http|<\/?html|<Error>|AccessDenied|Non-JSON|stack|trace|cloudfront|s3/i.test(s)

  const safeMessage = isSafeText(serverMessage) ? serverMessage : null

  if (status === 503) {
    setError(
      safeMessage ||
      (lang === 'ar'
        ? 'المنصة تحت الصيانة حالياً'
        : 'Platform is currently under maintenance')
    )
  } else if (status === 403 && err?.data?.error === 'registration_disabled') {
    setError(
      safeMessage ||
      (lang === 'ar'
        ? 'التسجيل غير متاح حالياً'
        : 'Registration is currently unavailable')
    )
  } else if (status === 409) {
    // ✅ conflict field error (email/phone/nationalId)
    const field =
      err?.response?.data?.field ??
      err?.error?.field ??
      'email'

    setFieldErrors(prev => ({
      ...prev,
      [field]:
        safeMessage ||
        (lang === 'ar'
          ? 'هذا البيان مسجل مسبقاً'
          : 'This information is already registered')
    }))

  } else if (status === 429) {
    setError(
      lang === 'ar'
        ? 'عدد محاولات كثيرة. يرجى المحاولة لاحقاً.'
        : 'Too many attempts. Please try again later.'
    )

  } else {
    // ✅ generic and clean
    setError(
      safeMessage ||
      (lang === 'ar'
        ? 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.'
        : 'Registration failed. Please try again.')
    )
  }

  setLoading(false)
}
  }

  if (verificationPending) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface-card border border-border-soft rounded-2xl shadow-card p-10 text-center">
          <div className="w-16 h-16 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="text-brand-accent" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-text-strong mb-3">
            {lang === 'ar' ? 'تحقق من بريدك الإلكتروني' : 'Check your email'}
          </h2>
          <p className="text-text-body text-sm leading-relaxed mb-6">
            {lang === 'ar'
              ? 'تم إنشاء الحساب. يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول. تحقق من صندوق الوارد وانقر على رابط التأكيد.'
              : 'Account created. Please verify your email address before signing in. Check your inbox and click the verification link.'}
          </p>
          <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-xl p-4 mb-6 text-xs text-text-muted">
            {lang === 'ar'
              ? 'الرابط صالح لمدة 24 ساعة. إذا لم تجد الرسالة، تحقق من مجلد البريد غير المرغوب فيه.'
              : 'The link is valid for 24 hours. If you do not see the email, check your spam folder.'}
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {lang === 'ar' ? 'الانتقال إلى تسجيل الدخول' : 'Go to Login'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Full-width header — matches Login page pattern */}
      <div className="bg-brand-primary text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserPlus className="text-brand-accent" size={28} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">
              {lang === 'ar' ? 'إنشاء حساب جديد' : 'Create New Account'}
            </h1>
            <p className="text-white/80 text-lg leading-relaxed max-w-2xl mx-auto mb-6">
              {lang === 'ar'
                ? 'انضم إلى الوسم وابدأ استثمارك العقاري بثقة وأمان'
                : 'Join ALWASM and start your real estate investment journey with confidence'}
            </p>
            {/* Role badge */}
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
              {React.createElement(getRoleInfo().icon, {
                className: `${getRoleInfo().color} flex-shrink-0`,
                size: 18
              })}
              <div className="text-start">
                <span className="text-white font-semibold text-sm">{getRoleInfo().title}</span>
                <span className="text-white/70 text-xs mx-2">—</span>
                <span className="text-white/70 text-xs">{getRoleInfo().description}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex items-center justify-center py-6">
        <div className="w-full max-w-lg mx-auto px-4">
        <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-10">
          <form onSubmit={onSubmit} className="space-y-7">
            <InputField icon={User} label={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'} name="fullName" placeholder={lang === 'ar' ? 'محمد أحمد' : 'John Smith'} />
            <InputField icon={Mail} label={lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'} name="email" type="email" placeholder="you@example.com" />
            <InputField icon={Phone} label={lang === 'ar' ? 'رقم الجوال' : 'Phone Number'} name="phoneNumber" placeholder="05XXXXXXXX" hint={lang === 'ar' ? 'رقم جوال سعودي (مثال: 05XXXXXXXX)' : 'Saudi mobile number (e.g., 05XXXXXXXX)'} maxLength={14} />

            <div>
              <label className="block text-sm font-medium text-text-body mb-2">
                {lang === 'ar' ? 'رقم الهوية الوطنية / الإقامة' : 'National ID / Iqama'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  <CreditCard className="text-text-muted" size={20} />
                </div>
                <input
                  type="text"
                  name="nationalId"
                  value={formData.nationalId || ''}
                  onChange={handleInputChange}
                  maxLength={10}
                  key="nationalId"
                  className={`border ${fieldErrors.nationalId ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-border-soft focus:ring-brand-accent focus:border-brand-accent'} rounded-xl w-full ${isRtl ? 'pl-4 pr-10' : 'pl-10 pr-4'} py-3 focus:ring-2 transition-colors bg-surface-base text-sm font-medium text-text-body`}
                  placeholder="1XXXXXXXXX"
                  required
                />
              </div>
              {fieldErrors.nationalId && <p className="mt-2 text-sm text-red-600">{fieldErrors.nationalId}</p>}
              <div className="mt-3 p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-xl flex gap-3">
                <Shield className="text-brand-primary flex-shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-brand-primary leading-relaxed">
                  {lang === 'ar'
                    ? 'رقم الهوية مطلوب للتحقق من هويتك وفقاً لأنظمة مكافحة غسل الأموال ومعايير PDPL السعودية. يتم تخزينه بشكل آمن ومشفر.'
                    : 'National ID is required for identity verification per Saudi AML regulations and PDPL standards. Stored securely and encrypted.'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-body mb-2">
                {lang === 'ar' ? 'كلمة المرور' : 'Password'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  <Lock className="text-text-muted" size={20} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password || ''}
                  onChange={handleInputChange}
                  key="password"
                  className={`border ${fieldErrors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-border-soft focus:ring-brand-accent focus:border-brand-accent'} rounded-xl w-full ${isRtl ? 'pl-4 pr-12' : 'pl-10 pr-12'} py-3 focus:ring-2 transition-colors bg-surface-base text-sm font-medium text-text-body`}
                  placeholder={lang === 'ar' ? '10 أحرف على الأقل' : 'Min. 10 characters'}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute inset-y-0 ${isRtl ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center`}>
                  {showPassword ? <Eye className="text-text-muted" size={20} /> : <EyeOff className="text-text-muted" size={20} />}
                </button>
              </div>
              {fieldErrors.password && <p className="mt-2 text-sm text-red-600">{fieldErrors.password}</p>}
              {!fieldErrors.password && (
                <p className="mt-2 text-xs text-text-muted">
                  {lang === 'ar'
                    ? '10 أحرف على الأقل: حرف كبير، حرف صغير، رقم'
                    : 'Min. 10 characters: uppercase, lowercase, number'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-body mb-2">
                {lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  <Lock className="text-text-muted" size={20} />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword || ''}
                  onChange={handleInputChange}
                  key="confirmPassword"
                  className={`border ${fieldErrors.confirmPassword ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-border-soft focus:ring-brand-accent focus:border-brand-accent'} rounded-xl w-full ${isRtl ? 'pl-4 pr-12' : 'pl-10 pr-12'} py-3 focus:ring-2 transition-colors bg-surface-base text-sm font-medium text-text-body`}
                  placeholder={lang === 'ar' ? 'أعد كتابة كلمة المرور' : 'Re-enter password'}
                  required
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className={`absolute inset-y-0 ${isRtl ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center`}>
                  {showConfirmPassword ? <Eye className="text-text-muted" size={20} /> : <EyeOff className="text-text-muted" size={20} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <p className="mt-2 text-sm text-red-600">{fieldErrors.confirmPassword}</p>}
            </div>

            <div className={`p-4 border ${fieldErrors.termsAccepted ? 'border-red-500 bg-red-50' : 'border-border-soft'} rounded-xl`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={formData.termsAccepted || false}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-brand-accent focus:ring-brand-accent border-border-soft rounded"
                />
                <div className="text-sm">
                  <span className="text-text-body">
                    {lang === 'ar' ? 'أقر بأنني قد قرأت ووافقت على ' : 'I have read and agree to the '}
                  </span>
                  <button type="button" onClick={() => navigate('/terms')} className="text-brand-accent hover:text-brand-accent/90 font-medium">
                    {lang === 'ar' ? 'الشروط والأحكام' : 'Terms and Conditions'}
                  </button>
                  <span className="text-text-body"> {lang === 'ar' ? 'و' : 'and '}</span>
                  <button type="button" onClick={() => navigate('/privacy')} className="text-brand-accent hover:text-brand-accent/90 font-medium">
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

            <div className="mt-3">
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-accent hover:bg-brand-accent/90 hover:scale-[1.02] active:scale-95 disabled:bg-surface-muted disabled:cursor-not-allowed text-white px-4 py-3 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl">
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
            </div>
          </form>
        </div>

        <div className="mt-8 text-center text-sm text-text-muted">
          <p>
            {lang === 'ar' ? 'لديك حساب مسبقاً؟ ' : 'Already have an account? '}
            <button onClick={() => navigate('/login')} className="text-brand-accent hover:text-brand-accent/90 font-medium">
              {lang === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
            </button>
          </p>
        </div>

        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-muted rounded-full border border-border-soft shadow-sm">
            <Shield className="text-brand-accent" size={16} />
            <span className="text-xs text-text-muted">
              {lang === 'ar' ? 'نلتزم بمعايير حماية البيانات الشخصية PDPL' : 'PDPL compliant - Your data is protected'}
            </span>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
})

export default function Signup() {
  const [searchParams] = useSearchParams()
  
  // Determine initial role from query params, default to INVESTOR, only allow OWNER for public
  const getInitialRole = () => {
    const roleParam = searchParams.get('role')
    return roleParam === 'OWNER' ? 'OWNER' : 'INVESTOR'
  }
  
  return (
    <FormProvider
      initialValues={{
        fullName: '',
        email: '',
        phoneNumber: '',
        nationalId: '',
        password: '',
        confirmPassword: '',
        role: getInitialRole(),
        termsAccepted: false
      }}
    >
      <SignupForm />
    </FormProvider>
  )
}