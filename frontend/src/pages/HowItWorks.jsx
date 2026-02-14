import React from 'react'
import { UserPlus, Search, DollarSign, Shield, TrendingUp, Wallet, FileCheck, BarChart3, ArrowRight, CheckCircle2, Clock, Users, Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function HowItWorks() {
  const { t } = useTranslation('pages')
  const { i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'

  return (
    <div className="max-w-4xl mx-auto space-y-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('howItWorks.title')}</h1>
        <p className="text-lg text-gray-600">{t('howItWorks.subtitle')}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="text-emerald-600" size={28} />
          <h2 className="text-2xl font-semibold text-gray-900">{t('howItWorks.forInvestors.title')}</h2>
        </div>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="bg-emerald-100 rounded-full p-3">
                <UserPlus className="text-emerald-600" size={20} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('howItWorks.forInvestors.steps.createAccount.title')}</h3>
              <p className="text-gray-600">{t('howItWorks.forInvestors.steps.createAccount.description')}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="bg-blue-100 rounded-full p-3">
                <Search className="text-blue-600" size={20} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('howItWorks.forInvestors.steps.exploreOpportunities.title')}</h3>
              <p className="text-gray-600">{t('howItWorks.forInvestors.steps.exploreOpportunities.description')}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="bg-purple-100 rounded-full p-3">
                <DollarSign className="text-purple-600" size={20} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('howItWorks.forInvestors.steps.invest.title')}</h3>
              <p className="text-gray-600">{t('howItWorks.forInvestors.steps.invest.description')}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="bg-orange-100 rounded-full p-3">
                <BarChart3 className="text-orange-600" size={20} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('howItWorks.forInvestors.steps.trackPerformance.title')}</h3>
              <p className="text-gray-600">{t('howItWorks.forInvestors.steps.trackPerformance.description')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="text-blue-600" size={28} />
          <h2 className="text-2xl font-semibold text-gray-900">{t('howItWorks.forPropertyOwners.title')}</h2>
        </div>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="bg-blue-100 rounded-full p-3">
                <FileCheck className="text-blue-600" size={20} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('howItWorks.forPropertyOwners.steps.registerAsOwner.title')}</h3>
              <p className="text-gray-600">{t('howItWorks.forPropertyOwners.steps.registerAsOwner.description')}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="bg-emerald-100 rounded-full p-3">
                <Wallet className="text-emerald-600" size={20} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('howItWorks.forPropertyOwners.steps.submitProperty.title')}</h3>
              <p className="text-gray-600">{t('howItWorks.forPropertyOwners.steps.submitProperty.description')}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="bg-purple-100 rounded-full p-3">
                <Users className="text-purple-600" size={20} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('howItWorks.forPropertyOwners.steps.reachInvestors.title')}</h3>
              <p className="text-gray-600">{t('howItWorks.forPropertyOwners.steps.reachInvestors.description')}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="bg-orange-100 rounded-full p-3">
                <Clock className="text-orange-600" size={20} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('howItWorks.forPropertyOwners.steps.manageInvestment.title')}</h3>
              <p className="text-gray-600">{t('howItWorks.forPropertyOwners.steps.manageInvestment.description')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 rounded-xl p-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-white" size={28} />
          <h2 className="text-2xl font-semibold">{t('howItWorks.securityGuarantees.title')}</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <CheckCircle2 className="text-white mx-auto mb-2" size={24} />
            <h3 className="font-medium mb-1">{t('howItWorks.securityGuarantees.identityVerification.title')}</h3>
            <p className="text-sm text-emerald-100">{t('howItWorks.securityGuarantees.identityVerification.description')}</p>
          </div>
          <div className="text-center">
            <Building2 className="text-white mx-auto mb-2" size={24} />
            <h3 className="font-medium mb-1">{t('howItWorks.securityGuarantees.propertyEvaluation.title')}</h3>
            <p className="text-sm text-emerald-100">{t('howItWorks.securityGuarantees.propertyEvaluation.description')}</p>
          </div>
          <div className="text-center">
            <Shield className="text-white mx-auto mb-2" size={24} />
            <h3 className="font-medium mb-1">{t('howItWorks.securityGuarantees.blockchain.title')}</h3>
            <p className="text-sm text-emerald-100">{t('howItWorks.securityGuarantees.blockchain.description')}</p>
          </div>
          <div className="text-center">
            <FileCheck className="text-white mx-auto mb-2" size={24} />
            <h3 className="font-medium mb-1">{t('howItWorks.securityGuarantees.regulatoryCompliance.title')}</h3>
            <p className="text-sm text-emerald-100">{t('howItWorks.securityGuarantees.regulatoryCompliance.description')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
