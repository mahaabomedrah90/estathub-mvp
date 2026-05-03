import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

export default function WaitlistSection() {
  const { i18n } = useTranslation('pages')
  const isRtl = i18n.dir() === 'rtl'

  const [contact, setContact] = useState('')
  const [amount, setAmount] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!contact) return
    console.log('[Waitlist] Submitted:', { contact, amount })
    setSubmitted(true)
  }

  const amountOptions = [
    { value: '500', labelAr: '500 ريال', labelEn: 'SAR 500' },
    { value: '1000', labelAr: '1,000 ريال', labelEn: 'SAR 1,000' },
    { value: '5000+', labelAr: '5,000+ ريال', labelEn: 'SAR 5,000+' },
  ]

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      className="bg-brand-primary py-16 px-4"
    >
      <div className="max-w-xl mx-auto text-center">
        {/* Eyebrow */}
        <p className="text-brand-accent text-sm font-semibold uppercase tracking-widest mb-3">
          {isRtl ? 'كن من الأوائل' : 'Be among the first'}
        </p>

        {/* Heading */}
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
          {isRtl ? 'احجز مكانك قبل الإطلاق' : 'Reserve your spot before launch'}
        </h2>

        {/* Microcopy */}
        <p className="text-white/70 text-base mb-8">
          {isRtl
            ? 'كن من أوائل المستثمرين عند الإطلاق'
            : 'Be among the first investors at launch'}
        </p>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="text-brand-accent w-12 h-12" />
            <p className="text-white font-semibold text-lg">
              {isRtl ? 'تم تسجيلك بنجاح!' : 'You\'re on the list!'}
            </p>
            <p className="text-white/60 text-sm">
              {isRtl
                ? 'سنتواصل معك عند الإطلاق.'
                : 'We\'ll reach out when we launch.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contact input */}
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={isRtl ? 'البريد الإلكتروني أو رقم الجوال' : 'Email or phone number'}
              required
              className="w-full px-5 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-accent text-base"
            />

            {/* Investment amount selector */}
            <div className="flex gap-2 justify-center flex-wrap">
              <span className="text-white/60 text-sm self-center w-full mb-1">
                {isRtl ? 'كم تقدر تستثمر؟' : 'How much can you invest?'}
              </span>
              {amountOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAmount(opt.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150 ${
                    amount === opt.value
                      ? 'bg-brand-accent border-brand-accent text-white'
                      : 'bg-transparent border-white/30 text-white/70 hover:border-brand-accent/60'
                  }`}
                >
                  {isRtl ? opt.labelAr : opt.labelEn}
                </button>
              ))}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-brand-accent text-white font-semibold rounded-xl hover:bg-brand-accent/90 active:scale-95 transition-all duration-200 shadow-lg text-base"
            >
              <span>{isRtl ? 'انضم الآن' : 'Join Now'}</span>
              <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            </button>

            {/* Trust microcopy */}
            <p className="text-white/40 text-xs pt-1">
              {isRtl
                ? 'منصة منظمة وشفافة — مصممة للمستثمرين في السعودية'
                : 'Transparent and structured platform for Saudi investors'}
            </p>
          </form>
        )}
      </div>
    </section>
  )
}
