import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function Opportunities() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(import.meta.env.VITE_API_BASE + '/api/properties')
      .then(async r => {
        if (!r.ok) throw new Error('failed_to_load')
        return r.json()
      })
      .then(data => setProperties(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load opportunities. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Investment Opportunities</h2>
      {loading ? (
        <div className="text-gray-600">Loading opportunities…</div>
      ) : error ? (
        <div className="text-red-600" role="alert">{error}</div>
      ) : properties.length === 0 ? (
        <div className="text-gray-600">No properties available yet. Please check back soon.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {properties.map(p => (
            <div key={p.id} className="border rounded p-4 bg-white">
              <div className="font-medium text-lg">{p.name ?? p.title}</div>
              <div className="text-sm text-gray-600">Price per token: {Number(p.tokenPrice ?? 0).toLocaleString()} SAR</div>
              <div className="text-sm text-gray-600">Yield: {p.monthlyYield ?? '-'}%</div>
              <div className="text-sm text-gray-600">Tokens available: {p.remainingTokens ?? p.tokensAvailable}</div>
              <div className="mt-3">
                <Link to={`/properties/${p.id}`} className="inline-block rounded bg-gray-900 text-white px-3 py-2 text-sm">View details</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
