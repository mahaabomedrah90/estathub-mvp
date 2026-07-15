import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { getToken, clearToken } from '../lib/api'
import { Building2, LogIn, LogOut, User, Link2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Navbar() {
  const navigate = useNavigate()
  const token = getToken()
  const { t, i18n } = useTranslation('navbar')

  const navItems = [
    { path: '/', label: t('home'), end: true },
    { path: '/opportunities', label: t('opportunities') },
    { path: '/how-it-works', label: t('howItWorks') },
    { path: '/about', label: t('about') },
    { path: '/faq', label: t('faq') },
  ]

  const linkClass = ({ isActive }) =>
    `px-4 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'text-brand-primary'
        : 'text-text-body hover:text-brand-primary'
    }`

  const currentLang = i18n.language === 'ar' ? 'ar' : 'en'
  const isRtl = i18n.dir() === 'rtl'

  const toggleLanguage = () => {
    const next = currentLang === 'en' ? 'ar' : 'en'
    i18n.changeLanguage(next)
  }

  return (
    <nav className="bg-surface-card shadow-sm border-b border-surface-border sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-20 items-center justify-between">
          
          {/* LOGO ZONE - Optimized size and positioning */}
          <div className="flex items-center flex-shrink-0">
            <img
              src="/Full Logo 1.png"
              alt="ALWASM"
              className="h-10 w-auto object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <span className="text-brand-primary font-bold text-xl ml-3" style={{display: 'none'}}>
              {t('brand')}
            </span>
          </div>

          {/* NAVIGATION ZONE - Centered with proper spacing */}
          <div className="flex items-center justify-center flex-1 px-8">
            <div className="flex items-center gap-8">
              {navItems.map((item) => {
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={linkClass}
                    end={!!item.end}
                  >
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>

          {/* ACTIONS ZONE - Language + Login button */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Language switch */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className={currentLang === 'ar' ? 'text-brand-primary font-medium' : 'text-text-muted'}>
                AR
              </span>
              <span className="mx-2 text-text-muted">|</span>
              <span className={currentLang === 'en' ? 'text-brand-primary font-medium' : 'text-text-muted'}>
                EN
              </span>
            </button>
            
            {/* Login/Logout button */}
            {token ? (
              <button
                onClick={() => {
                  clearToken()
                  localStorage.removeItem('role')
                  localStorage.removeItem('userId')
                  localStorage.removeItem('userName')
                  localStorage.removeItem('tenantName')
                  navigate('/')
                }}
                className="px-5 py-2.5 rounded-full text-sm font-semibold bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors shadow-sm hover:shadow-md"
              >
                {t('logout')}
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2.5 rounded-full text-sm font-semibold bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors shadow-sm hover:shadow-md"
              >
                {t('login')}
              </button>
            )}
          </div>

        </div>
      </div>
    </nav>
  )
}
