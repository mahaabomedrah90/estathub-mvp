import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchJson, setToken } from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('investor@estathub.local')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setToken(res.token)
      navigate('/wallet')
    } catch (err) {
      setError('Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="border rounded w-full px-3 py-2"
            placeholder="you@example.com"
            required
          />
        </div>
        {error ? <div className="text-red-600 text-sm">{error}</div> : null}
        <button disabled={loading} className="rounded bg-gray-900 text-white px-4 py-2">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
