import React from 'react'
import { Shield, Eye, Lock, Database, UserCheck, AlertCircle, FileText, Settings, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Privacy() {
  const { t } = useTranslation('pages')
  const { i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'

  return (
    <div className="max-w-4xl mx-auto space-y-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('privacy.title')}</h1>
        <p className="text-lg text-gray-600">{t('privacy.subtitle')}</p>
        <p className="text-sm text-gray-500 mt-2">{t('privacy.lastUpdated')}</p>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
        <div className="flex gap-3">
          <Shield className="text-emerald-600 flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">{t('privacy.privacyCommitment.title')}</h3>
            <p className="text-sm text-gray-700">
              {t('privacy.privacyCommitment.description')}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Database className="text-blue-600" size={24} />
          <h2 className="text-2xl font-semibold text-gray-900">{t('privacy.dataWeCollect.title')}</h2>
        </div>
        <div className="space-y-4 text-gray-700">
          <div className="space-y-4 mt-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">{t('privacy.dataWeCollect.personalData.title')}</h3>
              <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
                {t('privacy.dataWeCollect.personalData.items', { returnObjects: true }).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">{t('privacy.dataWeCollect.investmentData.title')}</h3>
              <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
                {t('privacy.dataWeCollect.investmentData.items', { returnObjects: true }).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">{t('privacy.dataWeCollect.technicalData.title')}</h3>
              <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
                {t('privacy.dataWeCollect.technicalData.items', { returnObjects: true }).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Eye className="text-purple-600" size={24} />
          <h2 className="text-2xl font-semibold text-gray-900">{t('privacy.howWeUseData.title')}</h2>
        </div>
        <div className="space-y-4 text-gray-700">
          <p>{t('privacy.howWeUseData.description')}</p>
          <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
            {t('privacy.howWeUseData.purposes', { returnObjects: true }).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="text-emerald-600" size={24} />
          <h2 className="text-2xl font-semibold text-gray-900">{t('privacy.dataProtection.title')}</h2>
        </div>
        <div className="space-y-4 text-gray-700">
          <p>{t('privacy.dataProtection.description')}</p>
          <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
            {t('privacy.dataProtection.measures', { returnObjects: true }).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> {t('privacy.dataProtection.note')}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <UserCheck className="text-blue-600" size={24} />
          <h2 className="text-2xl font-semibold text-gray-900">{t('privacy.dataOwnerRights.title')}</h2>
        </div>
        <div className="space-y-4 text-gray-700">
          <p>{t('privacy.dataOwnerRights.description')}</p>
          <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
            {t('privacy.dataOwnerRights.rights', { returnObjects: true }).map((item, index) => (
              <li key={index}>
                <strong>{item.title}</strong> {item.description}
              </li>
            ))}
          </ul>
          <p className="text-sm text-gray-600 mt-4">
            {t('privacy.dataOwnerRights.note')}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <AlertCircle className="text-amber-600" size={24} />
          <h2 className="text-2xl font-semibold text-gray-900">{t('privacy.cookies.title')}</h2>
        </div>
        <div className="space-y-4 text-gray-700">
          <p>{t('privacy.cookies.description')}</p>
          <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
            {t('privacy.cookies.types', { returnObjects: true }).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <p className="text-sm text-gray-600 mt-4">
            {t('privacy.cookies.note')}
          </p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.contactInformation.title')}</h2>
        <div className="space-y-3 text-gray-700">
          <p>{t('privacy.contactInformation.description')}</p>
          <p>{t('privacy.contactInformation.email')}</p>
          <p>{t('privacy.contactInformation.phone')}</p>
          <p>{t('privacy.contactInformation.address')}</p>
        </div>
      </div>
    </div>
  )
}
