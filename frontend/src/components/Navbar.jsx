import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { getToken, clearToken } from '../lib/api'
import { Building2, LogIn, LogOut, User, Link2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Navbar() {
  const navigate = useNavigate()
  const token = getToken()
  const role = (localStorage.getItem('role') || 'investor').toLowerCase()
  const userName = localStorage.getItem('userName') || ''
  const tenantName = localStorage.getItem('tenantName') || ''
  const { t, i18n } = useTranslation('navbar')

  const getNavItems = () => {
    const baseItems = role === 'admin' ? [
      { path: '/admin/overview', label: t('dashboard') },
      { path: '/admin/opportunities', label: t('reviewProperties') },
      { path: '/blockchain', label: t('blockchain'), configurable: true },
    ] : role === 'owner' ? [
      { path: '/owner/dashboard', label: t('dashboard') },
      { path: '/owner/properties', label: t('properties') },
      { path: '/blockchain', label: t('blockchain'), configurable: true },
    ] : [
      { path: '/investor/dashboard', label: t('dashboard') },
  { path: '/opportunities', label: t('opportunities') },   
      { path: '/blockchain', label: t('blockchain'), configurable: true },
    ]

    return baseItems.filter(item => {
      if (!item.configurable) return true
      const disabled = JSON.parse(localStorage.getItem(`disabled_nav_${role}`) || '[]')
      return !disabled.includes(item.path)
    })
  }

  const navItems = getNavItems()
  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-emerald-600 text-white'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`

  const getIcon = (path) => {
    if (path.includes('dashboard')) return Building2
    if (path.includes('opportunities') || path.includes('properties')) return Building2
    if (path.includes('blockchain')) return Link2
    return Building2
  }

  const currentLang = i18n.language === 'ar' ? 'ar' : 'en'
  const isRtl = i18n.dir() === 'rtl'

  const toggleLanguage = () => {
    const next = currentLang === 'en' ? 'ar' : 'en'
    i18n.changeLanguage(next)
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link className="flex items-center gap-2 text-white font-bold text-xl" to="/">
              <Building2 className="text-emerald-500" size={28} />
              <span>{t('brand')}</span>
            </Link>
            <div className="ml-8 flex space-x-1">
              {navItems.map((item) => {
                const Icon = getIcon(item.path)
                return (
                  <NavLink
                    key={item.path}
                    to={token ? item.path : item.path === '/blockchain' ? '/login' : item.path}
                    className={linkClass}
                    end={
                      item.path === '/investor/dashboard' ||
                      item.path === '/owner/dashboard' ||
                      item.path === '/admin/overview'
                    }
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>

         <div className="flex items-center space-x-4">
  {token ? (
    <>
      <div className="hidden md:flex items-center gap-3 text-sm text-gray-300">
        <div className="flex items-center gap-2">
          <User size={16} />
          <span>{userName}</span>
        </div>
        {tenantName && (
          <div className="text-xs text-gray-400">
            {tenantName}
          </div>
        )}
        {/* role badge removed */}
      </div>
      <button
        onClick={() => {
          clearToken()
          localStorage.removeItem('role')
          localStorage.removeItem('userId')
          localStorage.removeItem('userName')
          localStorage.removeItem('tenantName')
          navigate('/')
        }}
        className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-gray-800 text-white hover:bg-gray-700 transition-colors"
      >    <span>{t('logout')}</span>
        <LogOut size={18} />
    
      </button>
    </>
  ) : (
    <button
      onClick={() => navigate('/login')}
      className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
    >
         <span>{t('login')}</span>
      <LogIn size={18} className={isRtl ? 'transform rotate-180' : ''} />
   
    </button>
  )}

  {/* Language switcher moved to last */}
  <button
    type="button"
    onClick={toggleLanguage}
    className="flex items-center gap-1 px-3 py-2 rounded-md text-xs font-semibold bg-gray-800 text-gray-100 hover:bg-gray-700 transition-colors"
  >
    
    <span className={currentLang === 'ar' ? 'font-bold text-emerald-400' : ''}>
      {t('language.ar')}
    </span>
    <span>/</span>
    <span className={currentLang === 'en' ? 'font-bold text-emerald-400' : ''}>
      {t('language.en')}
    </span>
  </button>
</div>
        </div>
      </div>
    </nav>
  )
}