import React from 'react'
import { Shield, AlertCircle } from 'lucide-react'
import FileUpload from '../../../components/FileUpload'
import { OwnershipType, OwnershipTypeLabels } from '../../../lib/api'

export default function Step1LegalVerification({ formData, onChange, errors = {} }) {
  const handleChange = (field, value) => {
    onChange({ ...formData, [field]: value })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
          <Shield className="text-emerald-600" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Legal Verification</h2>
          <p className="text-sm text-gray-600">التحقق القانوني - Property ownership and legal documents</p>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Required Documents</p>
          <p>Please upload all required legal documents. All documents must be clear, valid, and in PDF or image format (max 10MB each).</p>
        </div>
      </div>

      {/* Ownership Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ownership Type / نوع الملكية <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.ownershipType}
          onChange={(e) => handleChange('ownershipType', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">Select ownership type</option>
          {Object.entries(OwnershipTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        {errors.ownershipType && (
          <p className="mt-1 text-sm text-red-600">{errors.ownershipType}</p>
        )}
      </div>

      {/* Deed Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deed Number / رقم الصك <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.deedNumber}
            onChange={(e) => handleChange('deedNumber', e.target.value)}
            placeholder="Enter deed number"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          {errors.deedNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.deedNumber}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deed Date / تاريخ الصك <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.deedDate}
            onChange={(e) => handleChange('deedDate', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          {errors.deedDate && (
            <p className="mt-1 text-sm text-red-600">{errors.deedDate}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Deed Issuing Authority / جهة إصدار الصك <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.deedAuthority}
          onChange={(e) => handleChange('deedAuthority', e.target.value)}
          placeholder="e.g., Ministry of Justice - Riyadh"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        {errors.deedAuthority && (
          <p className="mt-1 text-sm text-red-600">{errors.deedAuthority}</p>
        )}
      </div>

      {/* Document Uploads */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-semibold text-gray-900">Required Documents</h3>
        
        <FileUpload
          label="Property Deed Document"
          labelAr="صك الملكية"
          required
          accept=".pdf,.jpg,.jpeg,.png"
          value={formData.deedDocumentUrl}
          onChange={(url) => handleChange('deedDocumentUrl', url)}
          documentType="deed"
        />

        <FileUpload
          label="Site Plan Document"
          labelAr="مخطط الموقع"
          required
          accept=".pdf,.jpg,.jpeg,.png"
          value={formData.sitePlanDocumentUrl}
          onChange={(url) => handleChange('sitePlanDocumentUrl', url)}
          documentType="sitePlan"
        />

        <FileUpload
          label="Building Permit"
          labelAr="رخصة البناء"
          required
          accept=".pdf,.jpg,.jpeg,.png"
          value={formData.buildingPermitUrl}
          onChange={(url) => handleChange('buildingPermitUrl', url)}
          documentType="buildingPermit"
        />

        <FileUpload
          label="Electricity Bill"
          labelAr="فاتورة الكهرباء"
          required
          accept=".pdf,.jpg,.jpeg,.png"
          value={formData.electricityBillUrl}
          onChange={(url) => handleChange('electricityBillUrl', url)}
          documentType="electricityBill"
        />

        <FileUpload
          label="Water Bill (Optional)"
          labelAr="فاتورة المياه"
          accept=".pdf,.jpg,.jpeg,.png"
          value={formData.waterBillUrl}
          onChange={(url) => handleChange('waterBillUrl', url)}
          documentType="waterBill"
        />

        <FileUpload
          label="Owner ID Document"
          labelAr="هوية المالك"
          required
          accept=".pdf,.jpg,.jpeg,.png"
          value={formData.ownerIdDocumentUrl}
          onChange={(url) => handleChange('ownerIdDocumentUrl', url)}
          documentType="ownerId"
        />
      </div>
    </div>
  )
}