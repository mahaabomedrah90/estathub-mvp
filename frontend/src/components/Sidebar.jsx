import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home, Building2, Wallet, Link2, BarChart3, Users,
  FileText, Settings, PieChart, Plus, TrendingUp, Shield, Pin, PinOff, ChevronLeft, ChevronRight, Banknote, ScrollText, BookMarked, ArrowDownCircle, ClipboardList
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
    { path: '/owner/opportunities/new', label: (t) => t('owner.submitOpportunity', 'طلب تقديم فرصة'), icon: Building2 },
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

// Admin sidebar grouped structure
const adminGroups = (t, isAr) => [
  {
    header: isAr ? 'الحسابات والامتثال' : 'Accounts & Compliance',
    items: [
      { path: '/admin/overview',  label: t('admin.overview'),  icon: BarChart3 },
      { path: '/admin/users',     label: t('admin.users'),     icon: Users },
      { path: '/admin/investors', label: t('admin.investors'), icon: Users },
      { path: '/admin/audit',     label: t('admin.auditLogs'), icon: ScrollText },
      { path: '/admin/settings',  label: t('admin.settings'),  icon: Settings },
    ],
  },
  {
    header: isAr ? 'إدارة العقارات والملكية' : 'Properties & Ownership',
    items: [
      { path: '/admin/property-leads', label: t('admin.propertyLeads', 'طلبات التقديم المبدئي'), icon: ClipboardList },
      { path: '/admin/opportunities', label: t('admin.reviewProperties', 'مراجعة العقارات بعد الدراسة'), icon: Building2 },
      { path: '/admin/issue-deeds',   label: t('admin.issueDeeds'),       icon: FileText },
    ],
  },
  {
    header: isAr ? 'الإدارة المالية' : 'Financial Management',
    items: [
      { path: '/admin/deposits',            label: t('admin.deposits'),           icon: Banknote },
      { path: '/admin/withdrawals',         label: t('admin.withdrawals'),        icon: ArrowDownCircle },
      { path: '/admin/investor-statement',  label: t('admin.investorStatement'),  icon: ScrollText },
      { path: '/admin/owner-statement',     label: t('admin.ownerStatement'),     icon: Home },
      { path: '/admin/platform-pnl',        label: t('admin.platformPnl'),        icon: TrendingUp },
      { path: '/admin/financial-reports',   label: t('admin.financialReports'),   icon: BookMarked },
      { path: '/admin/reports',             label: t('admin.reports'),            icon: FileText },
    ],
  },
]

const roleThemes = {
  investor: {
    gradient: 'from-brand-primary to-brand-accent',
    text: 'text-brand-primary',
    bg: 'bg-brand-primary/5',
    hover: 'hover:bg-brand-primary/10',
    active: 'bg-brand-primary text-white'
  },
  owner: {
    gradient: 'from-brand-primary to-brand-accent',
    text: 'text-brand-primary',
    bg: 'bg-brand-primary/5',
    hover: 'hover:bg-brand-primary/10',
    active: 'bg-brand-primary text-white'
  },
  admin: {
    gradient: 'from-brand-primary to-brand-accent',
    text: 'text-brand-primary',
    bg: 'bg-brand-primary/5',
    hover: 'hover:bg-brand-primary/10',
    active: 'bg-brand-primary text-white'
  },
  regulator: {
    gradient: 'from-brand-primary to-brand-accent',
    text: 'text-brand-primary',
    bg: 'bg-brand-primary/5',
    hover: 'hover:bg-brand-primary/10',
    active: 'bg-brand-primary text-white'
  }
}

export default function Sidebar({ role, isOpen, onClose }) {
  const { t, i18n } = useTranslation('sidebar')
  const isRtl = i18n.dir() === 'rtl'
  const isAr = i18n.language === 'ar'
  const isAdmin = role === 'admin'
  const groups = isAdmin ? adminGroups(t, isAr) : null
  const rawMenu = isAdmin ? [] : (roleMenus[role] || roleMenus.investor)
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
        ? 'bg-brand-accent/20 text-brand-accent'
        : 'text-white/70 hover:bg-white/10 hover:text-white'
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
    fixed top-20 ${isRtl ? 'right-0' : 'left-0'} h-[calc(100vh-5rem)] z-40
    bg-brand-primary ${isRtl ? 'border-l' : 'border-r'} border-white/10
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
          <div className={`p-6 bg-brand-primary-soft relative`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <img
                  src="/Icon 3.png"
                  alt="ALWSM Icon"
                  className="w-6 h-6 object-contain"
                />
              </div>
              {!isCollapsed && (
                <div>
                  <h1 className="text-white font-bold text-xl">ALWASM</h1>
                  <p className="text-white/60 text-xs">
                    {t('meta.portalLabel', { role: t(`roles.${role}`) || role })}
                  </p>
                </div>
              )}
            </div>

            {/* Collapse/Expand Button */}
           <button
  onClick={toggleCollapse}
  className={`absolute ${isRtl ? '-left-3' : '-right-3'} top-1/2 -translate-y-1/2 w-6 h-6 bg-brand-primary border border-white/10 rounded-full shadow-lg flex items-center justify-center hover:bg-brand-primary-soft transition-colors`}
  title={isCollapsed ? t('meta.expandSidebar') : t('meta.collapseSidebar')}
>
  {isCollapsed ? <ChevronRight size={14} className="text-white/60" /> : <ChevronLeft size={14} className="text-white/60" />}
</button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            {groups ? (
              // Admin: grouped sections
              <div className="space-y-1">
                {groups.map((group, gi) => (
                  <div key={group.header} className={gi > 0 ? 'mt-5' : ''}>
                    {!isCollapsed && (
                      <div className="px-2 pb-1.5 pt-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30 select-none">
                          {group.header}
                        </span>
                      </div>
                    )}
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
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
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Other roles: flat list
              <div className="space-y-1">
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
              </div>
            )}
          </nav>

          {/* Role Badge & Pin Button */}
          <div className="p-4 border-t border-white/10 space-y-2">
  {/* Pin Button */}
  {!isCollapsed && (
    <button
      onClick={togglePin}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        isPinned
          ? 'bg-brand-accent/20 text-brand-accent'
          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
      }`}
      title={isPinned ? t('meta.unpinSidebar') : t('meta.pinSidebar')}
    >
      <span className="text-sm font-medium">
        {isPinned ? t('meta.pinned') : t('meta.pinSidebar')}
      </span>
    </button>
  )}
   {/* Role Badge */}
            <div className={`bg-white/5 rounded-lg p-3 flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
              <Shield className="text-brand-accent" size={18} />
              {!isCollapsed && (
                <div>
                  <div className="text-xs text-white/50 capitalize">{t('meta.loggedInAs')}</div>
                  <div className="text-sm font-semibold text-white/80 capitalize">
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