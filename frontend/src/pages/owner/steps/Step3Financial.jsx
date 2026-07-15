import React, { useEffect, useState } from 'react'
import { Coins, Calculator, AlertCircle, TrendingUp } from 'lucide-react'
import FileUpload from '../../../components/FileUpload'
import { PayoutSchedule, PayoutScheduleLabels, calculateAvailableTokens } from '../../../lib/api'
import { useTranslation } from 'react-i18next';

export default function Step3Financial({ formData, onChange, errors = {} }) {
  const { t } = useTranslation('pages');
  
  const [calculations, setCalculations] = useState({
    availableTokens: 0,
    retainedTokens: 0,
    totalTokenValue: 0,
    ownerRetainedValue: 0
  })

  const handleChange = (field, value) => {
    onChange({ ...formData, [field]: value })
  }

  // Calculate token distribution
  useEffect(() => {
    const totalTokens = Number(formData.totalTokens) || 0
    const tokenPrice = Number(formData.tokenPrice) || 0
    const retainedPct = Number(formData.ownerRetainedPercentage) || 0

    const retainedTokens = Math.floor((totalTokens * retainedPct) / 100)
    const availableTokens = totalTokens - retainedTokens
    const totalTokenValue = availableTokens * tokenPrice
    const ownerRetainedValue = retainedTokens * tokenPrice

    setCalculations({
      availableTokens,
      retainedTokens,
      totalTokenValue,
      ownerRetainedValue
    })
  }, [formData.totalTokens, formData.tokenPrice, formData.ownerRetainedPercentage])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-border-soft">
        <div className="w-14 h-14 bg-brand-coral/10 rounded-2xl flex items-center justify-center">
          <Coins className="text-brand-coral" size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-brand-primary">{t('financialTokenization')}</h2>
          <p className="text-text-muted mt-1">{t('valuationTokenStructure')}</p>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-brand-accent-soft border border-brand-accent/30 rounded-2xl p-6 flex items-start gap-4">
        <AlertCircle className="text-brand-accent flex-shrink-0 mt-0.5" size={24} />
        <div className="text-sm text-brand-primary">
          <p className="font-semibold mb-2">
  {t('owner.newProperty.step3.infoBoxTitle')}
</p>
          <p className="leading-relaxed">{t('defineTokenizedProperty')}</p>
        </div>
      </div>

      {/* Market Valuation */}
      <div>
        <label className="block text-sm font-semibold text-text-body mb-3">
          {t('marketValue')} <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={formData.marketValue}
          onChange={(e) => handleChange('marketValue', e.target.value)}
          placeholder="e.g., 2000000"
          min="0"
          step="1000"
          className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
        />
        {errors.marketValue && (
          <p className="mt-1 text-sm text-red-600">{errors.marketValue}</p>
        )}
      </div>

      {/* Valuation Report */}
      <FileUpload
        label={t('valuationReport')}
        required
        accept=".pdf"
        value={formData.valuationReportUrl}
        onChange={(url) => handleChange('valuationReportUrl', url)}
        documentType="valuationReport"
      />

      {/* Tokenization Structure */}
      <div className="space-y-4 pt-4">
        <h3 className="text-xl font-semibold text-brand-primary flex items-center gap-3">
          <Calculator size={24} />
          {t('tokenizationStructure')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-text-body mb-3">
              {t('totalTokens')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.totalTokens}
              onChange={(e) => handleChange('totalTokens', e.target.value)}
              placeholder="e.g., 10000"
              min="1"
              className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
            />
            {errors.totalTokens && (
              <p className="mt-1 text-sm text-red-600">{errors.totalTokens}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-body mb-3">
                {t('tokenPrice')} (SAR)<span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.tokenPrice}
              onChange={(e) => handleChange('tokenPrice', e.target.value)}
              placeholder="e.g., 200"
              min="1"
              step="0.01"
              className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
            />
            {errors.tokenPrice && (
              <p className="mt-1 text-sm text-red-600">{errors.tokenPrice}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-body mb-3">
            {t('ownerRetainedPercentage')} <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.ownerRetainedPercentage}
            onChange={(e) => handleChange('ownerRetainedPercentage', e.target.value)}
            placeholder="e.g., 20"
            min="0"
            max="100"
            step="0.1"
            className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
          />
          <p className="mt-2 text-xs text-text-muted">
            {t('ownerRetainedPercentageDescription')}
          </p>
          {errors.ownerRetainedPercentage && (
            <p className="mt-1 text-sm text-red-600">{errors.ownerRetainedPercentage}</p>
          )}
        </div>

        {/* Calculation Summary */}
        {formData.totalTokens && formData.tokenPrice && (
          <div className="bg-gradient-to-br from-brand-accent-soft to-brand-primary/5 border border-brand-accent/30 rounded-2xl p-8">
            <h4 className="font-bold text-brand-primary mb-6 flex items-center gap-3">
              <Calculator size={20} />
              {t('tokenDistributionSummary')}
            </h4>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-surface-card rounded-2xl p-6 shadow-sm">
                 <p className="text-sm text-text-muted mb-2">
  {t('availableForSale')}
</p>
<p className="text-3xl font-bold text-brand-accent">
  {t('availableTokensLabel', { count: calculations.availableTokens.toLocaleString() })}
</p>
<p className="text-xs text-text-muted mt-2">
  {t('availableTokensValue', { value: calculations.totalTokenValue.toLocaleString() })}
</p>
              </div>
              <div className="bg-surface-card rounded-2xl p-6 shadow-sm">
                <p className="text-sm text-text-muted mb-2">
                  {t('ownerRetained')}
                </p>
                <p className="text-3xl font-bold text-brand-primary">
                  {t('retainedTokensLabel', { count: calculations.retainedTokens.toLocaleString() })}
                </p>
                <p className="text-xs text-text-muted mt-2">
                  {t('ownerRetainedValue', { value: calculations.ownerRetainedValue.toLocaleString() })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expected Returns */}
      <div className="space-y-4 pt-4">
        <h3 className="text-xl font-semibold text-brand-primary flex items-center gap-3">
          <TrendingUp size={24} />
          {t('expectedReturns')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-text-body mb-3">
                {t('expectedAnnualROI')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.expectedROI}
              onChange={(e) => handleChange('expectedROI', e.target.value)}
              placeholder="e.g., 8"
              min="0"
              step="0.1"
              className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
            />
            {errors.expectedROI && (
              <p className="mt-1 text-sm text-red-600">{errors.expectedROI}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-body mb-3">
                {t('expectedMonthlyYield')} <span className="text-red-500">*</span>
            </label>
            <input  
              type="number"
              value={formData.expectedMonthlyYield}
              onChange={(e) => handleChange('expectedMonthlyYield', e.target.value)}
              placeholder="e.g., 0.67"
              min="0"
              step="0.01"
              className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
            />
            {errors.expectedMonthlyYield && (
              <p className="mt-1 text-sm text-red-600">{errors.expectedMonthlyYield}</p>
            )}
          </div>
        </div>

        {/* ROI Validation */}
        {formData.expectedROI && formData.expectedMonthlyYield && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">  {t('roiConsistencyCheck')}</p>
                <p>
                  {t('monthlyYield')} × 12 = {(Number(formData.expectedMonthlyYield) * 12).toFixed(2)}%
                  {Math.abs((Number(formData.expectedMonthlyYield) * 12) - Number(formData.expectedROI)) > 0.5 && (
                    <span className="text-red-600 font-medium"> ⚠️ {t('roiDoesntMatch')} ({formData.expectedROI}%)</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payout Schedule */}
      <div>
        <label className="block text-sm font-semibold text-text-body mb-3">
            {t('payoutSchedule')} <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.payoutSchedule}
          onChange={(e) => handleChange('payoutSchedule', e.target.value)}
          className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
        >
          {Object.entries(PayoutScheduleLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        {errors.payoutSchedule && (
          <p className="mt-1 text-sm text-red-600">{errors.payoutSchedule}</p>
        )}
      </div>
    </div>
  )
}
