import React from 'react'
import { User, Building, AlertCircle, CheckCircle2 } from 'lucide-react'
import { OwnerType, OwnerTypeLabels, validateNationalId, validatePhone, validateIban } from '../../../lib/api'

export default function Step4OwnerInfo({ formData, onChange, errors = {} }) {
  const [validations, setValidations] = React.useState({
    nationalId: null,
    phone: null,
    iban: null
  })

  const handleChange = (field, value) => {
    onChange({ ...formData, [field]: value })

    // Real-time validation
    if (field === 'nationalIdOrCR') {
      setValidations(prev => ({ ...prev, nationalId: validateNationalId(value) }))
    } else if (field === 'ownerPhone') {
      setValidations(prev => ({ ...prev, phone: validatePhone(value) }))
    } else if (field === 'ownerIban') {
      setValidations(prev => ({ ...prev, iban: validateIban(value) }))
    }
  }

  const isCompany = formData.ownerType === OwnerType.COMPANY

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
          <User className="text-indigo-600" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Owner Information</h2>
          <p className="text-sm text-gray-600">معلومات المالك - Contact and banking details</p>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Important Information</p>
          <p>This information will be used for payouts and official communications. Please ensure all details are accurate.</p>
        </div>
      </div>

      {/* Owner Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Owner Type / نوع المالك <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(OwnerTypeLabels).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleChange('ownerType', key)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                formData.ownerType === key
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {key === OwnerType.INDIVIDUAL ? (
                  <User className={formData.ownerType === key ? 'text-emerald-600' : 'text-gray-400'} size={24} />
                ) : (
                  <Building className={formData.ownerType === key ? 'text-emerald-600' : 'text-gray-400'} size={24} />
                )}
                <span className={`font-medium ${formData.ownerType === key ? 'text-emerald-900' : 'text-gray-700'}`}>
                  {label}
                </span>
              </div>
            </button>
          ))}
        </div>
        {errors.ownerType && (
          <p className="mt-1 text-sm text-red-600">{errors.ownerType}</p>
        )}
      </div>

      {/* Basic Information */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {isCompany ? 'Company Information' : 'Personal Information'}
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isCompany ? 'Company Name / اسم الشركة' : 'Full Name / الاسم الكامل'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.ownerName}
            onChange={(e) => handleChange('ownerName', e.target.value)}
            placeholder={isCompany ? 'e.g., ABC Real Estate Company' : 'e.g., Ahmed Mohammed Al-Saud'}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          {errors.ownerName && (
            <p className="mt-1 text-sm text-red-600">{errors.ownerName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isCompany ? 'Commercial Registration / السجل التجاري' : 'National ID / رقم الهوية'} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.nationalIdOrCR}
              onChange={(e) => handleChange('nationalIdOrCR', e.target.value)}
              placeholder={isCompany ? 'e.g., 1234567890' : 'e.g., 1234567890 (10 digits)'}
              maxLength={10}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {formData.nationalIdOrCR && validations.nationalId !== null && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {validations.nationalId ? (
                  <CheckCircle2 className="text-green-600" size={20} />
                ) : (
                  <AlertCircle className="text-red-600" size={20} />
                )}
              </div>
            )}
          </div>
          {!isCompany && formData.nationalIdOrCR && !validations.nationalId && (
            <p className="mt-1 text-sm text-amber-600">
              National ID must be 10 digits starting with 1 or 2
            </p>
          )}
          {errors.nationalIdOrCR && (
            <p className="mt-1 text-sm text-red-600">{errors.nationalIdOrCR}</p>
          )}
        </div>

        {/* Company-specific fields */}
        {isCompany && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commercial Registration Number / رقم السجل التجاري <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.commercialRegistration}
                onChange={(e) => handleChange('commercialRegistration', e.target.value)}
                placeholder="e.g., 1010123456"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {errors.commercialRegistration && (
                <p className="mt-1 text-sm text-red-600">{errors.commercialRegistration}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authorized Person Name / اسم المفوض <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.authorizedPersonName}
                  onChange={(e) => handleChange('authorizedPersonName', e.target.value)}
                  placeholder="e.g., Mohammed Ahmed"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                {errors.authorizedPersonName && (
                  <p className="mt-1 text-sm text-red-600">{errors.authorizedPersonName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authorized Person ID / هوية المفوض <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.authorizedPersonId}
                  onChange={(e) => handleChange('authorizedPersonId', e.target.value)}
                  placeholder="e.g., 1234567890"
                  maxLength={10}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                {errors.authorizedPersonId && (
                  <p className="mt-1 text-sm text-red-600">{errors.authorizedPersonId}</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Contact Information */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number / رقم الجوال <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                value={formData.ownerPhone}
                onChange={(e) => handleChange('ownerPhone', e.target.value)}
                placeholder="e.g., 0501234567 or +966501234567"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {formData.ownerPhone && validations.phone !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {validations.phone ? (
                    <CheckCircle2 className="text-green-600" size={20} />
                  ) : (
                    <AlertCircle className="text-red-600" size={20} />
                  )}
                </div>
              )}
            </div>
            {formData.ownerPhone && !validations.phone && (
              <p className="mt-1 text-sm text-amber-600">
                Enter valid Saudi phone number (05XXXXXXXX)
              </p>
            )}
            {errors.ownerPhone && (
              <p className="mt-1 text-sm text-red-600">{errors.ownerPhone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address / البريد الإلكتروني <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.ownerEmail}
              onChange={(e) => handleChange('ownerEmail', e.target.value)}
              placeholder="e.g., owner@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {errors.ownerEmail && (
              <p className="mt-1 text-sm text-red-600">{errors.ownerEmail}</p>
            )}
          </div>
        </div>
      </div>

      {/* Banking Information */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-semibold text-gray-900">Banking Information</h3>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Payout Account</p>
            <p>This IBAN will be used for all rental income distributions. Ensure it's correct and active.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            IBAN / رقم الآيبان <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.ownerIban}
              onChange={(e) => handleChange('ownerIban', e.target.value.toUpperCase())}
              placeholder="e.g., SA0380000000608010167519"
              maxLength={24}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
            />
            {formData.ownerIban && validations.iban !== null && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {validations.iban ? (
                  <CheckCircle2 className="text-green-600" size={20} />
                ) : (
                  <AlertCircle className="text-red-600" size={20} />
                )}
              </div>
            )}
          </div>
          {formData.ownerIban && !validations.iban && (
            <p className="mt-1 text-sm text-amber-600">
              IBAN must start with SA followed by 22 digits
            </p>
          )}
          {errors.ownerIban && (
            <p className="mt-1 text-sm text-red-600">{errors.ownerIban}</p>
          )}
        </div>
      </div>
    </div>
  )
}