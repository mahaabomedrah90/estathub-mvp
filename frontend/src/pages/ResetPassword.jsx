import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, Loader2, Check, X } from 'lucide-react'

// ─── Password rules (mirrors backend validators.ts) ──────────────────────────
const RULES = [
  { id: 'length',  label: '10 أحرف على الأقل',  test: p => p.length >= 10 },
  { id: 'upper',   label: 'حرف كبير (A–Z)',       test: p => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'حرف صغير (a–z)',       test: p => /[a-z]/.test(p) },
  { id: 'number',  label: 'رقم (0–9)',            test: p => /[0-9]/.test(p) },
  { id: 'special', label: 'رمز خاص (!@#$…)',      test: p => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function RuleItem({ met, label }) {
  return (
    <div className="flex items-center gap-2">
      {met
        ? <Check size={12} className="text-emerald-500 shrink-0" strokeWidth={3} />
        : <X    size={12} className="text-gray-350 shrink-0"    strokeWidth={2.5} />}
      <span className={`text-xs leading-tight ${met ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  )
}

function PasswordInput({ id, label, value, onChange, show, onToggle, placeholder, error, autoComplete }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-text-body mb-2">
        {label}
      </label>
      <div className="relative">
        {/* Lock icon — right side in RTL */}
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
          <Lock size={16} className="text-gray-400" />
        </div>

        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete || 'new-password'}
          dir="ltr"
          className={`w-full rounded-xl border py-3.5 pr-10 pl-11 text-sm bg-surface-base
            focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent
            transition-colors placeholder:text-gray-400
            ${error ? 'border-red-400 bg-red-50/30' : 'border-border-soft'}
          `}
          placeholder={placeholder}
          required
        />

        {/* Eye toggle — left side in RTL layout */}
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          className="absolute inset-y-0 left-3 flex items-center text-gray-400
            hover:text-brand-accent transition-colors"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle size={12} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResetPassword() {
  const [searchParams]  = useSearchParams()
  const navigate        = useNavigate()

  const [token, setToken]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPass, setShowPass]       = useState(false)
  const [showConf, setShowConf]       = useState(false)
  const [isLoading, setIsLoading]     = useState(false)
  const [state, setState]             = useState('form') // 'form' | 'success' | 'invalid' | 'expired'

  const [passError, setPassError]     = useState('')
  const [confError, setConfError]     = useState('')
  const [generalError, setGeneralError] = useState('')

  // ── Extract token from URL once on mount ───────────────────────────────────
  useEffect(() => {
    // Trim whitespace: some email clients or line-wrap rules add trailing spaces
    const raw = searchParams.get('token')
    const t   = raw ? raw.trim() : ''
    if (!t) {
      setState('invalid')
    } else {
      setToken(t)
    }
  }, [searchParams])

  // ── Auto-navigate to login after success ───────────────────────────────────
  useEffect(() => {
    if (state !== 'success') return
    const id = setTimeout(() => navigate('/login', { replace: true }), 4000)
    return () => clearTimeout(id)
  }, [state, navigate])

  // ── Derived validation state ───────────────────────────────────────────────
  const ruleResults  = RULES.map(r => r.test(password))
  const allRulesMet  = ruleResults.every(Boolean)
  const hasTouched   = password.length > 0
  const canSubmit    = !isLoading && token && allRulesMet && password === confirm

  // ── Submit handler ─────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setPassError('')
    setConfError('')
    setGeneralError('')

    // Client-side guard — prevents unnecessary round-trip
    if (!allRulesMet) {
      setPassError('كلمة المرور لا تستوفي المتطلبات المذكورة أدناه.')
      return
    }
    if (password !== confirm) {
      setConfError('كلمتا المرور غير متطابقتين.')
      return
    }

    setIsLoading(true)
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': 'ar' },
        body:    JSON.stringify({ token, password, confirmPassword: confirm }),
      })

      // Network gave us a response — parse JSON
      let data = {}
      try { data = await res.json() } catch { /* non-JSON body (e.g. ALB 504 HTML) */ }

      if (res.ok) {
        setState('success')
        return
      }

      // Map backend error codes → Arabic UX
      const code = data?.error || ''

      if (code === 'invalid_or_expired_token') {
        // Show the best possible message given a single error code
        setGeneralError('رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.')
        return
      }
      if (code === 'password_mismatch') {
        setConfError('كلمتا المرور غير متطابقتين.')
        return
      }
      if (code === 'password_validation_failed') {
        const msgs = Array.isArray(data.messages) ? data.messages : []
        setPassError(msgs.join(' — ') || 'كلمة المرور لا تستوفي المتطلبات.')
        return
      }
      if (code === 'missing_required_fields') {
        setGeneralError('حدث خطأ في قراءة الرابط. يرجى طلب رابط جديد.')
        return
      }

      // 5xx or unexpected
      setGeneralError(
        res.status >= 500
          ? 'حدث خطأ غير متوقع في الخادم. حاول مرة أخرى.'
          : (data.message || 'فشل إعادة تعيين كلمة المرور. حاول مرة أخرى.')
      )

    } catch {
      // true network error (offline, DNS, TLS)
      setGeneralError('تعذر الاتصال بالخادم. تحقق من اتصالك وحاول مرة أخرى.')
    } finally {
      setIsLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render states
  // ─────────────────────────────────────────────────────────────────────────

  if (state === 'invalid' || state === 'expired') {
    return (
      <div
        dir="rtl"
        className="min-h-[calc(100vh-180px)] flex items-center justify-center px-4 py-12"
      >
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-strong mb-3">
              {state === 'expired' ? 'انتهت صلاحية الرابط' : 'رابط غير صالح'}
            </h2>
            <p className="text-text-muted leading-relaxed text-sm">
              {state === 'expired'
                ? 'انتهت صلاحية رابط إعادة تعيين كلمة المرور، يرجى طلب رابط جديد.'
                : 'رابط إعادة تعيين كلمة المرور غير صالح. يرجى طلب رابط جديد.'}
            </p>
          </div>
          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center gap-2 w-full max-w-xs mx-auto
              px-6 py-3.5 rounded-xl font-semibold text-white transition-colors shadow-md
              bg-brand-accent hover:bg-brand-accent/90"
          >
            طلب رابط جديد
          </Link>
          <div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-brand-accent hover:text-brand-accent/80 transition-colors"
            >
              <ArrowLeft size={14} />
              العودة لتسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div
        dir="rtl"
        className="min-h-[calc(100vh-180px)] flex items-center justify-center px-4 py-12"
      >
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-strong mb-3">
              تم إعادة التعيين بنجاح
            </h2>
            <p className="text-text-muted leading-relaxed text-sm">
              تم تحديث كلمة المرور بنجاح. سيتم توجيهك لصفحة تسجيل الدخول تلقائياً.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 w-full max-w-xs mx-auto
              px-6 py-3.5 rounded-xl font-semibold text-white transition-colors shadow-md
              bg-brand-accent hover:bg-brand-accent/90"
          >
            <ArrowLeft size={16} />
            تسجيل الدخول الآن
          </Link>
        </div>
      </div>
    )
  }

  // ─── Main form ─────────────────────────────────────────────────────────────
  return (
    <div
      dir="rtl"
      className="min-h-[calc(100vh-180px)] flex items-center justify-center px-4 pb-10 pt-8"
    >
      <div className="w-full max-w-md">

        {/* Brand header */}
        <div className="text-center py-8 bg-brand-primary rounded-2xl mb-5 px-6">
          <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-brand-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1.5">إعادة تعيين كلمة المرور</h1>
          <p className="text-white/70 text-sm">أدخل كلمة مرور جديدة لحسابك</p>
        </div>

        {/* Form card */}
        <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* New password */}
            <div className="space-y-2.5">
              <PasswordInput
                id="password"
                label="كلمة المرور الجديدة"
                value={password}
                onChange={e => { setPassword(e.target.value); setPassError('') }}
                show={showPass}
                onToggle={() => setShowPass(v => !v)}
                placeholder="أدخل كلمة مرور قوية"
                error={passError}
                autoComplete="new-password"
              />

              {/* Requirements checklist — appears as soon as user starts typing */}
              {hasTouched && (
                <div className="rounded-xl border border-border-soft bg-gray-50 px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-2">
                  {RULES.map((r, i) => (
                    <RuleItem key={r.id} met={ruleResults[i]} label={r.label} />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <PasswordInput
              id="confirm"
              label="تأكيد كلمة المرور"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setConfError('') }}
              show={showConf}
              onToggle={() => setShowConf(v => !v)}
              placeholder="أعد كتابة كلمة المرور"
              error={confError}
              autoComplete="new-password"
            />

            {/* General / server error */}
            {generalError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700"
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Submit — full width, large touch target */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-4 px-4
                font-semibold text-white text-sm transition-all shadow-md
                bg-brand-accent hover:bg-brand-accent/90
                disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isLoading
                ? <><Loader2 size={18} className="animate-spin" /><span>جاري إعادة التعيين...</span></>
                : <span>تأكيد كلمة المرور الجديدة</span>
              }
            </button>

          </form>

          <div className="mt-5 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-brand-accent
                hover:text-brand-accent/80 font-medium transition-colors"
            >
              <ArrowLeft size={14} />
              العودة لتسجيل الدخول
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
