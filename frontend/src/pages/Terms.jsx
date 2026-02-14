import React from 'react'
import { FileText, Shield, AlertCircle, Users, Building2, Scale, Clock, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Terms() {
  const { t } = useTranslation('pages')
  const { i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'

  return (
    <div className="max-w-4xl mx-auto space-y-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('terms.title')}</h1>
        <p className="text-lg text-gray-600">{t('terms.subtitle')}</p>
        <p className="text-sm text-gray-500 mt-2">{t('terms.lastUpdated')}</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex gap-3">
          <AlertCircle className="text-amber-600 flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">{t('terms.veryImportant.title')}</h3>
            <p className="text-sm text-gray-700">
              {t('terms.veryImportant.description')}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="text-emerald-600" size={24} />
          <h2 className="text-2xl font-semibold text-gray-900">{t('terms.acceptanceOfTerms.title')}</h2>
        </div>
        <div className="space-y-4 text-gray-700">
          <p>{t('terms.acceptanceOfTerms.content1')}</p>
          <p>{t('terms.acceptanceOfTerms.content2')}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Users className="text-blue-600" size={24} />
          <h2 className="text-2xl font-semibold text-gray-900">{t('terms.eligibilityAcceptance.title')}</h2>
        </div>
        <div className="space-y-4 text-gray-700">
          <p>{t('terms.eligibilityAcceptance.description')}</p>
          <ul className="list-disc list-inside space-y-2 mt-4">
            {t('terms.eligibilityAcceptance.requirements', { returnObjects: true }).map((requirement, index) => (
              <li key={index}>{requirement}</li>
            ))}
          </ul>
          <p className="text-sm text-gray-600 mt-4">{t('terms.eligibilityAcceptance.note')}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-purple-600" size={24} />
          <h2 className="text-2xl font-semibold text-gray-900">{t('terms.investmentRisks.title')}</h2>
        </div>
        <div className="space-y-4 text-gray-700">
          <p>{t('terms.investmentRisks.riskAcknowledgment.title')}</p>
          <ul className="list-disc list-inside space-y-2 mt-4">
            {t('terms.investmentRisks.riskAcknowledgment.risks', { returnObjects: true }).map((risk, index) => (
              <li key={index}>{risk}</li>
            ))}
          </ul>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
            <h3 className="font-semibold text-purple-900 mb-2">{t('terms.investmentRisks.investorResponsibilities.title')}</h3>
            <p className="text-purple-800">{t('terms.investmentRisks.investorResponsibilities.description')}</p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              {t('terms.investmentRisks.investorResponsibilities.responsibilities', { returnObjects: true }).map((responsibility, index) => (
                <li key={index}>{responsibility}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="text-orange-600" size={24} />
          <h2 className="text-2xl font-semibold text-gray-900">{t('terms.userObligations.title')}</h2>
        </div>
        <div className="space-y-4 text-gray-700">
          <p>{t('terms.userObligations.content1')}</p>
          <ul className="list-disc list-inside space-y-2 mt-4">
            {t('terms.userObligations.obligations', { returnObjects: true }).map((obligation, index) => (
              <li key={index}>{obligation}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Scale className="text-emerald-600" size={24} />
          <h2 className="text-2xl font-semibold text-gray-900">{t('terms.feesCosts.title')}</h2>
        </div>
        <div className="space-y-4 text-gray-700">
          <p>{t('terms.feesCosts.description')}</p>
          <ul className="list-disc list-inside space-y-2 mt-4">
            {t('terms.feesCosts.feeStructure', { returnObjects: true }).map((fee, index) => (
              <li key={index}>{fee}</li>
            ))}
          </ul>
          <p className="mt-4">{t('terms.feesCosts.note')}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="text-red-600" size={24} />
          <h2 className="text-2xl font-semibold text-gray-900">{t('terms.serviceTermination.title')}</h2>
        </div>
        <div className="space-y-4 text-gray-700">
          <p>{t('terms.serviceTermination.description')}</p>
          <ul className="list-disc list-inside space-y-2 mt-4">
            {t('terms.serviceTermination.rights', { returnObjects: true }).map((right, index) => (
              <li key={index}>{right}</li>
            ))}
          </ul>
          <p className="text-sm text-gray-600 mt-4">{t('terms.serviceTermination.note')}</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 rounded-xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="text-white" size={28} />
          <h2 className="text-2xl font-semibold">{t('terms.contactInformation.title')}</h2>
        </div>
        <p className="text-emerald-100 mb-4">{t('terms.contactInformation.description')}</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a href="mailto:legal@estathub.sa" className="flex items-center justify-center gap-2 bg-white text-emerald-600 px-6 py-3 rounded-lg font-medium hover:bg-emerald-50 transition-colors">
            {t('terms.contactInformation.email')}
          </a>
          <a href="tel:+966123456789" className="flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-medium hover:bg-white/30 transition-colors">
            {t('terms.contactInformation.phone')}
          </a>
        </div>
      </div>
    </div>
  )
}
