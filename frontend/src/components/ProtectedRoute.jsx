import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { hasPermission } from '../lib/api'

export default function ProtectedRoute({ allowedRoles = [], requiredRoute = null, children }) {  const token = localStorage.getItem('estathub_token')
  const role = (localStorage.getItem('role') || 'investor').toLowerCase()
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    // Simulate loading check for authentication
    const timer = setTimeout(() => {
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-emerald-600 mx-auto" size={40} />
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }
 // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (role === 'admin') {
      return <Navigate to="/admin/overview" replace />
    } else if (role === 'owner') {
      return <Navigate to="/owner/dashboard" replace />
    } else {
      return <Navigate to="/investor/dashboard" replace />
    }
  }
// Check permission-based access
 if (requiredRoute && !hasPermission(requiredRoute, role)) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-gray-50">
 <div className="text-center space-y-3">
 <div className="text-red-600 text-xl font-semibold">Access Denied</div>
 <div className="text-gray-600">You don't have permission to access this page.</div>
 </div>
 </div>
 )
 }
  return children
}