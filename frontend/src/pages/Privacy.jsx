import React from 'react'
import { Shield, Eye, Lock, Database, UserCheck, AlertCircle, FileText, Settings, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Privacy() {
  const { t } = useTranslation('pages')
  const { i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-12" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Page Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-text-strong tracking-tight">{t('privacy.title')}</h1>
        <p className="text-lg text-text-muted">{t('privacy.subtitle')}</p>
        <p className="text-sm text-text-muted">{t('privacy.lastUpdated')}</p>
      </div>

      {/* Privacy Commitment */}
      <div className="bg-brand-accent-soft border border-brand-accent/20 rounded-xl p-6">
        <div className="flex gap-3">
          <Shield className="text-brand-accent flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-text-strong mb-2">{t('privacy.privacyCommitment.title')}</h3>
            <p className="text-sm text-text-body">
              {t('privacy.privacyCommitment.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Data We Collect */}
      <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-primary/5 rounded-xl flex items-center justify-center">
            <Database className="text-brand-primary" size={22} />
          </div>
          <h2 className="text-xl font-bold text-text-strong">{t('privacy.dataWeCollect.title')}</h2>
        </div>
        <div className="space-y-6 text-text-body">
          <div>
            <h3 className="font-semibold text-text-strong mb-3">{t('privacy.dataWeCollect.personalData.title')}</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              {t('privacy.dataWeCollect.personalData.items', { returnObjects: true }).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-text-strong mb-3">{t('privacy.dataWeCollect.investmentData.title')}</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              {t('privacy.dataWeCollect.investmentData.items', { returnObjects: true }).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-text-strong mb-3">{t('privacy.dataWeCollect.technicalData.title')}</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              {t('privacy.dataWeCollect.technicalData.items', { returnObjects: true }).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* How We Use Data */}
      <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-accent-soft rounded-xl flex items-center justify-center">
            <Eye className="text-brand-accent" size={22} />
          </div>
          <h2 className="text-xl font-bold text-text-strong">{t('privacy.howWeUseData.title')}</h2>
        </div>
        <div className="space-y-4 text-text-body">
          <p>{t('privacy.howWeUseData.description')}</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            {t('privacy.howWeUseData.purposes', { returnObjects: true }).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Data Protection */}
      <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-primary/5 rounded-xl flex items-center justify-center">
            <Lock className="text-brand-primary" size={22} />
          </div>
          <h2 className="text-xl font-bold text-text-strong">{t('privacy.dataProtection.title')}</h2>
        </div>
        <div className="space-y-4 text-text-body">
          <p>{t('privacy.dataProtection.description')}</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            {t('privacy.dataProtection.measures', { returnObjects: true }).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-lg p-4 mt-2">
            <p className="text-sm text-brand-primary">
              <strong>Note:</strong> {t('privacy.dataProtection.note')}
            </p>
          </div>
        </div>
      </div>

      {/* Data Owner Rights */}
      <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-accent-soft rounded-xl flex items-center justify-center">
            <UserCheck className="text-brand-accent" size={22} />
          </div>
          <h2 className="text-xl font-bold text-text-strong">{t('privacy.dataOwnerRights.title')}</h2>
        </div>
        <div className="space-y-4 text-text-body">
          <p>{t('privacy.dataOwnerRights.description')}</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            {t('privacy.dataOwnerRights.rights', { returnObjects: true }).map((item, index) => (
              <li key={index}>
                <strong>{item.title}</strong> {item.description}
              </li>
            ))}
          </ul>
          <p className="text-sm text-text-muted mt-2">
            {t('privacy.dataOwnerRights.note')}
          </p>
        </div>
      </div>

      {/* Cookies */}
      <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-accent-soft rounded-xl flex items-center justify-center">
            <AlertCircle className="text-brand-accent" size={22} />
          </div>
          <h2 className="text-xl font-bold text-text-strong">{t('privacy.cookies.title')}</h2>
        </div>
        <div className="space-y-4 text-text-body">
          <p>{t('privacy.cookies.description')}</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            {t('privacy.cookies.types', { returnObjects: true }).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <p className="text-sm text-text-muted mt-2">
            {t('privacy.cookies.note')}
          </p>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-surface-muted border border-border-soft rounded-2xl p-8">
        <h2 className="text-xl font-bold text-text-strong mb-4">{t('privacy.contactInformation.title')}</h2>
        <div className="space-y-3 text-text-body">
          <p>{t('privacy.contactInformation.description')}</p>
          <p>{t('privacy.contactInformation.email')}</p>
          <p>{t('privacy.contactInformation.phone')}</p>
          <p>{t('privacy.contactInformation.address')}</p>
        </div>
      </div>

    </div>
  )
}
