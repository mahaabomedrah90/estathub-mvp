import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { fetchJson } from '../lib/api'

export default function WaitlistSection({ source = 'home' }) {
  const { i18n } = useTranslation('pages')
  const isRtl = i18n.dir() === 'rtl'

  const [contact, setContact] = useState('')
  const [amount, setAmount] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!contact) return

    setLoading(true)
    setApiError(false)

    try {
      await fetchJson('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact,
          amount,
          language: i18n.language,
          source,
        }),
      })
      setSubmitted(true)
    } catch {
      setApiError(true)
    } finally {
      setLoading(false)
    }
  }

  const amountOptions = [
    { value: '250', labelAr: '٢٥٠ ريال', labelEn: 'SAR 250' },
    { value: '500', labelAr: '٥٠٠ ريال', labelEn: 'SAR 500' },
    { value: '1000+', labelAr: '+١٠٠٠ ريال', labelEn: 'SAR 1,000+' },
  ]

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      className="bg-brand-primary pt-10 md:pt-14 pb-8 md:pb-10 px-4"
    >
      <div className="max-w-xl mx-auto text-center">
        {/* Eyebrow */}
        <p className="text-brand-accent text-sm font-semibold uppercase tracking-widest mb-3">
          {isRtl ? 'كن من الأوائل' : 'Early access'}
        </p>

        {/* Heading */}
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
          {isRtl ? 'وسّم اسمك. من اليوم.' : 'Own it. Start now.'}
        </h2>

        {/* Microcopy */}
        <p className="text-white/70 text-base mb-6">
          {isRtl
            ? 'خطوة واحدة اليوم قد تصنع أثراً لسنوات.'
            : 'Reserve your place before the first opportunity closes.'}
        </p>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="text-brand-accent w-12 h-12" />
            <p className="text-white font-semibold text-lg">
              {isRtl ? 'تم تسجيلك بنجاح. سنخبرك عند توفر أول فرصة.' : "You're registered. We'll notify you when the first opportunity is live."}
            </p>
            <p className="text-white/60 text-sm">
              {isRtl
                ? 'سنتواصل معك عند الإطلاق.'
                : "We will notify you when the first property goes live."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">

            {/* GROUP 1 — Input */}
            <div className="mb-8">
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={isRtl ? 'البريد الإلكتروني أو رقم الجوال' : 'Email or phone'}
                required
                className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-accent text-base"
              />
            </div>

            {/* GROUP 2 — Investment selection */}
            <div className="mt-2 space-y-3">
              <span className="block text-white/60 text-sm text-center">
                {isRtl ? 'كم تقدر تستثمر؟' : 'Approximate investment range'}
              </span>
              <div className="flex gap-3 justify-center flex-wrap">
                {amountOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAmount(opt.value)}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                      amount === opt.value
                        ? 'bg-brand-accent border-brand-accent text-white'
                        : 'bg-transparent border-white/30 text-white/70 hover:border-brand-accent/60'
                    }`}
                  >
                    {isRtl ? opt.labelAr : opt.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* GROUP 3 — CTA */}
            <div className="mt-8">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-brand-accent text-white font-semibold rounded-xl hover:bg-brand-accent/90 active:scale-95 transition-all duration-200 shadow-lg text-base disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isRtl ? 'سجّل وكن من الأوائل' : 'Reserve My Place'}</span>
                    <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>
            </div>

            {/* API error */}
            {apiError && (
              <p className="mt-4 text-red-300 text-sm font-medium">
                {isRtl
                  ? 'تعذر تسجيلك الآن، حاولي مرة أخرى.'
                  : "Something went wrong. Please try again."}
              </p>
            )}

            {/* GROUP 4 — Trust note */}
            <p className="mt-4 text-white/40 text-xs text-center">
              {isRtl
                ? 'نستخدم تقنيات حديثة لضمان أن ملكيتك موثقة، محفوظة، ويمكن التحقق منها'
                : 'Asset-backed. Verified ownership. Saudi-regulated.'}
            </p>

          </form>
        )}
      </div>
    </section>
  )
}
