import React from 'react'
import { Link } from 'react-router-dom'
import { Building2, TrendingUp, Shield, Wallet, ArrowRight, CheckCircle2, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import KpiCard from '../components/KpiCard'
import WaitlistSection from '../components/WaitlistSection'


export default function Home() {
  const { t } = useTranslation('pages')
  const { i18n } = useTranslation('pages')
  const isRtl = i18n.dir() === 'rtl'

  return (
    <>
      {/* Hero Section - Premium Real Estate Investment - Outside wrapper for full width */}
      <div className="relative w-full h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Improved Overlay */}
        <div className="absolute inset-0 w-full h-full">
          <img 
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80" 
            alt="Luxury Real Estate Villa" 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to a gradient if image not found
              e.target.style.display = 'none';
              e.target.parentElement.className += ' bg-gradient-to-br from-gray-100 to-gray-200';
            }}
          />
          {/* Lighter White Overlay - Reduced Blur */}
          <div className="absolute inset-0 w-full h-full bg-brand-primary/60"></div>
        </div>

        {/* Centered Content - No Logo */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto w-full">
          {/* Title - Investment Focused */}
          <h1 className="text-6xl md:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6">
            {t('home.heroTitle')}
          </h1>

          {/* Subtitle - Investment Message */}
          <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed mb-12">
            {t('home.heroSubtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="#waitlist"
              className="px-8 py-4 text-base bg-brand-accent text-white font-semibold rounded-full hover:bg-brand-accent/90 hover:scale-[1.02] active:scale-95 transition-all duration-200 shadow-xl hover:shadow-2xl"
            >
              {t('home.waitlistCTA')}
            </a>
            <Link
              to="/opportunities"
              className="px-8 py-4 text-base bg-white/10 border border-white/30 text-white font-semibold rounded-full hover:bg-white/20 active:scale-95 transition-all duration-200"
            >
              {t('home.exploreOpportunities')}
            </Link>
          </div>
          {/* Trust microcopy */}
          <p className="mt-5 text-white/50 text-sm">
            {t('home.trustMicrocopy')}
          </p>
        </div>

        {/* Scroll Indicator - Subtle Animation */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white opacity-75" />
        </div>
      </div>

      {/* Waitlist — directly below hero */}
      <div id="waitlist">
        <WaitlistSection />
      </div>

      {/* How It Works Section */}
      <div className="bg-brand-primary py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="bg-brand-primary-soft rounded-3xl p-12 md:p-16 border border-white/10">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12 tracking-tight">
              {t('home.howItWorks.title')}
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              {/* Step 1 */}
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-brand-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-white text-2xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {t('home.howItWorks.step1.title')}
                </h3>
                <p className="text-white/70 text-base leading-relaxed">
                  {t('home.howItWorks.step1.desc')}
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-brand-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-white text-2xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {t('home.howItWorks.step2.title')}
                </h3>
                <p className="text-white/70 text-base leading-relaxed">
                  {t('home.howItWorks.step2.desc')}
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-brand-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-white text-2xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {t('home.howItWorks.step3.title')}
                </h3>
                <p className="text-white/70 text-base leading-relaxed">
                  {t('home.howItWorks.step3.desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-surface-muted py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Item 1: Partial Ownership */}
          <div className="bg-white border border-border-soft hover:border-brand-accent/25 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-250 hover:-translate-y-2 p-10">
            <div className="w-14 h-14 bg-brand-accent-soft rounded-xl flex items-center justify-center mb-8">
              <Building2 className="w-7 h-7 text-brand-accent" />
            </div>
            <h3 className="text-xl font-bold text-text-strong mb-3">
              {t('home.features.items.partialOwnership.title')}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              {t('home.features.items.partialOwnership.description')}
            </p>
          </div>

          {/* Item 2: Monthly Income */}
          <div className="bg-white border border-border-soft hover:border-brand-accent/25 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-250 hover:-translate-y-2 p-10">
            <div className="w-14 h-14 bg-brand-accent-soft rounded-xl flex items-center justify-center mb-8">
              <TrendingUp className="w-7 h-7 text-brand-accent" />
            </div>
            <h3 className="text-xl font-bold text-text-strong mb-3">
              {t('home.features.items.monthlyIncome.title')}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              {t('home.features.items.monthlyIncome.description')}
            </p>
          </div>

          {/* Item 3: Blockchain Security */}
          <div className="bg-white border border-border-soft hover:border-brand-accent/25 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-250 hover:-translate-y-2 p-10">
            <div className="w-14 h-14 bg-brand-accent-soft rounded-xl flex items-center justify-center mb-8">
              <Shield className="w-7 h-7 text-brand-accent" />
            </div>
            <h3 className="text-xl font-bold text-text-strong mb-3">
              {t('home.features.items.blockchainSecurity.title')}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              {t('home.features.items.blockchainSecurity.description')}
            </p>
          </div>
          </div>
        </div>
      </div>

      {/* Stats Section - Temporarily Hidden */}
      {/* 
      <div className="bg-surface-muted py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 text-center">
          
          <div className="flex flex-col items-center space-y-3">
            <div className="text-5xl font-bold text-slate-900">100%</div>
              <div className="text-base font-medium text-gray-700">
                {t('home.stats.100.title')}
              </div>
              <div className="text-sm text-gray-500">
                {t('home.stats.100.desc')}
              </div>
            </div>

            <div className="flex flex-col items-center space-y-3">
            <div className="text-5xl font-bold text-slate-900">14.2%</div>
              <div className="text-base font-medium text-gray-700">
                {t('home.stats.14.title')}
              </div>
              <div className="text-sm text-gray-500">
                {t('home.stats.14.desc')}
              </div>
            </div>

            <div className="flex flex-col items-center space-y-3">
            <div className="text-5xl font-bold text-slate-900">12k</div>
              <div className="text-base font-medium text-gray-700">
                {t('home.stats.12k.title')}
              </div>
              <div className="text-sm text-gray-500">
                {t('home.stats.12k.desc')}
              </div>
            </div>

            <div className="flex flex-col items-center space-y-3">
            <div className="text-5xl font-bold text-slate-900">500M+</div>
              <div className="text-base font-medium text-gray-700">
                {t('home.stats.500m.title')}
              </div>
              <div className="text-sm text-gray-500">
                {t('home.stats.500m.desc')}
              </div>
            </div>
        </div>
      </div>
      </div>
      */}

      {/* Waitlist — bottom of page */}
      <WaitlistSection />
    </>
  )
}
