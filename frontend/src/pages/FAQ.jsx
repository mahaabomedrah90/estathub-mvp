import React, { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle, Shield, Users, Wallet, Building2, TrendingUp, FileText, Clock, Mail, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import PageWrapper from '../components/ui/PageWrapper'
import HeroSection from '../components/ui/HeroSection'
import SectionCard from '../components/ui/SectionCard'
import IconBox from '../components/ui/IconBox'

const FAQItem = ({ question, answer, isOpen, onToggle, isRtl }) => (
  <div className={`border border-border-soft rounded-xl overflow-hidden transition-shadow duration-200 ${isOpen ? 'shadow-card' : ''}`}>
    <button
      onClick={onToggle}
      className={`w-full px-6 py-4 bg-surface-card hover:bg-surface-muted transition-colors flex items-center justify-between gap-4 ${isRtl ? 'text-right' : 'text-left'}`}
    >
      <span className="font-medium text-text-strong">{question}</span>
      <span className="flex-shrink-0 text-text-muted">
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </span>
    </button>
    {isOpen && (
      <div className={`px-6 py-5 bg-surface-muted border-t border-border-soft ${isRtl ? 'text-right' : 'text-left'}`}>
        <p className="text-text-body leading-relaxed">{answer}</p>
      </div>
    )}
  </div>
)

export default function FAQ() {
  const { t } = useTranslation('pages')
  const { i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const [openIndex, setOpenIndex] = useState(null)

  const toggleQuestion = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <PageWrapper size="narrow" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <HeroSection 
        title={t('faq.title')}
        subtitle={t('faq.subtitle')}
      />

      {/* Category Cards */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <SectionCard padding="lg">
          <div className="flex items-center gap-3 mb-3">
            <IconBox size="md" variant="default">
              <TrendingUp size={20} />
            </IconBox>
            <h2 className="text-lg font-bold text-text-strong">{t('faq.investorQuestions.title')}</h2>
          </div>
          <p className="text-text-body leading-relaxed">{t('faq.investorQuestions.description')}</p>
        </SectionCard>
        <SectionCard padding="lg">
          <div className="flex items-center gap-3 mb-3">
            <IconBox size="md" variant="primary">
              <Building2 size={20} />
            </IconBox>
            <h2 className="text-lg font-bold text-text-strong">{t('faq.ownerQuestions.title')}</h2>
          </div>
          <p className="text-text-body leading-relaxed">{t('faq.ownerQuestions.description')}</p>
        </SectionCard>
      </div>

      {/* FAQ Accordion */}
      <SectionCard padding="lg">
        <div className="flex items-center gap-3 mb-4">
          <IconBox size="md" variant="default">
            <HelpCircle size={22} />
          </IconBox>
          <h2 className="text-xl font-bold text-text-strong">{t('faq.title')}</h2>
        </div>
        <div className="space-y-3">
          {t('faq.questions', { returnObjects: true }).map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => toggleQuestion(index)}
              isRtl={isRtl}
            />
          ))}
        </div>
      </SectionCard>

      {/* Contact CTA */}
      <div className="mt-10 bg-brand-primary rounded-2xl p-8 text-white text-center">
        <h2 className="text-2xl font-bold tracking-tight mb-6">{t('faq.stillHaveQuestions.title')}</h2>
        <p className="text-white/70 mb-8 max-w-lg mx-auto">{t('faq.stillHaveQuestions.description')}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="mailto:support@alwsm.sa"
            className="inline-flex items-center justify-center gap-2 bg-brand-accent text-white px-6 py-3 rounded-full font-semibold hover:bg-brand-accent/90 transition-colors shadow-lg"
          >
            <Mail size={18} />
            {t('faq.stillHaveQuestions.email')}
          </a>
          <a
            href="tel:+966530103099"
            className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white px-6 py-3 rounded-full font-semibold hover:bg-white/20 transition-colors"
          >
            <Phone size={18} />
            {t('faq.stillHaveQuestions.phone')}
          </a>
        </div>
      </div>

    </PageWrapper>
  )
}
