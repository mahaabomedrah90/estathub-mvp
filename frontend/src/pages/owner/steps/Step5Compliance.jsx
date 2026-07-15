import React from 'react'
import { FileCheck, Shield, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next';

export default function Step5Compliance({ formData, onChange, errors = {} }) {
  const { t } = useTranslation('pages');
  const handleChange = (field, value) => {
    onChange({ ...formData, [field]: value })
  }



    const declarations = [
    {
      id: 'declarationPropertyAccuracy',
      title: t('declarationPropertyAccuracyTitle'),
      titleAr: t('declarationPropertyAccuracyTitleAr'),
      description: t('declarationPropertyAccuracyDescription'),
      descriptionAr: t('declarationPropertyAccuracyDescriptionAr'),
    },
    {
      id: 'declarationLegalResponsibility',
      title: t('declarationLegalResponsibilityTitle'),
      titleAr: t('declarationLegalResponsibilityTitleAr'),
      description: t('declarationLegalResponsibilityDescription'),
      descriptionAr: t('declarationLegalResponsibilityDescriptionAr'),
    },
    {
      id: 'declarationTokenizationApproval',
      title: t('declarationTokenizationApprovalTitle'),
      titleAr: t('declarationTokenizationApprovalTitleAr'),
      description: t('declarationTokenizationApprovalDescription'),
      descriptionAr: t('declarationTokenizationApprovalDescriptionAr'),
    },
    {
      id: 'declarationDocumentSharingApproval',
      title: t('declarationDocumentSharingApprovalTitle'),
      titleAr: t('declarationDocumentSharingApprovalTitleAr'),
      description: t('declarationDocumentSharingApprovalDescription'),
      descriptionAr: t('declarationDocumentSharingApprovalDescriptionAr'),
    },
  ]

  const allAccepted = declarations.every(d => formData[d.id] === true)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-border-soft">
        <div className="w-14 h-14 bg-brand-primary/10 rounded-2xl flex items-center justify-center">
          <FileCheck className="text-brand-primary" size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-brand-primary">{t('complianceAgreements')}</h2>
          <p className="text-text-muted mt-1">{t('legalDeclarationsAgreements')}</p>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-brand-accent-soft border border-brand-accent/30 rounded-2xl p-6 flex items-start gap-4">
        <AlertCircle className="text-brand-accent flex-shrink-0 mt-0.5" size={24} />
        <div className="text-sm text-brand-primary">
          <p className="font-semibold mb-2">{t('requiredDeclarations')}</p>
          <p className="leading-relaxed">{t('readAcceptDeclarations')}</p>
        </div>
      </div>

      {/* Declarations */}
      <div className="space-y-4">
        {declarations.map((declaration, index) => (
          <div
            key={declaration.id}
            className={`border-2 rounded-2xl p-8 transition-all ${
              formData[declaration.id]
                ? 'border-brand-accent bg-brand-accent-soft shadow-md'
                : 'border-border-soft hover:border-border-soft'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                <button
                  type="button"
                  onClick={() => handleChange(declaration.id, !formData[declaration.id])}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                    formData[declaration.id]
                      ? 'bg-brand-accent border-brand-accent shadow-md'
                      : 'border-border-soft hover:border-brand-accent'
                  }`}
                >
                  {formData[declaration.id] && (
                    <CheckCircle2 className="text-white" size={16} />
                  )}
                </button>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-semibold text-text-muted">
                    {t('declaration')} {index + 1}
                  </span>
                  {formData[declaration.id] && (
  <span className="px-3 py-1 bg-brand-accent text-white text-xs rounded-full font-medium">
    {t('declarationAccepted')}
  </span>
)}
                </div>

                <h3 className="text-xl font-semibold text-brand-primary mb-2">
                  {declaration.title}
                </h3>
                <p className="text-sm text-text-muted mb-4">
                  {declaration.titleAr}
                </p>

                <p className="text-sm text-text-body leading-relaxed mb-3">
                  {declaration.description}
                </p>
                <p className="text-sm text-text-muted leading-relaxed" dir="rtl">
                  {declaration.descriptionAr}
                </p>

                {errors[declaration.id] && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle size={16} />
                    {errors[declaration.id]}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className={`border-2 rounded-2xl p-8 transition-all ${
        allAccepted
          ? 'border-brand-accent bg-brand-accent-soft shadow-md'
          : 'border-brand-coral bg-brand-coral-soft'
      }`}>
        <div className="flex items-start gap-3">
          {allAccepted ? (
            <CheckCircle2 className="text-brand-accent flex-shrink-0 mt-0.5" size={28} />
          ) : (
            <AlertCircle className="text-brand-coral flex-shrink-0 mt-0.5" size={28} />
          )}
          <div>
            <h3 className={`font-bold mb-3 text-xl ${allAccepted ? 'text-brand-primary' : 'text-brand-coral'}`}>
              {allAccepted ? t('allDeclarationsAccepted') : t('actionRequired')}
            </h3>
            <p className={`text-sm leading-relaxed ${allAccepted ? 'text-brand-primary' : 'text-brand-coral'}`}>
              {allAccepted
                ? t('acceptedAllRequiredDeclarations') :
                t('acceptDeclarations')}
            </p>
          </div>
        </div>
      </div>

      {/* Legal Notice */}
      <div className="bg-surface-muted border border-border-soft rounded-2xl p-8">
        <div className="flex items-start gap-4">
          <Shield className="text-text-muted flex-shrink-0 mt-0.5" size={24} />
          <div className="text-sm text-text-body">
            <p className="font-semibold mb-3">{t('legalNotice')}</p>
            <p className="mb-3 leading-relaxed">
              {t('submitPropertyTokenization')}
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-muted">
              <li>{t('complySaudiRealEstate')}</li>
              <li>{t('allowPlatformAdmin')}</li>
              <li>{t('maintainPropertyRecords')}</li>
              <li>{t('distributeRentalIncome')}</li>
              <li>{t('payPlatformFees')}</li>
            </ul>
            <p className="mt-4 text-xs text-text-muted">
              {t('platformOperatesSaudiLaws')}
            </p>
          </div>
        </div>
      </div>

      {/* Final Confirmation */}
      {allAccepted && (
        <div className="bg-gradient-to-r from-brand-accent-soft to-brand-primary/5 border-2 border-brand-accent rounded-2xl p-8 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-accent rounded-full flex items-center justify-center shadow-md">
              <CheckCircle2 className="text-white" size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-brand-primary mb-2">
                  {t('readyToSubmit')}
              </h3>
              <p className="text-sm text-brand-primary leading-relaxed">
                {t('propertySubmissionComplete')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}