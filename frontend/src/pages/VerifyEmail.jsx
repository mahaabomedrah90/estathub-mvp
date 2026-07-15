import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { fetchJson } from '../lib/api'
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { i18n } = useTranslation('pages')
  const lang = i18n.language
  const isRtl = i18n.dir() === 'rtl'

  const [status, setStatus] = useState('loading') // loading | success | already | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage(lang === 'ar' ? 'رابط التحقق غير صالح.' : 'Invalid verification link.')
      return
    }

    fetchJson(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(res => {
        if (res.alreadyVerified) {
          setStatus('already')
          setMessage(res.message || (lang === 'ar' ? 'البريد الإلكتروني مؤكد مسبقاً.' : 'Email already verified.'))
        } else {
          setStatus('success')
          setMessage(res.message || (lang === 'ar' ? 'تم تأكيد البريد الإلكتروني بنجاح.' : 'Email verified successfully.'))
        }
      })
      .catch(err => {
        setStatus('error')
        const msg = err?.data?.message || ''
        setMessage(msg || (lang === 'ar' ? 'الرابط غير صالح أو منتهي الصلاحية.' : 'The link is invalid or has expired.'))
      })
  }, [])

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center px-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md bg-surface-card border border-border-soft rounded-2xl shadow-card p-10 text-center">

        {status === 'loading' && (
          <>
            <Loader2 className="animate-spin text-brand-accent mx-auto mb-6" size={48} />
            <p className="text-text-body text-sm">
              {lang === 'ar' ? 'جاري التحقق...' : 'Verifying your email...'}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-green-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-text-strong mb-3">
              {lang === 'ar' ? 'تم التأكيد بنجاح' : 'Email Verified'}
            </h2>
            <p className="text-text-body text-sm mb-6">{message}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
            </button>
          </>
        )}

        {status === 'already' && (
          <>
            <div className="w-16 h-16 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-brand-accent" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-text-strong mb-3">
              {lang === 'ar' ? 'البريد الإلكتروني مؤكد' : 'Already Verified'}
            </h2>
            <p className="text-text-body text-sm mb-6">{message}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="text-red-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-text-strong mb-3">
              {lang === 'ar' ? 'فشل التحقق' : 'Verification Failed'}
            </h2>
            <p className="text-text-body text-sm mb-4">{message}</p>
            <p className="text-text-muted text-xs mb-6">
              {lang === 'ar'
                ? 'إذا انتهت صلاحية الرابط، يرجى التسجيل مجدداً أو التواصل مع الدعم.'
                : 'If the link has expired, please register again or contact support.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/signup')}
                className="flex-1 border border-border-soft text-text-body font-semibold py-3 rounded-xl hover:bg-surface-muted transition-colors"
              >
                {lang === 'ar' ? 'التسجيل مجدداً' : 'Register Again'}
              </button>
              <button
                onClick={() => navigate('/login')}
                className="flex-1 bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
              </button>
            </div>
          </>
        )}

        {status !== 'loading' && (
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-text-muted">
            <Mail size={12} />
            <span>{lang === 'ar' ? 'الوسم — منصة استثمار عقاري' : 'ALWSM — Real Estate Investment Platform'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
