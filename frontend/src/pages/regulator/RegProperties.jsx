import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Search,
  Calendar,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react'
import {
  getRegulatorProperties,
  approvePropertyAsRegulator,
  rejectPropertyAsRegulator,
} from '../../lib/api'

export default function RegProperties() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [properties, setProperties] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [actionId, setActionId] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load(params = {}) {
    try {
      setLoading(true)
      setError('')
      const data = await getRegulatorProperties(params)
      setProperties(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Regulator properties load error:', e)
      setError(e.message || 'Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  function handleApplyFilters() {
    setPage(1)
    const params = {}
    if (search) params.search = search
    if (status) params.status = status
    if (fromDate) params.from = fromDate
    if (toDate) params.to = toDate
    load(params)
  }

  async function handleDecision(id, action) {
    try {
      setActionId(id)
      setError('')
      if (action === 'approve') {
        await approvePropertyAsRegulator(id)
      } else {
        const reason = window.prompt('Rejection reason (optional):') || ''
        await rejectPropertyAsRegulator(id, reason)
      }
      // Refresh list with current filters
      handleApplyFilters()
    } catch (e) {
      console.error('Regulator decision error:', e)
      setError(e.message || 'Failed to update property status')
    } finally {
      setActionId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(properties.length / pageSize))
  const paginated = properties.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="text-sm text-gray-500 flex items-center gap-2">
        <span className="cursor-pointer hover:text-gray-700" onClick={() => navigate('/regulator/overview')}>
          Regulator
        </span>
        <span>/</span>
        <span className="text-gray-900 font-medium">Properties</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="text-purple-600" size={24} />
            Properties Under Supervision
          </h1>
          <p className="text-gray-600">
            Review, approve, or reject tokenized properties.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col md:flex-row gap-4 md:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, owner, location, deed number..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
            <Calendar size={14} />
            From
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
            <Calendar size={14} />
            To
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <div>
          <button
            onClick={handleApplyFilters}
            className="w-full md:w-auto px-4 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm">
          <AlertTriangle className="text-red-600" size={18} />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Table or skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-10 bg-gray-100 rounded animate-pulse"
              />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-10">
            <Building2 className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-600 text-sm">
              No properties found for the current filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-700">Title</th>
                    <th className="text-left py-2 px-3 text-gray-700">Owner</th>
                    <th className="text-left py-2 px-3 text-gray-700">Submitted</th>
                    <th className="text-left py-2 px-3 text-gray-700">Status</th>
                    <th className="text-right py-2 px-3 text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td
                        className="py-2 px-3 cursor-pointer text-purple-700 hover:underline"
                        onClick={() => navigate(`/regulator/properties/${p.id}`)}
                      >
                        {p.title}
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {p.ownerName || 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {p.submittedAt
                          ? new Date(p.submittedAt).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="py-2 px-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex justify-end gap-2">
                          <button
                            disabled={
                              actionId === p.id || p.status === 'APPROVED'
                            }
                            onClick={() => handleDecision(p.id, 'approve')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {actionId === p.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            Approve
                          </button>
                          <button
                            disabled={
                              actionId === p.id || p.status === 'REJECTED'
                            }
                            onClick={() => handleDecision(p.id, 'reject')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            <X size={14} />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 text-xs text-gray-600">
              <div>
                Page {page} of {totalPages} · {properties.length} total properties
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded border text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="px-3 py-1 rounded border text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const s = status || 'PENDING'
  const base =
    s === 'APPROVED'
      ? 'bg-emerald-100 text-emerald-700'
      : s === 'REJECTED'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700'
  const label =
    s === 'APPROVED'
      ? 'Approved'
      : s === 'REJECTED'
      ? 'Rejected'
      : 'Under Review'
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${base}`}>
      {label}
    </span>
  )
}