import React from 'react'
import { Building2, Users, Shield, TrendingUp, Award, Target, Globe, Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import PageWrapper from '../components/ui/PageWrapper'
import HeroSection from '../components/ui/HeroSection'
import SectionCard from '../components/ui/SectionCard'
import IconBox from '../components/ui/IconBox'

export default function About() {
  const { t } = useTranslation('pages')
  const { i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'

  return (
    <PageWrapper size="narrow" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <HeroSection 
        title={t('about.title')}
        subtitle={t('about.subtitle')}
      />

      {/* Our Story */}
      <SectionCard padding="lg" className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <IconBox size="md" variant="default">
            <Building2 size={22} />
          </IconBox>
          <h2 className="text-xl font-bold text-text-strong">{t('about.ourStory.title')}</h2>
        </div>
        <div className="space-y-4 text-text-body leading-relaxed">
          <p>{t('about.ourStory.content1')}</p>
          <p>{t('about.ourStory.content2')}</p>
        </div>
      </SectionCard>

      {/* Vision & Mission */}
      <SectionCard padding="lg" className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <IconBox size="md" variant="primary">
            <Target size={22} />
          </IconBox>
          <h2 className="text-xl font-bold text-text-strong">{t('about.visionMission.title')}</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-xl p-6">
            <h3 className="font-semibold text-text-strong mb-3">{t('about.visionMission.vision.title')}</h3>
            <p className="text-text-body leading-relaxed">{t('about.visionMission.vision.content')}</p>
          </div>
          <div className="bg-brand-accent-soft border border-brand-accent/20 rounded-xl p-6">
            <h3 className="font-semibold text-text-strong mb-3">{t('about.visionMission.mission.title')}</h3>
            <p className="text-text-body leading-relaxed">{t('about.visionMission.mission.content')}</p>
          </div>
        </div>
      </SectionCard>

      {/* Core Values */}
      <SectionCard padding="lg" className="mb-12">
        <div className="flex items-center gap-3 mb-8">
          <IconBox size="md" variant="default">
            <Heart size={22} />
          </IconBox>
          <h2 className="text-xl font-bold text-text-strong">{t('about.coreValues.title')}</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center bg-surface-muted rounded-xl p-6">
            <IconBox size="lg" variant="primary" className="mx-auto mb-4">
              <Shield size={24} />
            </IconBox>
            <h3 className="font-semibold text-text-strong mb-2">{t('about.coreValues.trust.title')}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{t('about.coreValues.trust.description')}</p>
          </div>
          <div className="text-center bg-surface-muted rounded-xl p-6">
            <IconBox size="lg" variant="default" className="mx-auto mb-4">
              <Globe size={24} />
            </IconBox>
            <h3 className="font-semibold text-text-strong mb-2">{t('about.coreValues.transparency.title')}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{t('about.coreValues.transparency.description')}</p>
          </div>
          <div className="text-center bg-surface-muted rounded-xl p-6">
            <IconBox size="lg" variant="primary" className="mx-auto mb-4">
              <Users size={24} />
            </IconBox>
            <h3 className="font-semibold text-text-strong mb-2">{t('about.coreValues.empowerment.title')}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{t('about.coreValues.empowerment.description')}</p>
          </div>
          <div className="text-center bg-surface-muted rounded-xl p-6">
            <IconBox size="lg" variant="default" className="mx-auto mb-4">
              <Award size={24} />
            </IconBox>
            <h3 className="font-semibold text-text-strong mb-2">{t('about.coreValues.quality.title')}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{t('about.coreValues.quality.description')}</p>
          </div>
        </div>
      </SectionCard>

      {/* Achievements */}
      <div className="bg-brand-primary rounded-2xl p-10 text-white text-center">
        <h2 className="text-2xl font-bold tracking-tight mb-8">{t('about.achievements.title')}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/10 border border-white/10 rounded-xl p-6">
            <div className="text-4xl font-bold mb-2">50+</div>
            <div className="text-white/70 text-sm">{t('about.achievements.activeInvestors')}</div>
          </div>
          <div className="bg-white/10 border border-white/10 rounded-xl p-6">
            <div className="text-4xl font-bold mb-2">1+</div>
            <div className="text-white/70 text-sm">{t('about.achievements.listedProperties')}</div>
          </div>
          <div className="bg-white/10 border border-white/10 rounded-xl p-6">
            <div className="text-4xl font-bold mb-2">98%</div>
            <div className="text-white/70 text-sm">{t('about.achievements.customerSatisfaction')}</div>
          </div>
        </div>
      </div>

    </PageWrapper>
  )
}
