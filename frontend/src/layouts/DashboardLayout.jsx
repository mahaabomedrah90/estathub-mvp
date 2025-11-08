import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Sidebar from '../components/Sidebar'

// Role-based color themes
const roleThemes = {
  investor: {
    primary: 'emerald-600',
    primaryHover: 'emerald-700',
    primaryLight: 'emerald-50',
    gradient: 'from-emerald-500 to-teal-600',
    text: 'text-emerald-600'
  },
  owner: {
    primary: 'orange-500',
    primaryHover: 'orange-600',
    primaryLight: 'orange-50',
    gradient: 'from-amber-500 to-orange-600',
    text: 'text-orange-600'
  },
  admin: {
    primary: 'blue-600',
    primaryHover: 'blue-700',
    primaryLight: 'blue-50',
    gradient: 'from-sky-500 to-indigo-600',
    text: 'text-blue-600'
  }
}

export default function DashboardLayout({ title: propTitle }) {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  const role = localStorage.getItem('role') || 'investor'

  // Listen for sidebar collapse changes
  useEffect(() => {
    const checkSidebarState = () => {
      const collapsed = localStorage.getItem('sidebarCollapsed') === 'true'
      setSidebarCollapsed(collapsed)
    }
    
    // Check initial state
    checkSidebarState()
    
    // Listen for storage changes
    window.addEventListener('storage', checkSidebarState)
    
    // Poll for changes (since localStorage events don't fire in same tab)
    const interval = setInterval(checkSidebarState, 100)
    
    return () => {
      window.removeEventListener('storage', checkSidebarState)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Navbar - Unified across all pages */}
      <div className="relative">
        <Navbar />
        
        {/* Mobile Menu Button Overlay (only visible on mobile) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-20 left-4 z-50 p-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors shadow-lg"
          aria-label="Toggle sidebar"
        >
          <Menu size={24} />
        </button>
      </div>
      
      {/* Sidebar for Dashboard Navigation */}
      <Sidebar 
        role={role} 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Content Area with Sidebar Offset */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
      }`}>
        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

        {/* Footer - Unified across all pages */}
        <Footer />
      </div>
    </div>
  )
}