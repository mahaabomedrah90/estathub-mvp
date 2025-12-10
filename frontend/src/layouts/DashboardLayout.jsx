import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import { useTranslation } from 'react-i18next'

export default function DashboardLayout() {
  
  const { t, i18n } = useTranslation('sidebar')
  const isRtl = i18n.dir() === 'rtl'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const role = (localStorage.getItem('role') || 'investor').toLowerCase()

  useEffect(() => {
    const updateSidebar = () => {
      const collapsed = localStorage.getItem('sidebarCollapsed') === 'true'
      setSidebarCollapsed(collapsed)
    }

    updateSidebar()

    window.addEventListener('storage', updateSidebar)
    window.addEventListener('sidebar-collapse-change', updateSidebar)

    return () => {
      window.removeEventListener('storage', updateSidebar)
      window.removeEventListener('sidebar-collapse-change', updateSidebar)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <Sidebar
          t={t}
        role={role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

            <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed
            ? (isRtl ? 'lg:pr-20' : 'lg:pl-20')
            : (isRtl ? 'lg:pr-64' : 'lg:pl-64')
        }`}
      >
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

        <Footer />
      </div>
      </div>
    
  )
}