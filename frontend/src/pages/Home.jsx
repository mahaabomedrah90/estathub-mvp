import React from 'react'
import { Link } from 'react-router-dom'
import { Building2, TrendingUp, Shield, Wallet, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Home() {
   const { t, i18n } = useTranslation('pages')
  const isRtl = i18n.dir() === 'rtl'
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
          <CheckCircle2 size={16} />
          <span>{t('home.badge')}</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
          {t('home.heroTitle1')}<br />
          <span className="text-emerald-600">{t('home.heroTitle2')}</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          {t('home.heroSubtitle')}
          {t('home.heroCTA')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
  to="/opportunities" 
  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 font-medium transition-colors"
>
  {t('home.exploreOpportunities')}
  <ArrowRight size={20} className={isRtl ? 'rotate-180' : ''} />
</Link>

<Link 
  to="/blockchain" 
  className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 font-medium transition-colors"
>
  {t('home.viewBlockchain')}
  
</Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
            <Building2 className="text-emerald-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('home.feature1Title')}</h3>
          <p className="text-gray-600 text-sm">
            {t('home.feature1Description')}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <TrendingUp className="text-blue-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('home.feature2Title')}</h3>
          <p className="text-gray-600 text-sm">
            {t('home.feature2Description')}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <Shield className="text-purple-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('home.feature3Title')}</h3>
          <p className="text-gray-600 text-sm">
            {t('home.feature3Description')}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
            <Wallet className="text-amber-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('home.feature4Title')}</h3>
          <p className="text-gray-600 text-sm">
            {t('home.feature4Description')}
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-8 md:p-12 text-white">
  <div className="grid md:grid-cols-3 gap-8 text-center">
    <div>
      <div className="text-4xl font-bold mb-2">100%</div>
      <div className="text-emerald-100">{t('home.statsBlockchainSecured')}</div>
    </div>
    <div>
      <div className="text-4xl font-bold mb-2">24/7</div>
      <div className="text-emerald-100">{t('home.statsMarketAccess')}</div>
    </div>
    <div>
      <div className="text-4xl font-bold mb-2">SAR</div>
      <div className="text-emerald-100">{t('home.statsLocalCurrency')}</div>
    </div>
  </div>
</div>

      {/* CTA Section */}
      <div className="text-center space-y-4 py-8">
        <h2 className="text-3xl font-bold text-gray-900">{t('home.ctaTitle')}</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          {t('home.ctaSubtitle')}
        </p>
        <Link 
  to="/opportunities" 
  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 font-medium transition-colors"
>
  {t('home.browseProperties')}
  <ArrowRight size={20} className={isRtl ? 'rotate-180' : ''} />
</Link>

      </div>
    </div>
  )
}
