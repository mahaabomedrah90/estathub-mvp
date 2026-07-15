import React from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Building2, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import SectionCard from '../components/ui/SectionCard'
import PrimaryButton from '../components/ui/PrimaryButton'
import HeroSection from '../components/ui/HeroSection'
import PageWrapper from '../components/ui/PageWrapper'
import IconBox from '../components/ui/IconBox'
import { CardTitle, BodyText, MutedText } from '../components/ui/Typography'

export default function RoleSelection() {
  const { t } = useTranslation('pages')
  const { i18n } = useTranslation()
  const lang = i18n.language
  const isRtl = i18n.dir() === 'rtl'

  return (
    <PageWrapper>
      {/* Header */}
      <HeroSection 
        title={t('roleSelection.heroTitle')}
        subtitle={t('roleSelection.heroSubtitle')}
      />

      {/* Role Cards */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-2 gap-8 mb-12">
        {/* Investor Card */}
        <Link
          to="/signup?role=INVESTOR"
          className="group no-underline"
        >
          <SectionCard
            hover
            className="text-center flex flex-col cursor-pointer"
          >
            {/* Icon */}
            <IconBox size="2xl" variant="default" className="mx-auto mb-8 group-hover:bg-brand-accent transition-colors duration-300">
              <TrendingUp className="w-10 h-10 text-brand-accent group-hover:text-white transition-colors duration-300" />
            </IconBox>

            {/* Content */}
            <div className="flex-1 mb-8">
              <CardTitle className="mb-3">
                {t('roleSelection.investor')}
              </CardTitle>
              <BodyText className="text-text-muted leading-7 mb-5">
                {t('roleSelection.investorDescription')}
              </BodyText>

              {/* Features */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-brand-accent rounded-full flex-shrink-0"></div>
                  <MutedText className="font-normal leading-6">
                    {t('roleSelection.investorFeatures.minInvestment')}
                  </MutedText>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-brand-accent rounded-full flex-shrink-0"></div>
                  <MutedText className="font-normal leading-6">
                    {t('roleSelection.investorFeatures.monthlyReturns')}
                  </MutedText>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-brand-accent rounded-full flex-shrink-0"></div>
                  <MutedText className="font-normal leading-6">
                    {t('roleSelection.investorFeatures.digitalPortfolio')}
                  </MutedText>
                </div>
              </div>
            </div>

            {/* CTA */}
            <PrimaryButton
              variant="accent"
              className="group-hover:scale-105 transition-transform duration-300"
              icon={ArrowRight}
              iconPosition="right"
            >
              {t('roleSelection.startInvesting')}
            </PrimaryButton>
          </SectionCard>
        </Link>

        {/* Owner Card */}
        <Link
          to="/signup?role=OWNER"
          className="group no-underline"
        >
          <SectionCard
            hover
            className="text-center flex flex-col cursor-pointer"
          >
            {/* Icon */}
            <IconBox size="2xl" variant="vision" className="mx-auto mb-8 group-hover:bg-vision-purple transition-colors duration-300">
              <Building2 className="w-10 h-10 text-vision-purple group-hover:text-white transition-colors duration-300" />
            </IconBox>

            {/* Content */}
            <div className="flex-1 mb-8">
              <CardTitle className="mb-3">
                {t('roleSelection.owner')}
              </CardTitle>
              <BodyText className="text-text-muted leading-7 mb-5">
                {t('roleSelection.ownerDescription')}
              </BodyText>

              {/* Features */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-vision-purple rounded-full flex-shrink-0"></div>
                  <MutedText className="font-normal leading-6">
                    {t('roleSelection.ownerFeatures.fastFunding')}
                  </MutedText>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-vision-purple rounded-full flex-shrink-0"></div>
                  <MutedText className="font-normal leading-6">
                    {t('roleSelection.ownerFeatures.digitalManagement')}
                  </MutedText>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-vision-purple rounded-full flex-shrink-0"></div>
                  <MutedText className="font-normal leading-6">
                    {t('roleSelection.ownerFeatures.investorAccess')}
                  </MutedText>
                </div>
              </div>
            </div>

            {/* CTA */}
            <PrimaryButton
              variant="secondary"
              className="text-vision-purple border-vision-purple/20 hover:bg-vision-purple/10 group-hover:scale-105 transition-transform duration-300"
              icon={ArrowRight}
              iconPosition="right"
            >
              {t('roleSelection.launchProperty')}
            </PrimaryButton>
          </SectionCard>
        </Link>
      </div>
      </div>

      {/* Back Link */}
      <div className="text-center">
        <PrimaryButton 
          variant="ghost" 
          onClick={() => window.history.back()}
          className="text-text-muted hover:text-text-body"
        >
          {t('roleSelection.goBack')}
        </PrimaryButton>
      </div>
    </PageWrapper>
  )
}
