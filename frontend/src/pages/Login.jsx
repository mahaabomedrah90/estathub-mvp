import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchJson, setToken } from '../lib/api'
import { Building2, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('investor@estathub.local')
  const [role, setRole] = useState('investor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    console.log('🔐 Starting login...', { email, role })
    
    try {
      const res = await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      
      console.log('✅ Login response:', res)
      
      if (!res || !res.token) {
        throw new Error('Invalid response from server')
      }
      
      setToken(res.token)
      
      // Store role and userId in localStorage
      localStorage.setItem('role', role)
      localStorage.setItem('userId', res.user?.id || res.userId || '1')
      
      console.log('💾 Stored in localStorage:', {
        role,
        userId: localStorage.getItem('userId'),
        token: !!localStorage.getItem('estathub_token')
      })
      
      // Navigate based on role
      const redirectUrl = role === 'admin' 
        ? '/admin/overview'
        : role === 'owner'
        ? '/owner/dashboard'
        : '/investor/dashboard'
      
      console.log('🚀 Redirecting to:', redirectUrl)
      
      // Use window.location for hard redirect
      window.location.href = redirectUrl
    } catch (err) {
      console.error('❌ Login error:', err)
      setError('Login failed. Please check your credentials and try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="text-emerald-600" size={40} />
            <span className="text-3xl font-bold text-gray-900">Estathub</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to access your investment portfolio</p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="text-gray-400" size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="border border-gray-300 rounded-lg w-full pl-10 pr-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Login As
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('investor')}
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                    role === 'investor'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  Investor
                </button>
                <button
                  type="button"
                  onClick={() => setRole('owner')}
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                    role === 'owner'
                      ? 'border-amber-600 bg-amber-50 text-amber-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  Owner
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                    role === 'admin'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2" role="alert">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading} 
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-3 font-semibold transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <Lock size={20} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Demo Notice */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Demo Mode:</strong> Use the pre-filled email or any email to login (no password required for MVP).
            </p>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Don't have an account? {' '}
            <a href="#" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
