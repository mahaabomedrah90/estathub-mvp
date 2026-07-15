import React from 'react'
import { Shield, AlertCircle } from 'lucide-react'
import FileUpload from '../../../components/FileUpload'
import { OwnershipType, OwnershipTypeLabels } from '../../../lib/api'
import { useTranslation } from 'react-i18next';



export default function Step1LegalVerification({ formData, onChange, errors = {} }) {
  const { t } = useTranslation('pages');
  const handleChange = (field, value) => {
    onChange({ ...formData, [field]: value })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-border-soft">
        <div className="w-14 h-14 bg-brand-primary/10 rounded-2xl flex items-center justify-center">
          <Shield className="text-brand-primary" size={28} />
        </div>
        <div>
         <h2 className="text-2xl font-bold text-brand-primary">
  {t('owner.newProperty.step1.title')}
</h2>
<p className="text-text-muted mt-1">
  {t('owner.newProperty.step1.subtitle')}
</p>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-brand-accent-soft border border-brand-accent/30 rounded-2xl p-6 flex items-start gap-4">
        <AlertCircle className="text-brand-accent flex-shrink-0 mt-0.5" size={24} />
        <div className="text-sm text-brand-primary">
          <p className="font-semibold mb-2">
  {t('owner.newProperty.step1.infoBoxTitle')}
</p>
<p className="leading-relaxed">
  {t('owner.newProperty.step1.infoBoxBody')}
</p>
        </div>
      </div>

      {/* Ownership Type */}
      <div>
        <label className="block text-sm font-semibold text-text-body mb-3">
         {t('owner.newProperty.step1.ownershipTypeLabel')} <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.ownershipType}
          onChange={(e) => handleChange('ownershipType', e.target.value)}
          className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
        >
         <option value="">
  {t('owner.newProperty.step1.ownershipTypePlaceholder')}
</option>
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
          <label className="block text-sm font-semibold text-text-body mb-3">
          {t('owner.newProperty.step1.deedNumberLabel')} <span className="text-red-500">*</span>
          </label>
        <input
  type="text"
  value={formData.deedNumber}
  onChange={(e) => handleChange('deedNumber', e.target.value)}
  placeholder={t('owner.newProperty.step1.deedNumberPlaceholder')}
  className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
/>
          {errors.deedNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.deedNumber}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-body mb-3">
           {t('owner.newProperty.step1.deedDateLabel')} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.deedDate}
            onChange={(e) => handleChange('deedDate', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
          />
          {errors.deedDate && (
            <p className="mt-1 text-sm text-red-600">{errors.deedDate}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-text-body mb-3">
         {t('owner.newProperty.step1.deedAuthorityLabel')} <span className="text-red-500">*</span>
        </label>
      <input
  type="text"
  value={formData.deedAuthority}
  onChange={(e) => handleChange('deedAuthority', e.target.value)}
  placeholder={t('owner.newProperty.step1.deedAuthorityPlaceholder')}
  className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
/>
        {errors.deedAuthority && (
          <p className="mt-1 text-sm text-red-600">{errors.deedAuthority}</p>
        )}
      </div>

      {/* Document Uploads */}
      <div className="space-y-4 pt-4">
        <h3 className="text-xl font-semibold text-brand-primary mb-6">
  {t('owner.newProperty.step1.infoBoxTitle')}
</h3>
        <FileUpload
          label={t('owner.newProperty.step1.propertyDeedDocument')}
         
          required
          accept=".pdf,.jpg,.jpeg,.png"
          value={formData.deedDocumentUrl}
          onChange={(url) => handleChange('deedDocumentUrl', url)}
          documentType="deed"
        />

        <FileUpload
          label={t('owner.newProperty.step1.sitePlanDocument')}
          
          required
          accept=".pdf,.jpg,.jpeg,.png"
          value={formData.sitePlanDocumentUrl}
          onChange={(url) => handleChange('sitePlanDocumentUrl', url)}
          documentType="sitePlan"
        />

        <FileUpload
          label={t('owner.newProperty.step1.buildingPermit')}
          required
          accept=".pdf,.jpg,.jpeg,.png"
          value={formData.buildingPermitUrl}
          onChange={(url) => handleChange('buildingPermitUrl', url)}
          documentType="buildingPermit"
        />

        <FileUpload
          label={t('owner.newProperty.step1.electricityBill')}
          required
          accept=".pdf,.jpg,.jpeg,.png"
          value={formData.electricityBillUrl}
          onChange={(url) => handleChange('electricityBillUrl', url)}
          documentType="electricityBill"
        />

        <FileUpload
          label={t('owner.newProperty.step1.waterBill')}
          accept=".pdf,.jpg,.jpeg,.png"
          value={formData.waterBillUrl}
          onChange={(url) => handleChange('waterBillUrl', url)}
          documentType="waterBill"
        />

        <FileUpload
          label={t('owner.newProperty.step1.ownerIdDocument')}
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