import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const token = localStorage.getItem('estathub_token')
  const role = localStorage.getItem('role') || 'investor'
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    setLoading(false)
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

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (role === 'admin') {
      return <Navigate to="/admin/overview" replace />
    } else if (role === 'owner') {
      return <Navigate to="/owner/dashboard" replace />
    } else {
      return <Navigate to="/investor/dashboard" replace />
    }
  }

  return children
}