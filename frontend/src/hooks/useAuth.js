import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { hasPermission, getCurrentPermissions, getNavigationItems } from '../lib/api'

export function useAuth() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  function checkAuth() {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role') || 'investor' // default to investor
    const userId = localStorage.getItem('userId')

    if (token) {
      setUser({ token, role, userId })
    } else {
      setUser(null)
    }
    setLoading(false)
  }

  function login(token, role, userId) {
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    localStorage.setItem('userId', userId)
    setUser({ token, role, userId })
    
    // Navigate based on role
    if (role === 'admin') {
      navigate('/admin/overview')
    } else if (role === 'owner') {
      navigate('/owner/dashboard')
    } else {
      navigate('/investor/portfolio')
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('userId')
    setUser(null)
    navigate('/login')
  }

  function setRole(newRole) {
    localStorage.setItem('role', newRole)
    setUser(prev => ({ ...prev, role: newRole }))
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    setRole,
    checkAuth
  }
  }
// Hook for checking permissions
export function usePermissions(route = null) {
 const [userRole, setUserRole] = useState('investor')
 const [permissions, setPermissions] = useState([])
 const [loading, setLoading] = useState(true)
 useEffect(() => {
 const role = (localStorage.getItem('role') || 'investor').toLowerCase()
 setUserRole(role)
 setPermissions(getCurrentPermissions())
 setLoading(false)
 }, [])
 const canAccess = (targetRoute) => {
 return hasPermission(targetRoute || route, userRole)
 }
 return {
 userRole,
 permissions,
 loading,
 canAccess,
 hasPermission: canAccess
 }
}
// Hook for navigation items based on role
export function useNavigation() {
 const [items, setItems] = useState([])
 const [loading, setLoading] = useState(true)
 useEffect(() => {
 const role = (localStorage.getItem('role') || 'investor').toLowerCase()
 setItems(getNavigationItems(role))
 setLoading(false)
 }, [])
 return { items, loading }
}
// Component for conditional rendering based on permissions
export function PermissionGate({ children, route, roles = [], fallback = null }) {
 const { canAccess, userRole, loading } = usePermissions()
 if (loading) {
 return fallback || null
 }
 if (!canAccess(route)) {
 return fallback || null
 }
 return children
}