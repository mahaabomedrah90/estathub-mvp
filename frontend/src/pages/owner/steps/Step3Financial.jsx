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
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
          <Coins className="text-purple-600" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('financialTokenization')}</h2>
          <p className="text-sm text-gray-600">{t('valuationTokenStructure')}</p>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">
  {t('owner.newProperty.step3.infoBoxTitle')}
</p>
          <p>{t('defineTokenizedProperty')}</p>
        </div>
      </div>

      {/* Market Valuation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('marketValue')} <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={formData.marketValue}
          onChange={(e) => handleChange('marketValue', e.target.value)}
          placeholder="e.g., 2000000"
          min="0"
          step="1000"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calculator size={20} />
          {t('tokenizationStructure')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('totalTokens')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.totalTokens}
              onChange={(e) => handleChange('totalTokens', e.target.value)}
              placeholder="e.g., 10000"
              min="1"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {errors.totalTokens && (
              <p className="mt-1 text-sm text-red-600">{errors.totalTokens}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('tokenPrice')} (SAR)<span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.tokenPrice}
              onChange={(e) => handleChange('tokenPrice', e.target.value)}
              placeholder="e.g., 200"
              min="1"
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {errors.tokenPrice && (
              <p className="mt-1 text-sm text-red-600">{errors.tokenPrice}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            {t('ownerRetainedPercentageDescription')}
          </p>
          {errors.ownerRetainedPercentage && (
            <p className="mt-1 text-sm text-red-600">{errors.ownerRetainedPercentage}</p>
          )}
        </div>

        {/* Calculation Summary */}
        {formData.totalTokens && formData.tokenPrice && (
          <div className="bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calculator size={18} />
              {t('tokenDistributionSummary')}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4">
                 <p className="text-sm text-gray-600 mb-1">
  {t('availableForSale')}
</p>
<p className="text-2xl font-bold text-emerald-600">
  {t('availableTokensLabel', { count: calculations.availableTokens.toLocaleString() })}
</p>
<p className="text-xs text-gray-500 mt-1">
  {t('availableTokensValue', { value: calculations.totalTokenValue.toLocaleString() })}
</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">
                  {t('ownerRetained')}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {t('retainedTokensLabel', { count: calculations.retainedTokens.toLocaleString() })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('ownerRetainedValue', { value: calculations.ownerRetainedValue.toLocaleString() })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expected Returns */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp size={20} />
          {t('expectedReturns')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('expectedAnnualROI')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.expectedROI}
              onChange={(e) => handleChange('expectedROI', e.target.value)}
              placeholder="e.g., 8"
              min="0"
              step="0.1"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {errors.expectedROI && (
              <p className="mt-1 text-sm text-red-600">{errors.expectedROI}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('expectedMonthlyYield')} <span className="text-red-500">*</span>
            </label>
            <input  
              type="number"
              value={formData.expectedMonthlyYield}
              onChange={(e) => handleChange('expectedMonthlyYield', e.target.value)}
              placeholder="e.g., 0.67"
              min="0"
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('payoutSchedule')} <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.payoutSchedule}
          onChange={(e) => handleChange('payoutSchedule', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
