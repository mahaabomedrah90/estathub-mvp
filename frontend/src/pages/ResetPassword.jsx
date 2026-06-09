import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, Loader2, Check, X } from 'lucide-react'

const RULES = [
  { key: 'length',    label: '10 أحرف على الأقل',  test: p => p.length >= 10 },
  { key: 'upper',     label: 'حرف كبير',             test: p => /[A-Z]/.test(p) },
  { key: 'lower',     label: 'حرف صغير',             test: p => /[a-z]/.test(p) },
  { key: 'number',    label: 'رقم',                  test: p => /[0-9]/.test(p) },
  { key: 'special',   label: 'رمز خاص',              test: p => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
]

function RuleRow({ met, label }) {
  return (
    <div className="flex items-center gap-2">
      {met
        ? <Check size={13} className="text-emerald-500 shrink-0" />
        : <X size={13} className="text-gray-400 shrink-0" />}
      <span className={`text-xs ${met ? 'text-emerald-600' : 'text-gray-400'}`}>{label}</span>
    </div>
  )
}

function PasswordField({ id, label, value, onChange, show, onToggle, placeholder, error }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-text-body mb-2">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <Lock className="text-gray-400" size={17} />
        </div>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={id === 'password' ? 'new-password' : 'new-password'}
          className={`border rounded-xl w-full pr-10 pl-11 py-3 bg-surface-base focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors text-sm ${
            error ? 'border-red-400' : 'border-border-soft'
          }`}
          placeholder={placeholder}
          required
          dir="ltr"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
          aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [token, setToken]               = useState('')
  const [password, setPassword]         = useState('')
  const [confirmPassword, setConfirm]   = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const [isSuccess, setIsSuccess]       = useState(false)
  const [tokenValid, setTokenValid]     = useState(true)

  // per-field errors
  const [passwordError, setPasswordError]   = useState('')
  const [confirmError, setConfirmError]     = useState('')
  const [generalError, setGeneralError]     = useState('')
  const [expiredError, setExpiredError]     = useState(false)

  useEffect(() => {
    const t = searchParams.get('token')
    if (!t) {
      setTokenValid(false)
    } else {
      setToken(t)
    }
  }, [searchParams])

  // Auto-redirect to login after success
  useEffect(() => {
    if (!isSuccess) return
    const timer = setTimeout(() => navigate('/login', { replace: true }), 3500)
    return () => clearTimeout(timer)
  }, [isSuccess, navigate])

  const rulesMet = RULES.map(r => r.test(password))
  const allRulesMet = rulesMet.every(Boolean)
  const passwordTouched = password.length > 0

  function clearErrors() {
    setPasswordError('')
    setConfirmError('')
    setGeneralError('')
    setExpiredError(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    clearErrors()

    // Client-side validation
    if (!allRulesMet) {
      setPasswordError('كلمة المرور لا تستوفي المتطلبات أدناه.')
      return
    }
    if (password !== confirmPassword) {
      setConfirmError('كلمتا المرور غير متطابقتين.')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': 'ar' },
        body: JSON.stringify({ token, password, confirmPassword }),
      })
      const data = await res.json()

      if (res.ok) {
        setIsSuccess(true)
        return
      }

      if (data.error === 'expired_token') {
        setExpiredError(true)
        return
      }
      if (data.error === 'invalid_token') {
        setTokenValid(false)
        return
      }
      if (data.error === 'password_mismatch') {
        setConfirmError('كلمتا المرور غير متطابقتين.')
        return
      }
      if (data.error === 'password_validation_failed') {
        const msgs = Array.isArray(data.messages) ? data.messages : []
        setPasswordError(msgs.join(' — ') || 'كلمة المرور لا تستوفي المتطلبات.')
        return
      }

      setGeneralError(data.message || 'فشل إعادة تعيين كلمة المرور. حاول مرة أخرى.')
    } catch {
      setGeneralError('فشل الاتصال بالخادم. تحقق من اتصالك وحاول مرة أخرى.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Invalid link ──────────────────────────────────────────────────────────
  if (!tokenValid) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4" dir="rtl">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-strong mb-2">رابط غير صالح</h2>
            <p className="text-text-muted leading-relaxed">
              رابط إعادة تعيين كلمة المرور غير صالح. يرجى طلب رابط جديد.
            </p>
          </div>
          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-accent text-white rounded-full font-semibold hover:bg-brand-accent/90 transition-colors shadow-lg"
          >
            طلب رابط جديد
          </Link>
        </div>
      </div>
    )
  }

  // ── Expired token ─────────────────────────────────────────────────────────
  if (expiredError) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4" dir="rtl">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-strong mb-2">انتهت صلاحية الرابط</h2>
            <p className="text-text-muted leading-relaxed">
              انتهت صلاحية رابط إعادة تعيين كلمة المرور. يرجى طلب رابط جديد.
            </p>
          </div>
          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-accent text-white rounded-full font-semibold hover:bg-brand-accent/90 transition-colors shadow-lg"
          >
            طلب رابط جديد
          </Link>
        </div>
      </div>
    )
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4" dir="rtl">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-strong mb-2">تم إعادة التعيين بنجاح</h2>
            <p className="text-text-muted leading-relaxed">
              تم إعادة تعيين كلمة المرور بنجاح. سيتم توجيهك لصفحة تسجيل الدخول.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-accent text-white rounded-full font-semibold hover:bg-brand-accent/90 transition-colors shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            تسجيل الدخول
          </Link>
        </div>
      </div>
    )
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  const canSubmit = !isLoading && password && confirmPassword && allRulesMet && password === confirmPassword

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 pb-8" dir="rtl">
      <div className="w-full max-w-md">

        {/* Brand Header */}
        <div className="text-center py-8 bg-brand-primary rounded-2xl mb-5">
          <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-brand-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">إعادة تعيين كلمة المرور</h1>
          <p className="text-white/70 text-sm">أدخل كلمة المرور الجديدة</p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* New Password */}
            <div className="space-y-3">
              <PasswordField
                id="password"
                label="كلمة المرور الجديدة"
                value={password}
                onChange={e => { setPassword(e.target.value); setPasswordError('') }}
                show={showPassword}
                onToggle={() => setShowPassword(v => !v)}
                placeholder="أدخل كلمة المرور الجديدة"
                error={passwordError}
              />

              {/* Requirements checklist — visible once user starts typing */}
              {passwordTouched && (
                <div className="bg-gray-50 border border-border-soft rounded-xl p-3 space-y-1.5">
                  {RULES.map((r, i) => (
                    <RuleRow key={r.key} met={rulesMet[i]} label={r.label} />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <PasswordField
              id="confirmPassword"
              label="تأكيد كلمة المرور"
              value={confirmPassword}
              onChange={e => { setConfirm(e.target.value); setConfirmError('') }}
              show={showConfirm}
              onToggle={() => setShowConfirm(v => !v)}
              placeholder="أعد إدخال كلمة المرور"
              error={confirmError}
            />

            {/* General error */}
            {generalError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{generalError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3.5 font-semibold transition-colors shadow-md text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={17} />
                  <span>جاري إعادة التعيين...</span>
                </>
              ) : (
                <span>إعادة تعيين كلمة المرور</span>
              )}
            </button>
          </form>

          <div className="text-center pt-1">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-brand-accent hover:text-brand-accent/80 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              العودة لتسجيل الدخول
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
