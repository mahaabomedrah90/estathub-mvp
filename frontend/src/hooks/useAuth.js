import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

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