import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getToken, authHeader, fetchJson } from '../lib/api'

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [tokens, setTokens] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/properties`)
      .then(r => r.json())
      .then(list => setProperty(list.find(p => String(p.id) === String(id)) || null))
      .catch(() => setProperty(null))
  }, [id])

  if (!property) {
    return <div>Loading property...</div>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{property.name || property.title}</h2>
      <div className="text-gray-600">Monthly Yield: {property.monthlyYield ?? '-' }%</div>
      <div className="text-gray-600">Price per token: {property.tokenPrice ?? '-'} SAR</div>
      <div className="text-gray-600">Tokens available: {property.remainingTokens ?? property.tokensAvailable}</div>

      <div className="border rounded p-4 bg-white max-w-md">
        <div className="font-medium mb-2">Invest (MVP mock)</div>
        <label className="block text-sm mb-1">Number of tokens</label>
        <input
          type="number"
          min={1}
          value={tokens}
          onChange={e => setTokens(Number(e.target.value))}
          className="border rounded w-full px-3 py-2"
        />
        {error ? (
          <div className="text-red-600 text-sm mt-2" role="alert">
            {error}
          </div>
        ) : null}
        <button
          disabled={loading}
          onClick={async () => {
            setError('')
            if (!getToken()) {
              navigate('/login')
              return
            }
            try {
              setLoading(true)
              // create order
              const order = await fetchJson('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ propertyId: Number(id), tokens: Number(tokens) }),
              })
              // confirm payment (stub)
              await fetchJson('/api/payments/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ orderId: order.id }),
              })
              navigate('/wallet')
            } catch (e) {
              const unit = Number(property.tokenPrice || 0)
              const need = unit * Number(tokens || 0)
              const msg = String(e?.message || '')
              if (msg === 'insufficient_balance') {
                setError(`Insufficient wallet balance. You need SAR ${need.toLocaleString()} to complete this purchase. Please deposit and try again.`)
              } else if (msg === 'insufficient_tokens') {
                setError('Not enough tokens available for this property. Try a smaller amount.')
              } else if (msg === 'property_not_found') {
                setError('Property not found. Please go back to Opportunities and try again.')
              } else {
                setError('Investment failed. Please try again in a moment.')
              }
            } finally {
              setLoading(false)
            }
          }}
          className="mt-3 inline-block rounded bg-gray-900 text-white px-4 py-2"
        >{loading ? 'Processing…' : 'Proceed to Pay (stub)'}
        </button>
      </div>
    </div>
  )
}
