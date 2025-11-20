import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { getToken, clearToken } from '../lib/api'
import { Home, Building2, Wallet, Link2, Shield, LogIn, LogOut, BarChart3, PieChart, User } from 'lucide-react'

export default function Navbar() {
  const navigate = useNavigate()
  const token = getToken()
  const role = (localStorage.getItem('role') || 'investor').toLowerCase()
  const userName = localStorage.getItem('userName') || ''
  const tenantName = localStorage.getItem('tenantName') || ''
  
  // Get navigation items based on role and permissions
  const getNavItems = () => {
    const baseItems = role === 'admin' ? [
      { path: '/admin/overview', label: 'Dashboard' },
      { path: '/admin/opportunities', label: 'Review Properties' },
      { path: '/blockchain', label: 'Blockchain', configurable: true }
    ] : role === 'owner' ? [
      { path: '/owner/dashboard', label: 'Dashboard' },
      { path: '/owner/properties', label: 'Properties' },
      { path: '/blockchain', label: 'Blockchain', configurable: true }
    ] : [
      { path: '/investor/dashboard', label: 'Dashboard' },
      { path: '/investor/opportunities', label: 'Opportunities' },
      { path: '/blockchain', label: 'Blockchain', configurable: true }
    ]

    // Filter out configurable items that are disabled
    return baseItems.filter(item => {
      if (!item.configurable) return true
      
      // Check if this navigation item is disabled for the current role
      const disabled = JSON.parse(localStorage.getItem(`disabled_nav_${role}`) || '[]')
      return !disabled.includes(item.path)
    })
  }

  const navItems = getNavItems()
  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`
// Icon mapping for navigation items
 const getIcon = (path) => {
 if (path.includes('dashboard')) return Home
 if (path.includes('opportunities') || path.includes('properties')) return Building2
 if (path.includes('blockchain')) return Link2
 return Home
 }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl">
              <Building2 className="text-emerald-500" size={28} />
              <span>Estathub</span>
            </Link>
            <div className="ml-8 flex space-x-1">
              {/* Dynamic role-based navigation */}
              {navItems.map((item) => {
                const Icon = getIcon(item.path)
                return (
                  <NavLink
                    key={item.path}
                    to={token ? item.path : item.path === '/blockchain' ? '/login' : item.path}
                    className={linkClass}
                    end={item.path === '/investor/dashboard' || item.path === '/owner/dashboard' || item.path === '/admin/overview'}
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
                {/* User Info */}
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
                  <div className="px-2 py-1 bg-gray-700 rounded text-xs font-medium">
                    {role.toUpperCase()}
                  </div>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={() => { 
                    clearToken(); 
                    localStorage.removeItem('role');
                    localStorage.removeItem('userId');
                    localStorage.removeItem('userName');
                    localStorage.removeItem('tenantName');
                    navigate('/'); 
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                <LogIn size={18} />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
