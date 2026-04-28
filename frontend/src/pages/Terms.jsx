import React from 'react'
import { FileText, Shield, AlertCircle, Users, Building2, Scale, Clock, CheckCircle2, Mail, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Terms() {
  const { t } = useTranslation('pages')
  const { i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-12" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Page Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-text-strong tracking-tight">{t('terms.title')}</h1>
        <p className="text-lg text-text-muted">{t('terms.subtitle')}</p>
        <p className="text-sm text-text-muted">{t('terms.lastUpdated')}</p>
      </div>

      {/* Important Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex gap-3">
          <AlertCircle className="text-amber-600 flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-text-strong mb-2">{t('terms.veryImportant.title')}</h3>
            <p className="text-sm text-text-body">
              {t('terms.veryImportant.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Acceptance of Terms */}
      <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-accent-soft rounded-xl flex items-center justify-center">
            <FileText className="text-brand-accent" size={22} />
          </div>
          <h2 className="text-xl font-bold text-text-strong">{t('terms.acceptanceOfTerms.title')}</h2>
        </div>
        <div className="space-y-4 text-text-body">
          <p>{t('terms.acceptanceOfTerms.content1')}</p>
          <p>{t('terms.acceptanceOfTerms.content2')}</p>
        </div>
      </div>

      {/* Eligibility */}
      <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-primary/5 rounded-xl flex items-center justify-center">
            <Users className="text-brand-primary" size={22} />
          </div>
          <h2 className="text-xl font-bold text-text-strong">{t('terms.eligibilityAcceptance.title')}</h2>
        </div>
        <div className="space-y-4 text-text-body">
          <p>{t('terms.eligibilityAcceptance.description')}</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            {t('terms.eligibilityAcceptance.requirements', { returnObjects: true }).map((requirement, index) => (
              <li key={index}>{requirement}</li>
            ))}
          </ul>
          <p className="text-sm text-text-muted mt-2">{t('terms.eligibilityAcceptance.note')}</p>
        </div>
      </div>

      {/* Investment Risks */}
      <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-accent-soft rounded-xl flex items-center justify-center">
            <Shield className="text-brand-accent" size={22} />
          </div>
          <h2 className="text-xl font-bold text-text-strong">{t('terms.investmentRisks.title')}</h2>
        </div>
        <div className="space-y-4 text-text-body">
          <p>{t('terms.investmentRisks.riskAcknowledgment.title')}</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            {t('terms.investmentRisks.riskAcknowledgment.risks', { returnObjects: true }).map((risk, index) => (
              <li key={index}>{risk}</li>
            ))}
          </ul>
          <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-xl p-5 mt-2">
            <h3 className="font-semibold text-text-strong mb-2">{t('terms.investmentRisks.investorResponsibilities.title')}</h3>
            <p className="text-text-body">{t('terms.investmentRisks.investorResponsibilities.description')}</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
              {t('terms.investmentRisks.investorResponsibilities.responsibilities', { returnObjects: true }).map((responsibility, index) => (
                <li key={index}>{responsibility}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* User Obligations */}
      <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-primary/5 rounded-xl flex items-center justify-center">
            <Building2 className="text-brand-primary" size={22} />
          </div>
          <h2 className="text-xl font-bold text-text-strong">{t('terms.userObligations.title')}</h2>
        </div>
        <div className="space-y-4 text-text-body">
          <p>{t('terms.userObligations.content1')}</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            {t('terms.userObligations.obligations', { returnObjects: true }).map((obligation, index) => (
              <li key={index}>{obligation}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Fees & Costs */}
      <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-accent-soft rounded-xl flex items-center justify-center">
            <Scale className="text-brand-accent" size={22} />
          </div>
          <h2 className="text-xl font-bold text-text-strong">{t('terms.feesCosts.title')}</h2>
        </div>
        <div className="space-y-4 text-text-body">
          <p>{t('terms.feesCosts.description')}</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            {t('terms.feesCosts.feeStructure', { returnObjects: true }).map((fee, index) => (
              <li key={index}>{fee}</li>
            ))}
          </ul>
          <p className="mt-2">{t('terms.feesCosts.note')}</p>
        </div>
      </div>

      {/* Service Termination */}
      <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-primary/5 rounded-xl flex items-center justify-center">
            <Clock className="text-brand-primary" size={22} />
          </div>
          <h2 className="text-xl font-bold text-text-strong">{t('terms.serviceTermination.title')}</h2>
        </div>
        <div className="space-y-4 text-text-body">
          <p>{t('terms.serviceTermination.description')}</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            {t('terms.serviceTermination.rights', { returnObjects: true }).map((right, index) => (
              <li key={index}>{right}</li>
            ))}
          </ul>
          <p className="text-sm text-text-muted mt-2">{t('terms.serviceTermination.note')}</p>
        </div>
      </div>

      {/* Contact CTA */}
      <div className="bg-brand-primary rounded-2xl p-10 text-white text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <CheckCircle2 className="text-brand-accent" size={28} />
          <h2 className="text-2xl font-bold tracking-tight">{t('terms.contactInformation.title')}</h2>
        </div>
        <p className="text-white/70 mb-8 max-w-lg mx-auto">{t('terms.contactInformation.description')}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="mailto:support@alwsm.sa"
            className="inline-flex items-center justify-center gap-2 bg-brand-accent text-white px-6 py-3 rounded-full font-semibold hover:bg-brand-accent/90 transition-colors shadow-lg"
          >
            <Mail size={18} />
            {t('terms.contactInformation.email')}
          </a>
          <a
            href="tel:+966530103099"
            className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white px-6 py-3 rounded-full font-semibold hover:bg-white/20 transition-colors"
          >
            <Phone size={18} />
            {t('terms.contactInformation.phone')}
          </a>
        </div>
      </div>

    </div>
  )
}
