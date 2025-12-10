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
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
          <FileCheck className="text-green-600" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('complianceAgreements')}</h2>
          <p className="text-sm text-gray-600">{t('legalDeclarationsAgreements')}</p>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">{t('requiredDeclarations')}</p>
          <p>{t('readAcceptDeclarations')}</p>
        </div>
      </div>

      {/* Declarations */}
      <div className="space-y-4">
        {declarations.map((declaration, index) => (
          <div
            key={declaration.id}
            className={`border-2 rounded-lg p-6 transition-all ${
              formData[declaration.id]
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                <button
                  type="button"
                  onClick={() => handleChange(declaration.id, !formData[declaration.id])}
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                    formData[declaration.id]
                      ? 'bg-green-600 border-green-600'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {formData[declaration.id] && (
                    <CheckCircle2 className="text-white" size={16} />
                  )}
                </button>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-500">
                    {t('declaration')} {index + 1}
                  </span>
                  {formData[declaration.id] && (
  <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
    {t('declarationAccepted')}
  </span>
)}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {declaration.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {declaration.titleAr}
                </p>

                <p className="text-sm text-gray-700 leading-relaxed mb-2">
                  {declaration.description}
                </p>
                <p className="text-sm text-gray-600 leading-relaxed" dir="rtl">
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
      <div className={`border-2 rounded-lg p-6 transition-all ${
        allAccepted
          ? 'border-green-500 bg-green-50'
          : 'border-amber-300 bg-amber-50'
      }`}>
        <div className="flex items-start gap-3">
          {allAccepted ? (
            <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={24} />
          ) : (
            <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={24} />
          )}
          <div>
            <h3 className={`font-semibold mb-2 ${allAccepted ? 'text-green-900' : 'text-amber-900'}`}>
              {allAccepted ? t('allDeclarationsAccepted') : t('actionRequired')}
            </h3>
            <p className={`text-sm ${allAccepted ? 'text-green-800' : 'text-amber-800'}`}>
              {allAccepted
                ? t('acceptedAllRequiredDeclarations') :
                t('acceptDeclarations')}
            </p>
          </div>
        </div>
      </div>

      {/* Legal Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Shield className="text-gray-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-2">{t('legalNotice')}</p>
            <p className="mb-2">
              {t('submitPropertyTokenization')}
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>{t('complySaudiRealEstate')}</li>
              <li>{t('allowPlatformAdmin')}</li>
              <li>{t('maintainPropertyRecords')}</li>
              <li>{t('distributeRentalIncome')}</li>
              <li>{t('payPlatformFees')}</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              {t('platformOperatesSaudiLaws')}
            </p>
          </div>
        </div>
      </div>

      {/* Final Confirmation */}
      {allAccepted && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-500 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-emerald-900 mb-1">
                  {t('readyToSubmit')}
              </h3>
              <p className="text-sm text-emerald-800">
                {t('propertySubmissionComplete')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}