import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import RootLayout from './layouts/RootLayout.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { getToken } from './lib/api.js'
// Public Pages
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import BlockchainExplorer from './pages/BlockchainExplorer.jsx'
import Opportunities from './pages/investor/Opportunities.jsx'
import PropertyDetail from './pages/investor/PropertyDetail.jsx'
import VerifyDeed from './pages/VerifyDeed.jsx'
// Investor Pages
import InvestorDashboard from './pages/investor/InvestorDashboard.jsx'
import Portfolio from './pages/Investor/Portfolio.jsx'
import MyDeeds from './pages/Investor/MyDeeds.jsx'
// Owner Pages
import OwnerDashboard from './pages/owner/OwnerDashboard.jsx'
import OwnerProperties from './pages/owner/OwnerProperties.jsx'
import PropertySubmissionWizard from './pages/owner/PropertySubmissionWizard.jsx'
import OwnerInvestors from './pages/admin/AdminInvestors.jsx'
// Admin Pages
import AdminOverview from './pages/admin/AdminOverview.jsx'
import AdminOpportunities from './pages/admin/AdminOpportunities.jsx'
import AdminUsers from './pages/admin/AdminUsers.jsx'
import IssueDeeds from './pages/admin/IssueDeeds.jsx'
import './index.css'
import AdminReports from './pages/admin/AdminReports.jsx'
import AdminSettings from './pages/admin/AdminSettings.jsx'
import AdminInvestors from './pages/admin/AdminInvestors.jsx'



console.log('� Full React app loading...')

// Complete router with all routes

const router = createBrowserRouter([
  // Public Routes
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'opportunities', element: <Opportunities /> },
      { path: 'properties/:id', element: <PropertyDetail /> },
      { 
        path: 'blockchain', 
        element: (
          <ProtectedRoute requiredRoute="/blockchain">
            <BlockchainExplorer />
          </ProtectedRoute>
        ) 
      },
      { path: 'verify-deed', element: <VerifyDeed /> },
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      {
        path: 'wallet',
        element: (() => {
          const token = getToken()
          if (!token) return <Navigate to="/login" replace />
          const role = localStorage.getItem('role') || 'investor'
          if (role === 'admin') return <Navigate to="/admin/overview" replace />
          if (role === 'owner') return <Navigate to="/owner/dashboard" replace />
          return <Navigate to="/investor/wallet" replace />
        })()
      },
    ],
  },
  // Investor Routes
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
      { path: 'deeds', element: <MyDeeds /> },
      { path: 'opportunities', element: <Opportunities /> },
      { path: 'properties/:id', element: <PropertyDetail /> },
    ],
 },
 // Owner Routes
   {
    path: '/owner',
 element: (
 <ProtectedRoute allowedRoles={['owner']}>
 <DashboardLayout title="Property Owner Dashboard" />
 </ProtectedRoute>
 ),
 children: [
 { index: true, element: <Navigate to="/owner/dashboard" replace /> },
 { path: 'dashboard', element: <OwnerDashboard /> },
 { path: 'properties', element: <OwnerProperties /> },
 { path: 'properties/new', element: <PropertySubmissionWizard /> },
 { path: 'investors', element: <OwnerInvestors /> },

],  
},
// Admin Routes
{
 path: '/admin',
 element: (
 <ProtectedRoute allowedRoles={['admin']}>
 <DashboardLayout title="Admin Dashboard" />
 </ProtectedRoute>
 ),
 children: [
  { index: true, element: <Navigate to="/admin/overview" replace /> },
  { path: 'overview', element: <AdminOverview /> },
  { path: 'opportunities', element: <AdminOpportunities /> },
  { path: 'users', element: <AdminUsers /> },
  { path: 'issue-deeds', element: <IssueDeeds /> },
  { path: 'reports', element: <AdminReports /> },
  { path: 'settings', element: <AdminSettings /> },
  { path: 'investors', element: <AdminInvestors /> },
],
},
])

if (document.getElementById('root')) {
  console.log('✅ Root element found, mounting full app...')
  ReactDOM.createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />
)
} else {
  console.error('❌ Root element not found!')
}
