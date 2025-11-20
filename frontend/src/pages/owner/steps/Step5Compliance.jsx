import React from 'react'
import { FileCheck, Shield, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function Step5Compliance({ formData, onChange, errors = {} }) {
  const handleChange = (field, value) => {
    onChange({ ...formData, [field]: value })
  }

  const declarations = [
    {
      id: 'declarationPropertyAccuracy',
      title: 'Property Information Accuracy',
      titleAr: 'دقة معلومات العقار',
      description: 'I declare that all information provided about the property, including ownership documents, measurements, and financial details, is accurate and truthful.',
      descriptionAr: 'أقر بأن جميع المعلومات المقدمة عن العقار، بما في ذلك مستندات الملكية والقياسات والتفاصيل المالية، دقيقة وصحيحة.'
    },
    {
      id: 'declarationLegalResponsibility',
      title: 'Legal Responsibility',
      titleAr: 'المسؤولية القانونية',
      description: 'I understand and accept full legal responsibility for the accuracy of all submitted information and documents. I acknowledge that providing false information may result in legal consequences.',
      descriptionAr: 'أتفهم وأقبل المسؤولية القانونية الكاملة عن دقة جميع المعلومات والمستندات المقدمة. وأقر بأن تقديم معلومات كاذبة قد يؤدي إلى عواقب قانونية.'
    },
    {
      id: 'declarationTokenizationApproval',
      title: 'Tokenization Approval',
      titleAr: 'الموافقة على التوكنة',
      description: 'I authorize the tokenization of my property on the blockchain platform and understand that tokens will represent fractional ownership of the property.',
      descriptionAr: 'أوافق على توكنة عقاري على منصة البلوكشين وأتفهم أن الرموز ستمثل ملكية جزئية للعقار.'
    },
    {
      id: 'declarationDocumentSharingApproval',
      title: 'Document Sharing Approval',
      titleAr: 'الموافقة على مشاركة المستندات',
      description: 'I consent to sharing property documents and information with verified investors and platform administrators for due diligence purposes.',
      descriptionAr: 'أوافق على مشاركة مستندات ومعلومات العقار مع المستثمرين المعتمدين ومسؤولي المنصة لأغراض العناية الواجبة.'
    }
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
          <h2 className="text-2xl font-bold text-gray-900">Compliance & Agreements</h2>
          <p className="text-sm text-gray-600">الامتثال والموافقات - Legal declarations and agreements</p>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Required Declarations</p>
          <p>Please read and accept all declarations below. All declarations are mandatory to submit your property for tokenization.</p>
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
                    Declaration {index + 1}
                  </span>
                  {formData[declaration.id] && (
                    <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                      Accepted
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
              {allAccepted ? 'All Declarations Accepted ✓' : 'Action Required'}
            </h3>
            <p className={`text-sm ${allAccepted ? 'text-green-800' : 'text-amber-800'}`}>
              {allAccepted
                ? 'You have accepted all required declarations. You can now proceed to submit your property for review.'
                : 'Please accept all declarations above to proceed with your property submission.'}
            </p>
          </div>
        </div>
      </div>

      {/* Legal Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Shield className="text-gray-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-2">Legal Notice</p>
            <p className="mb-2">
              By submitting this property for tokenization, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Comply with all Saudi Arabian real estate and securities regulations</li>
              <li>Allow platform administrators to verify all submitted information</li>
              <li>Maintain accurate property records and update information as needed</li>
              <li>Distribute rental income to token holders according to the agreed schedule</li>
              <li>Pay any applicable platform fees and transaction costs</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              This platform operates in accordance with Saudi Arabian laws and regulations. All transactions are recorded on the blockchain for transparency and security.
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
                Ready to Submit
              </h3>
              <p className="text-sm text-emerald-800">
                Your property submission is complete. Click "Submit Property" to send it for admin review.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}