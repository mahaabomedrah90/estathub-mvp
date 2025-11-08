import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

/**
 * RootLayout - Base layout for public pages (Home, Opportunities, etc.)
 * Provides consistent Navbar and Footer with centered content area
 * Matches the unified design system used across the platform
 */
export default function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Navigation */}
      <Navbar />
      
      {/* Main Content - Centered with max width */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  )
}
