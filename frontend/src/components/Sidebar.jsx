import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { 
  Home, Building2, Wallet, Link2, BarChart3, Users, 
  FileText, Settings, PieChart, Plus, TrendingUp, Shield, Pin, PinOff, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

const roleMenus = {
  investor: [
    { path: '/investor/dashboard', label: (t) => t('investor.dashboard'), icon: PieChart },
    { path: '/investor/wallet', label: (t) => t('investor.wallet'), icon: Wallet },
    { path: '/investor/deeds', label: (t) => t('investor.deeds'), icon: FileText },
  ],
  owner: [
    { path: '/owner/dashboard', label: (t) => t('owner.dashboard'), icon: BarChart3 },
    { path: '/owner/properties', label: (t) => t('owner.properties'), icon: Building2 },
    { path: '/owner/properties/new', label: (t) => t('owner.submitProperty'), icon: Plus },
  ],
  admin: [
    { path: '/admin/overview', label: (t) => t('admin.overview'), icon: BarChart3 },
    { path: '/admin/opportunities', label: (t) => t('admin.reviewProperties'), icon: Building2 },
    { path: '/admin/users', label: (t) => t('admin.users'), icon: Users },
    { path: '/admin/investors', label: (t) => t('admin.investors'), icon: Users },
    { path: '/admin/issue-deeds', label: (t) => t('admin.issueDeeds'), icon: FileText },
    { path: '/admin/reports', label: (t) => t('admin.reports'), icon: FileText },
    { path: '/admin/settings', label: (t) => t('admin.settings'), icon: Settings },
  ],
  regulator: [
    { path: '/regulator/dashboard', label: (t) => t('regulator.dashboard'), icon: Shield },
    { path: '/regulator/overview', label: (t) => t('regulator.overview'), icon: BarChart3 },
    { path: '/regulator/properties', label: (t) => t('regulator.properties'), icon: Building2 },
    { path: '/regulator/ledger', label: (t) => t('regulator.ledger'), icon: Link2 },
    { path: '/regulator/aml-alerts', label: (t) => t('regulator.amlAlerts'), icon: Shield },
    { path: '/regulator/investors', label: (t) => t('regulator.investors'), icon: Users },
    { path: '/regulator/events', label: (t) => t('regulator.events'), icon: FileText },
  ],
}

const roleThemes = {
  investor: {
    gradient: 'from-emerald-500 to-teal-600',
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    hover: 'hover:bg-emerald-100',
    active: 'bg-emerald-600 text-white'
  },
  owner: {
    gradient: 'from-amber-500 to-orange-600',
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    hover: 'hover:bg-amber-100',
    active: 'bg-amber-600 text-white'
  },
  admin: {
    gradient: 'from-blue-500 to-indigo-600',
    text: 'text-blue-600',
    bg: 'bg-blue-50',
    hover: 'hover:bg-blue-100',
    active: 'bg-blue-600 text-white'
  },
  regulator: {
    gradient: 'from-purple-500 to-indigo-600',
    text: 'text-purple-600',
    bg: 'bg-purple-50',
    hover: 'hover:bg-purple-100',
    active: 'bg-purple-600 text-white'
  }
}

export default function Sidebar({ role, isOpen, onClose }) {
  const { t, i18n } = useTranslation('sidebar')
  const isRtl = i18n.dir() === 'rtl'
  const rawMenu = roleMenus[role] || roleMenus.investor
  const menuItems = rawMenu.map(item => ({
    ...item,
    label: typeof item.label === 'function' ? item.label(t) : item.label,
  }))
  const theme = roleThemes[role] || roleThemes.investor  

  // Load collapsed state from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved === 'true'
  })
  
  // Load pinned state from localStorage
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('sidebarPinned')
    return saved !== 'false' // Default to pinned
  })

  // Save states to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString())
  }, [isCollapsed])

  useEffect(() => {
    localStorage.setItem('sidebarPinned', isPinned.toString())
  }, [isPinned])

  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', newState.toString())
    window.dispatchEvent(new Event('sidebar-collapse-change'))
  }

  const togglePin = () => {
    const newState = !isPinned
    setIsPinned(newState)
    localStorage.setItem('sidebarPinned', newState.toString())
    window.dispatchEvent(new Event('sidebar-collapse-change'))
  }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      isActive 
        ? theme.active 
        : `text-gray-700 ${theme.hover}`
    } ${isCollapsed ? 'justify-center' : ''}`

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
   <aside
  className={`
    fixed top-16 ${isRtl ? 'right-0' : 'left-0'} h-[calc(100vh-4rem)] z-40
    bg-white/80 backdrop-blur-xl ${isRtl ? 'border-l' : 'border-r'} border-white/20
    shadow-2xl transform transition-all duration-300 ease-in-out
    ${isCollapsed ? 'w-20' : 'w-64'}
    ${
      isOpen
        ? 'translate-x-0'
        : (isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0')
    }
  `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`p-6 bg-gradient-to-r ${theme.gradient} relative`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Building2 className="text-white" size={24} />
              </div>
              {!isCollapsed && (
                <div>
                  <h1 className="text-white font-bold text-xl">Estathub</h1>
                  <p className="text-white/80 text-xs">
                    {t('meta.portalLabel', { role: t(`roles.${role}`) || role })}
                  </p>
                </div>
              )}
            </div>
            
            {/* Collapse/Expand Button */}
           <button
  onClick={toggleCollapse}
  className={`absolute ${isRtl ? '-left-3' : '-right-3'} top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors`}
  title={isCollapsed ? t('meta.expandSidebar') : t('meta.collapseSidebar')}
>
  {isCollapsed ? <ChevronRight size={14} className="text-gray-600" /> : <ChevronLeft size={14} className="text-gray-600" />}
</button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={linkClass}
                  onClick={() => window.innerWidth < 1024 && onClose()}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon size={20} />
                  {!isCollapsed && <span className="font-medium">{item.label}</span>}
                </NavLink>
              )
            })}
          </nav>

          {/* Role Badge & Pin Button */}
         <div className="p-4 border-t border-gray-200 space-y-2">
  {/* Pin Button */}
  {!isCollapsed && (
    <button
      onClick={togglePin}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        isPinned 
          ? `${theme.bg} ${theme.text}` 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
      title={isPinned ? t('meta.unpinSidebar') : t('meta.pinSidebar')}
    >
      <span className="text-sm font-medium">
        {isPinned ? t('meta.pinned') : t('meta.pinSidebar')}
      </span>
    </button>
  )}
   {/* Role Badge */}
            <div className={`${theme.bg} rounded-lg p-3 flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
              <Shield className={theme.text} size={18} />
              {!isCollapsed && (
                <div>
                  <div className="text-xs text-gray-500 capitalize">{t('meta.loggedInAs')}</div>
                  <div className={`text-sm font-semibold ${theme.text} capitalize`}>
                    {t(`roles.${role}`) || role}
                  </div>
                </div>
              )}
            </div>
</div>
        </div>
      </aside>
    </>
  )
}