import React, { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle, Shield, Users, Wallet, Building2, TrendingUp, FileText, Clock, Mail, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const FAQItem = ({ question, answer, isOpen, onToggle, isRtl }) => (
  <div className="border border-gray-200 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className={`w-full px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4 ${isRtl ? 'text-right' : 'text-left'}`}
    >
      <span className="font-medium text-gray-900">{question}</span>
      {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
    </button>
    {isOpen && (
      <div className={`px-6 py-4 bg-gray-50 border-t border-gray-200 ${isRtl ? 'text-right' : 'text-left'}`}>
        <p className="text-gray-700">{answer}</p>
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
    <div className="max-w-4xl mx-auto space-y-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('faq.title')}</h1>
        <p className="text-lg text-gray-600">{t('faq.subtitle')}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-emerald-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">{t('faq.investorQuestions.title')}</h2>
          </div>
          <p className="text-gray-600 mb-4">{t('faq.investorQuestions.description')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">{t('faq.ownerQuestions.title')}</h2>
          </div>
          <p className="text-gray-600 mb-4">{t('faq.ownerQuestions.description')}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <HelpCircle className="text-purple-600" size={28} />
          <h2 className="text-2xl font-semibold text-gray-900">{t('faq.title')}</h2>
        </div>
        <div className="space-y-4">
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
      </div>

      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 rounded-xl p-8 text-white text-center">
        <h2 className="text-2xl font-semibold mb-4">{t('faq.stillHaveQuestions.title')}</h2>
        <p className="text-emerald-100 mb-6">{t('faq.stillHaveQuestions.description')}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="mailto:support@estathub.sa" className="flex items-center justify-center gap-2 bg-white text-emerald-600 px-6 py-3 rounded-lg font-medium hover:bg-emerald-50 transition-colors">
            <Mail size={20} />
            {t('faq.stillHaveQuestions.email')}
          </a>
          <a href="tel:+966123456789" className="flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-medium hover:bg-white/30 transition-colors">
            <Phone size={20} />
            {t('faq.stillHaveQuestions.phone')}
          </a>
        </div>
      </div>
    </div>
  )
}
