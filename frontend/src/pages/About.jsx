import React from 'react'
import { Building2, Users, Shield, TrendingUp, Award, Target, Globe, Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function About() {
  const { t } = useTranslation('pages')
  const { i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'

  return (
    <div className="max-w-4xl mx-auto space-y-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('about.title')}</h1>
        <p className="text-lg text-gray-600">{t('about.subtitle')}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="text-emerald-600" size={28} />
          <h2 className="text-2xl font-semibold text-gray-900">{t('about.ourStory.title')}</h2>
        </div>
        <div className="space-y-4 text-gray-700">
          <p>{t('about.ourStory.content1')}</p>
          <p>{t('about.ourStory.content2')}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Target className="text-blue-600" size={28} />
          <h2 className="text-2xl font-semibold text-gray-900">{t('about.visionMission.title')}</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">{t('about.visionMission.vision.title')}</h3>
            <p className="text-gray-700">{t('about.visionMission.vision.content')}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">{t('about.visionMission.mission.title')}</h3>
            <p className="text-gray-700">{t('about.visionMission.mission.content')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Heart className="text-purple-600" size={28} />
          <h2 className="text-2xl font-semibold text-gray-900">{t('about.coreValues.title')}</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4">
            <Shield className="text-emerald-600 mx-auto mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 mb-2">{t('about.coreValues.trust.title')}</h3>
            <p className="text-sm text-gray-600">{t('about.coreValues.trust.description')}</p>
          </div>
          <div className="text-center p-4">
            <Globe className="text-blue-600 mx-auto mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 mb-2">{t('about.coreValues.transparency.title')}</h3>
            <p className="text-sm text-gray-600">{t('about.coreValues.transparency.description')}</p>
          </div>
          <div className="text-center p-4">
            <Users className="text-purple-600 mx-auto mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 mb-2">{t('about.coreValues.empowerment.title')}</h3>
            <p className="text-sm text-gray-600">{t('about.coreValues.empowerment.description')}</p>
          </div>
          <div className="text-center p-4">
            <Award className="text-orange-600 mx-auto mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 mb-2">{t('about.coreValues.quality.title')}</h3>
            <p className="text-sm text-gray-600">{t('about.coreValues.quality.description')}</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 rounded-xl p-8 text-white text-center">
        <h2 className="text-2xl font-semibold mb-6">{t('about.achievements.title')}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold mb-2">5,000+</div>
            <div className="text-emerald-100">{t('about.achievements.activeInvestors')}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold mb-2">120+</div>
            <div className="text-emerald-100">{t('about.achievements.listedProperties')}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold mb-2">98%</div>
            <div className="text-emerald-100">{t('about.achievements.customerSatisfaction')}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
