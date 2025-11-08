import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import RootLayout from './layouts/RootLayout.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { getToken } from './lib/api.js'
// Public Pages (accessible to everyone)
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import BlockchainExplorer from './pages/BlockchainExplorer.jsx'
import Opportunities from './pages/investor/Opportunities.jsx'
import PropertyDetail from './pages/investor/PropertyDetail.jsx'

// Investor Pages (protected)
import InvestorDashboard from './pages/investor/InvestorDashboard.jsx'
import Portfolio from './pages/investor/Portfolio.jsx'

// Owner Pages
import OwnerDashboard from './pages/owner/OwnerDashboard.jsx'
import OwnerProperties from './pages/owner/OwnerProperties.jsx'
import OwnerNewProperty from './pages/owner/OwnerNewProperty.jsx'
import OwnerInvestors from './pages/owner/OwnerInvestors.jsx'

// Admin Pages
import AdminOverview from './pages/admin/AdminOverview.jsx'
import AdminOpportunities from './pages/admin/AdminOpportunities.jsx'
import AdminUsers from './pages/admin/AdminUsers.jsx'

import './index.css'

const router = createBrowserRouter([
  // Public Routes (accessible to everyone)
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'opportunities', element: <Opportunities /> },
      { path: 'properties/:id', element: <PropertyDetail /> },
      { path: 'blockchain', element: <BlockchainExplorer /> },
      { path: 'login', element: <Login /> },
      // Redirect old /wallet route to role-based wallet
      { 
        path: 'wallet', 
        element: (() => {
          const token = getToken()
          if (!token) return <Navigate to="/login" replace />
          const role = localStorage.getItem('role') || 'investor'
          if (role === 'admin') return <Navigate to="/admin/overview" replace />
          if (role === 'owner') return <Navigate to="/owner/wallet" replace />
          return <Navigate to="/investor/wallet" replace />
        })()
      },
    ],
  },
  // Investor Routes (protected)
  {
    path: '/investor',
    element: (
      <ProtectedRoute allowedRoles={['investor']}>
        <DashboardLayout title="Investment Portfolio" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/investor/dashboard" replace /> },
      { path: 'dashboard', element: <InvestorDashboard /> },
      { path: 'wallet', element: <Portfolio /> },
      { path: 'opportunities', element: <Opportunities /> },
      { path: 'properties/:id', element: <PropertyDetail /> },
      { path: 'blockchain', element: <BlockchainExplorer /> },
      { path: 'home', element: <Home /> },
    ],
  },
  // Owner Routes (protected)
  {
    path: '/owner',
    element: (
      <ProtectedRoute allowedRoles={['owner']}>
        <DashboardLayout title="Property Management" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/owner/dashboard" replace /> },
      { path: 'dashboard', element: <OwnerDashboard /> },
      { path: 'properties', element: <OwnerProperties /> },
      { path: 'new', element: <OwnerNewProperty /> },
      { path: 'investors', element: <OwnerInvestors /> },
      { path: 'wallet', element: <Portfolio /> },
      { path: 'opportunities', element: <Opportunities /> },
      { path: 'blockchain', element: <BlockchainExplorer /> },
      { path: 'home', element: <Home /> },
    ],
  },
  // Admin Routes (protected)
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <DashboardLayout title="Admin Panel" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/overview" replace /> },
      { path: 'overview', element: <AdminOverview /> },
      { path: 'opportunities', element: <AdminOpportunities /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'reports', element: <div className="text-center py-12 text-gray-500">Reports coming soon</div> },
      { path: 'settings', element: <div className="text-center py-12 text-gray-500">Settings coming soon</div> },
      { path: 'blockchain', element: <BlockchainExplorer /> },
      { path: 'home', element: <Home /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
