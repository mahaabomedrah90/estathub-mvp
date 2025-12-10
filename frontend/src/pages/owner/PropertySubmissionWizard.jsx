import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Save, Send, CheckCircle2, Loader } from 'lucide-react'
import { fetchJson, authHeader, PayoutSchedule, OwnerType } from '../../lib/api'
import { useTranslation } from 'react-i18next';
// Import step components
import Step1LegalVerification from './steps/Step1LegalVerification'
import Step2TechnicalSpec from './steps/Step2TechnicalSpec'
import Step3Financial from './steps/Step3Financial'
import Step4OwnerInfo from './steps/Step4OwnerInfo'
import Step5Compliance from './steps/Step5Compliance'

const STEPS = [
  { id: 1, key: '1', component: Step1LegalVerification },
  { id: 2, key: '2', component: Step2TechnicalSpec },
  { id: 3, key: '3', component: Step3Financial },
  { id: 4, key: '4', component: Step4OwnerInfo },
  { id: 5, key: '5', component: Step5Compliance }
];

export default function PropertySubmissionWizard() {
  const { t } = useTranslation('pages');
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  const [formData, setFormData] = useState({
    // Step 1: Legal Verification
    ownershipType: '',
    deedNumber: '',
    deedDate: '',
    deedAuthority: '',
    deedDocumentUrl: '',
    sitePlanDocumentUrl: '',
    buildingPermitUrl: '',
    electricityBillUrl: '',
    waterBillUrl: '',
    ownerIdDocumentUrl: '',

    // Step 2: Technical Specification
    propertyType: '',
    landArea: '',
    builtArea: '',
    buildingAge: '',
    floorsCount: '',
    unitsCount: '',
    propertyCondition: '',
    gpsLatitude: 24.7136,
    gpsLongitude: 46.6753,
    city: '',
    district: '',
    municipality: '',
    propertyDescription: '',
    mainImagesUrls: [],

    // Step 3: Financial & Tokenization
    marketValue: '',
    valuationReportUrl: '',
    totalTokens: '',
    tokenPrice: '',
    ownerRetainedPercentage: '0',
    expectedROI: '',
    expectedMonthlyYield: '',
    payoutSchedule: PayoutSchedule.MONTHLY,

    // Step 4: Owner Information
    ownerType: OwnerType.INDIVIDUAL,
    ownerName: '',
    nationalIdOrCR: '',
    ownerPhone: '',
    ownerEmail: '',
    ownerIban: '',
    authorizedPersonName: '',
    authorizedPersonId: '',
    commercialRegistration: '',

    // Step 5: Compliance
    declarationPropertyAccuracy: false,
    declarationLegalResponsibility: false,
    declarationTokenizationApproval: false,
    declarationDocumentSharingApproval: false
  })

  const validateStep = (step) => {
    const newErrors = {}

    if (step === 1) {
      if (!formData.ownershipType) newErrors.ownershipType = t('owner.newProperty.validation.ownershipTypeRequired')
      if (!formData.deedNumber) newErrors.deedNumber = t('owner.newProperty.validation.deedNumberRequired')
      if (!formData.deedDate) newErrors.deedDate = t('owner.newProperty.validation.deedDateRequired')
      if (!formData.deedAuthority) newErrors.deedAuthority = t('owner.newProperty.validation.deedAuthorityRequired')
      if (!formData.deedDocumentUrl) newErrors.deedDocumentUrl = t('owner.newProperty.validation.deedDocumentRequired')
      if (!formData.sitePlanDocumentUrl) newErrors.sitePlanDocumentUrl = t('owner.newProperty.validation.sitePlanRequired')
      if (!formData.buildingPermitUrl) newErrors.buildingPermitUrl = t('owner.newProperty.validation.buildingPermitRequired')
      if (!formData.electricityBillUrl) newErrors.electricityBillUrl = t('owner.newProperty.validation.electricityBillRequired')
      if (!formData.ownerIdDocumentUrl) newErrors.ownerIdDocumentUrl = t('owner.newProperty.validation.ownerIdRequired')
    }

    if (step === 2) {
      if (!formData.propertyType) newErrors.propertyType = t('owner.newProperty.validation.propertyTypeRequired')
      if (!formData.landArea || Number(formData.landArea) <= 0) newErrors.landArea = t('owner.newProperty.validation.landAreaRequired')
      if (!formData.builtArea || Number(formData.builtArea) <= 0) newErrors.builtArea = t('owner.newProperty.validation.builtAreaRequired')
      if (!formData.buildingAge) newErrors.buildingAge = t('owner.newProperty.validation.buildingAgeRequired')
      if (!formData.floorsCount) newErrors.floorsCount = t('owner.newProperty.validation.floorsCountRequired')
      if (!formData.unitsCount) newErrors.unitsCount = t('owner.newProperty.validation.unitsCountRequired')
      if (!formData.propertyCondition) newErrors.propertyCondition = t('owner.newProperty.validation.propertyConditionRequired')
      if (!formData.city) newErrors.city = t('owner.newProperty.validation.cityRequired')
      if (!formData.district) newErrors.district = t('owner.newProperty.validation.districtRequired')
      if (!formData.municipality) newErrors.municipality = t('owner.newProperty.validation.municipalityRequired')
      if (!formData.propertyDescription || formData.propertyDescription.length < 100) {
        newErrors.propertyDescription = t('owner.newProperty.validation.descriptionMin')
      }
      if (!formData.mainImagesUrls || formData.mainImagesUrls.length < 3) {
        newErrors.mainImagesUrls = t('owner.newProperty.validation.imagesMin')
      }
    }

    if (step === 3) {
      if (!formData.marketValue || Number(formData.marketValue) <= 0) newErrors.marketValue = t('owner.newProperty.validation.marketValueRequired')
      if (!formData.valuationReportUrl) newErrors.valuationReportUrl = t('owner.newProperty.validation.valuationReportRequired')
      if (!formData.totalTokens || Number(formData.totalTokens) <= 0) newErrors.totalTokens = t('owner.newProperty.validation.totalTokensRequired')
      if (!formData.tokenPrice || Number(formData.tokenPrice) <= 0) newErrors.tokenPrice = t('owner.newProperty.validation.tokenPriceRequired')
      if (!formData.expectedROI) newErrors.expectedROI = t('owner.newProperty.validation.expectedRoiRequired')
      if (!formData.expectedMonthlyYield) newErrors.expectedMonthlyYield = t('owner.newProperty.validation.expectedMonthlyYieldRequired')
    }

    if (step === 4) {
      if (!formData.ownerName) newErrors.ownerName = t('owner.newProperty.validation.ownerNameRequired')
      if (!formData.nationalIdOrCR) newErrors.nationalIdOrCR = t('owner.newProperty.validation.nationalIdOrCrRequired')
      if (!formData.ownerPhone) newErrors.ownerPhone = t('owner.newProperty.validation.ownerPhoneRequired')
      if (!formData.ownerEmail) newErrors.ownerEmail = t('owner.newProperty.validation.ownerEmailRequired')
      if (!formData.ownerIban) newErrors.ownerIban = t('owner.newProperty.validation.ownerIbanRequired')
      
      if (formData.ownerType === OwnerType.COMPANY) {
        if (!formData.commercialRegistration) newErrors.commercialRegistration = t('owner.newProperty.validation.commercialRegistrationRequired')
        if (!formData.authorizedPersonName) newErrors.authorizedPersonName = t('owner.newProperty.validation.authorizedPersonNameRequired')
        if (!formData.authorizedPersonId) newErrors.authorizedPersonId = t('owner.newProperty.validation.authorizedPersonIdRequired')
      }
    }

    if (step === 5) {
      if (!formData.declarationPropertyAccuracy) newErrors.declarationPropertyAccuracy = t('owner.newProperty.validation.declarationRequired')
      if (!formData.declarationLegalResponsibility) newErrors.declarationLegalResponsibility = t('owner.newProperty.validation.declarationRequired')
      if (!formData.declarationTokenizationApproval) newErrors.declarationTokenizationApproval = t('owner.newProperty.validation.declarationRequired')
      if (!formData.declarationDocumentSharingApproval) newErrors.declarationDocumentSharingApproval = t('owner.newProperty.validation.declarationRequired')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaveDraft = async () => {
    setLoading(true)
    try {
      await fetchJson('/api/properties/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ ...formData, isDraft: true })
      })
      setSuccessMessage('Draft saved successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Draft save error:', error)
      setErrors({ submit: 'Failed to save draft' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(5)) return

    setLoading(true)
    setErrors({})

    try {
      const response = await fetchJson('/api/properties/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ ...formData, isDraft: false })
      })

      // Success - redirect to properties page
      navigate('/owner/properties', {
        state: { 
          message: 'Property submitted successfully! It will be reviewed by an administrator.',
          propertyId: response.propertyId
        }
      })
    } catch (error) {
      console.error('Submission error:', error)
      setErrors({ 
        submit: error.message || 'Failed to submit property. Please try again.' 
      })
    } finally {
      setLoading(false)
    }
  }

  const CurrentStepComponent = STEPS[currentStep - 1].component

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
         <button
  onClick={() => navigate('/owner/properties')}
  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
>
  <ArrowLeft size={20} />
  <span>{t('owner.newProperty.backToProperties')}</span>
</button>
<h1 className="text-3xl font-bold text-gray-900">
  {t('owner.newProperty.pageTitle')}
</h1>
<p className="text-gray-600 mt-2">
  {t('owner.newProperty.pageSubtitle')}
</p>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      currentStep > step.id
                        ? 'bg-green-600 text-white'
                        : currentStep === step.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {currentStep > step.id ? <CheckCircle2 size={20} /> : step.id}
                  </div>
                  <span
  className={`text-xs mt-2 text-center ${
    currentStep === step.id ? 'text-emerald-600 font-medium' : 'text-gray-600'
  }`}
>
  {t(`owner.newProperty.steps.${step.key}.label`)}
</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle2 className="text-green-600" size={20} />
            <span className="text-green-800">{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{errors.submit}</p>
          </div>
        )}

        {/* Current Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <CurrentStepComponent
            formData={formData}
            onChange={setFormData}
            errors={errors}
          />
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowRight size={20} />
  {t('owner.newProperty.nav.back')}
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 border border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
          >
           <Save size={20} />
  {t('owner.newProperty.nav.saveDraft')} {/* add this key */}
          </button>

          {currentStep < STEPS.length ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              {t('owner.newProperty.nav.next')}
  <ArrowLeft size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
             {loading ? (
  <>
    <Loader className="animate-spin" size={20} />
    {t('owner.newProperty.nav.submitting')}
  </>
) : (
  <>
    <Send size={20} />
    {t('owner.newProperty.nav.submit')}
  </>
)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}