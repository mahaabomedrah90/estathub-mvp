import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { getToken, clearToken } from '../lib/api'
import { Home, Building2, Wallet, Link2, Shield, LogIn, LogOut, BarChart3, PieChart } from 'lucide-react'

export default function Navbar() {
  const navigate = useNavigate()
  const token = getToken()
  const role = localStorage.getItem('role') || 'investor'
  
  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`

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
              {/* Public Links - Always visible */}
              <NavLink 
                to={token ? (
                  role === 'admin' ? '/admin/home' :
                  role === 'owner' ? '/owner/home' :
                  '/investor/home'
                ) : '/'} 
                className={linkClass}
                end
              >
                <Home size={18} />
                <span>Home</span>
              </NavLink>
              <NavLink 
                to={token ? (
                  role === 'admin' ? '/admin/opportunities' :
                  role === 'owner' ? '/owner/opportunities' :
                  '/investor/opportunities'
                ) : '/opportunities'} 
                className={linkClass}
              >
                <Building2 size={18} />
                <span>Opportunities</span>
              </NavLink>
              <NavLink 
                to={token ? (
                  role === 'admin' ? '/admin/blockchain' :
                  role === 'owner' ? '/owner/blockchain' :
                  '/investor/blockchain'
                ) : '/blockchain'} 
                className={linkClass}
              >
                <Link2 size={18} />
                <span>Blockchain</span>
              </NavLink>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {token ? (
              <button
                onClick={() => { 
                  clearToken(); 
                  localStorage.removeItem('role');
                  localStorage.removeItem('userId');
                  navigate('/'); 
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-gray-800 text-white hover:bg-gray-700 transition-colors"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
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
