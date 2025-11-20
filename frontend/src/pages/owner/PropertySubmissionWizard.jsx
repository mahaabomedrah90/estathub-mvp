import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Save, Send, CheckCircle2, Loader } from 'lucide-react'
import { fetchJson, authHeader, PayoutSchedule, OwnerType } from '../../lib/api'

// Import step components
import Step1LegalVerification from './steps/Step1LegalVerification'
import Step2TechnicalSpec from './steps/Step2TechnicalSpec'
import Step3Financial from './steps/Step3Financial'
import Step4OwnerInfo from './steps/Step4OwnerInfo'
import Step5Compliance from './steps/Step5Compliance'

const STEPS = [
  { id: 1, title: 'Legal Verification', component: Step1LegalVerification },
  { id: 2, title: 'Technical Specification', component: Step2TechnicalSpec },
  { id: 3, title: 'Financial & Tokenization', component: Step3Financial },
  { id: 4, title: 'Owner Information', component: Step4OwnerInfo },
  { id: 5, title: 'Compliance & Agreements', component: Step5Compliance }
]

export default function PropertySubmissionWizard() {
  const navigate = useNavigate()
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
      if (!formData.ownershipType) newErrors.ownershipType = 'Ownership type is required'
      if (!formData.deedNumber) newErrors.deedNumber = 'Deed number is required'
      if (!formData.deedDate) newErrors.deedDate = 'Deed date is required'
      if (!formData.deedAuthority) newErrors.deedAuthority = 'Deed authority is required'
      if (!formData.deedDocumentUrl) newErrors.deedDocumentUrl = 'Deed document is required'
      if (!formData.sitePlanDocumentUrl) newErrors.sitePlanDocumentUrl = 'Site plan is required'
      if (!formData.buildingPermitUrl) newErrors.buildingPermitUrl = 'Building permit is required'
      if (!formData.electricityBillUrl) newErrors.electricityBillUrl = 'Electricity bill is required'
      if (!formData.ownerIdDocumentUrl) newErrors.ownerIdDocumentUrl = 'Owner ID is required'
    }

    if (step === 2) {
      if (!formData.propertyType) newErrors.propertyType = 'Property type is required'
      if (!formData.landArea || Number(formData.landArea) <= 0) newErrors.landArea = 'Valid land area is required'
      if (!formData.builtArea || Number(formData.builtArea) <= 0) newErrors.builtArea = 'Valid built area is required'
      if (!formData.buildingAge) newErrors.buildingAge = 'Building age is required'
      if (!formData.floorsCount) newErrors.floorsCount = 'Number of floors is required'
      if (!formData.unitsCount) newErrors.unitsCount = 'Number of units is required'
      if (!formData.propertyCondition) newErrors.propertyCondition = 'Property condition is required'
      if (!formData.city) newErrors.city = 'City is required'
      if (!formData.district) newErrors.district = 'District is required'
      if (!formData.municipality) newErrors.municipality = 'Municipality is required'
      if (!formData.propertyDescription || formData.propertyDescription.length < 100) {
        newErrors.propertyDescription = 'Description must be at least 100 characters'
      }
      if (!formData.mainImagesUrls || formData.mainImagesUrls.length < 3) {
        newErrors.mainImagesUrls = 'At least 3 property images are required'
      }
    }

    if (step === 3) {
      if (!formData.marketValue || Number(formData.marketValue) <= 0) newErrors.marketValue = 'Market value is required'
      if (!formData.valuationReportUrl) newErrors.valuationReportUrl = 'Valuation report is required'
      if (!formData.totalTokens || Number(formData.totalTokens) <= 0) newErrors.totalTokens = 'Total tokens is required'
      if (!formData.tokenPrice || Number(formData.tokenPrice) <= 0) newErrors.tokenPrice = 'Token price is required'
      if (!formData.expectedROI) newErrors.expectedROI = 'Expected ROI is required'
      if (!formData.expectedMonthlyYield) newErrors.expectedMonthlyYield = 'Expected monthly yield is required'
    }

    if (step === 4) {
      if (!formData.ownerName) newErrors.ownerName = 'Owner name is required'
      if (!formData.nationalIdOrCR) newErrors.nationalIdOrCR = 'National ID or CR is required'
      if (!formData.ownerPhone) newErrors.ownerPhone = 'Phone number is required'
      if (!formData.ownerEmail) newErrors.ownerEmail = 'Email is required'
      if (!formData.ownerIban) newErrors.ownerIban = 'IBAN is required'
      
      if (formData.ownerType === OwnerType.COMPANY) {
        if (!formData.commercialRegistration) newErrors.commercialRegistration = 'Commercial registration is required'
        if (!formData.authorizedPersonName) newErrors.authorizedPersonName = 'Authorized person name is required'
        if (!formData.authorizedPersonId) newErrors.authorizedPersonId = 'Authorized person ID is required'
      }
    }

    if (step === 5) {
      if (!formData.declarationPropertyAccuracy) newErrors.declarationPropertyAccuracy = 'This declaration is required'
      if (!formData.declarationLegalResponsibility) newErrors.declarationLegalResponsibility = 'This declaration is required'
      if (!formData.declarationTokenizationApproval) newErrors.declarationTokenizationApproval = 'This declaration is required'
      if (!formData.declarationDocumentSharingApproval) newErrors.declarationDocumentSharingApproval = 'This declaration is required'
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
            <span>Back to Properties</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Submit New Property</h1>
          <p className="text-gray-600 mt-2">Complete all steps to submit your property for tokenization</p>
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
                  <span className={`text-xs mt-2 text-center ${
                    currentStep === step.id ? 'text-emerald-600 font-medium' : 'text-gray-600'
                  }`}>
                    {step.title}
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
            <ArrowLeft size={20} />
            Previous
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 border border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            <Save size={20} />
            Save Draft
          </button>

          {currentStep < STEPS.length ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Next
              <ArrowRight size={20} />
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
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Submit Property
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}