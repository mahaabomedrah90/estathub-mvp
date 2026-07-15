import React from 'react'
import { UserPlus, Search, DollarSign, Shield, TrendingUp, Wallet, FileCheck, BarChart3, ArrowRight, CheckCircle2, Clock, Users, Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import PageWrapper from '../components/ui/PageWrapper'
import HeroSection from '../components/ui/HeroSection'
import SectionCard from '../components/ui/SectionCard'
import IconBox from '../components/ui/IconBox'

export default function HowItWorks() {
  const { t } = useTranslation('pages')
  const { i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'

  return (
    <PageWrapper size="narrow" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <HeroSection 
        title={t('howItWorks.title')}
        subtitle={t('howItWorks.subtitle')}
      />

      {/* For Investors Section */}
      <SectionCard padding="lg" className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <IconBox size="md" variant="default">
            <TrendingUp size={22} />
          </IconBox>
          <h2 className="text-xl font-bold text-text-strong">{t('howItWorks.forInvestors.title')}</h2>
        </div>
        <div className="space-y-6">
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-brand-accent-soft rounded-xl flex items-center justify-center">
                <UserPlus className="text-brand-accent" size={20} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-strong mb-3">{t('howItWorks.forInvestors.steps.createAccount.title')}</h3>
              <p className="text-sm text-text-body leading-6">{t('howItWorks.forInvestors.steps.createAccount.description')}</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-brand-primary/5 rounded-xl flex items-center justify-center">
                <Search className="text-brand-primary" size={20} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-strong mb-3">{t('howItWorks.forInvestors.steps.exploreOpportunities.title')}</h3>
              <p className="text-sm text-text-body leading-6">{t('howItWorks.forInvestors.steps.exploreOpportunities.description')}</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-brand-accent-soft rounded-xl flex items-center justify-center">
                <DollarSign className="text-brand-accent" size={20} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-strong mb-3">{t('howItWorks.forInvestors.steps.invest.title')}</h3>
              <p className="text-sm text-text-body leading-6">{t('howItWorks.forInvestors.steps.invest.description')}</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-brand-primary/5 rounded-xl flex items-center justify-center">
                <BarChart3 className="text-brand-primary" size={20} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-strong mb-3">{t('howItWorks.forInvestors.steps.trackPerformance.title')}</h3>
              <p className="text-sm text-text-body leading-6">{t('howItWorks.forInvestors.steps.trackPerformance.description')}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* For Property Owners Section */}
      <SectionCard padding="lg" className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <IconBox size="md" variant="primary">
            <Building2 size={22} />
          </IconBox>
          <h2 className="text-xl font-bold text-text-strong">{t('howItWorks.forPropertyOwners.title')}</h2>
        </div>
        <div className="space-y-6">
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-brand-primary/5 rounded-xl flex items-center justify-center">
                <FileCheck className="text-brand-primary" size={20} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-strong mb-3">{t('howItWorks.forPropertyOwners.steps.registerAsOwner.title')}</h3>
              <p className="text-sm text-text-body leading-6">{t('howItWorks.forPropertyOwners.steps.registerAsOwner.description')}</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-brand-accent-soft rounded-xl flex items-center justify-center">
                <Wallet className="text-brand-accent" size={20} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-strong mb-3">{t('howItWorks.forPropertyOwners.steps.submitProperty.title')}</h3>
              <p className="text-sm text-text-body leading-6">{t('howItWorks.forPropertyOwners.steps.submitProperty.description')}</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-brand-primary/5 rounded-xl flex items-center justify-center">
                <Users className="text-brand-primary" size={20} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-strong mb-3">{t('howItWorks.forPropertyOwners.steps.reachInvestors.title')}</h3>
              <p className="text-sm text-text-body leading-6">{t('howItWorks.forPropertyOwners.steps.reachInvestors.description')}</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-brand-accent-soft rounded-xl flex items-center justify-center">
                <Clock className="text-brand-accent" size={20} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-strong mb-3">{t('howItWorks.forPropertyOwners.steps.manageInvestment.title')}</h3>
              <p className="text-sm text-text-body leading-6">{t('howItWorks.forPropertyOwners.steps.manageInvestment.description')}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Security & Guarantees Section */}
      <div className="bg-brand-primary rounded-2xl p-8 text-white text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
            <Shield className="text-brand-accent" size={24} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{t('howItWorks.securityGuarantees.title')}</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center bg-white/10 border border-white/10 rounded-xl p-6">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="text-white" size={20} />
            </div>
            <h3 className="font-semibold text-white mb-3">{t('howItWorks.securityGuarantees.identityVerification.title')}</h3>
            <p className="text-white/70 text-sm leading-relaxed">{t('howItWorks.securityGuarantees.identityVerification.description')}</p>
          </div>
          <div className="text-center bg-white/10 border border-white/10 rounded-xl p-6">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="text-white" size={20} />
            </div>
            <h3 className="font-semibold text-white mb-3">{t('howItWorks.securityGuarantees.propertyEvaluation.title')}</h3>
            <p className="text-white/70 text-sm leading-relaxed">{t('howItWorks.securityGuarantees.propertyEvaluation.description')}</p>
          </div>
          <div className="text-center bg-white/10 border border-white/10 rounded-xl p-6">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="text-white" size={20} />
            </div>
            <h3 className="font-semibold text-white mb-3">{t('howItWorks.securityGuarantees.blockchain.title')}</h3>
            <p className="text-white/70 text-sm leading-relaxed">{t('howItWorks.securityGuarantees.blockchain.description')}</p>
          </div>
          <div className="text-center bg-white/10 border border-white/10 rounded-xl p-6">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileCheck className="text-white" size={20} />
            </div>
            <h3 className="font-semibold text-white mb-3">{t('howItWorks.securityGuarantees.regulatoryCompliance.title')}</h3>
            <p className="text-white/70 text-sm leading-relaxed">{t('howItWorks.securityGuarantees.regulatoryCompliance.description')}</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
