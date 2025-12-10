import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  AlertTriangle,
  Search,
  Loader2,
} from 'lucide-react'
import { getRegulatorAMLAlerts } from '../../lib/api'

export default function RegAMLAlerts() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [alerts, setAlerts] = useState({ high: [], medium: [], low: [] })
  const [search, setSearch] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      setLoading(true)
      setError('')
      const data = await getRegulatorAMLAlerts()
      setAlerts({
        high: data?.high || [],
        medium: data?.medium || [],
        low: data?.low || [],
      })
    } catch (e) {
      console.error('Regulator AML alerts error:', e)
      setError(e.message || 'Failed to load AML alerts')
    } finally {
      setLoading(false)
    }
  }

  const filterBySearch = (items) =>
    items.filter((a) => {
      if (!search) return true
      const needle = search.toLowerCase()
      return (
        (a.message || '').toLowerCase().includes(needle) ||
        (a.userEmail || '').toLowerCase().includes(needle) ||
        (a.propertyTitle || '').toLowerCase().includes(needle)
      )
    })

  const filtered = {
    high: filterBySearch(alerts.high),
    medium: filterBySearch(alerts.medium),
    low: filterBySearch(alerts.low),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-purple-600 mx-auto" size={40} />
          <div className="text-gray-600">Loading AML alerts...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="text-sm text-gray-500 flex items-center gap-2">
        <span
          className="cursor-pointer hover:text-gray-700"
          onClick={() => navigate('/regulator/overview')}
        >
          Regulator
        </span>
        <span>/</span>
        <span className="text-gray-900 font-medium">AML Alerts</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-purple-600" size={24} />
            AML Alerts & Risk Signals
          </h1>
          <p className="text-gray-600">
            Investigate high-risk investors, rapid trades, and suspicious movements.
          </p>
        </div>
      </div>

      {/* Search filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Search alerts
        </label>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Message, user email, property..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm">
          <AlertTriangle className="text-red-600" size={18} />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Alert columns */}
      <div className="grid md:grid-cols-3 gap-4">
        <AlertColumn
          title="High Severity"
          color="red"
          items={filtered.high}
        />
        <AlertColumn
          title="Medium Severity"
          color="amber"
          items={filtered.medium}
        />
        <AlertColumn
          title="Low Severity"
          color="emerald"
          items={filtered.low}
        />
      </div>
    </div>
  )
}

function AlertColumn({ title, color, items }) {
  const headerBg =
    color === 'red'
      ? 'bg-red-50 text-red-700'
      : color === 'amber'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-emerald-50 text-emerald-700'
  const badgeClass =
    color === 'red'
      ? 'bg-red-100 text-red-700'
      : color === 'amber'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-emerald-100 text-emerald-700'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
      <div className={`px-4 py-2 text-sm font-semibold ${headerBg}`}>
        {title} ({items.length})
      </div>
      <div className="p-3 space-y-2 text-sm flex-1">
        {items.length === 0 ? (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            No alerts in this category.
          </div>
        ) : (
          items.map((a) => (
            <div
              key={a.id}
              className="border border-gray-100 rounded-lg px-3 py-2 bg-gray-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-gray-900 text-xs font-semibold">
                    {a.message}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    {a.userEmail || 'Unknown user'}
                    {a.propertyTitle ? ` · ${a.propertyTitle}` : ''}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeClass}`}>
                  {a.type}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                {a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}