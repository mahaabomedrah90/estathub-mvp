import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Link2,
  Search,
  Calendar,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { getRegulatorLedger } from '../../lib/api'

export default function RegLedger() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    load()
  }, [])

  async function load(params = {}) {
    try {
      setLoading(true)
      setError('')
      const data = await getRegulatorLedger(params)
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Regulator ledger error:', e)
      setError(e.message || 'Failed to load regulatory ledger')
    } finally {
      setLoading(false)
    }
  }

  function handleApplyFilters() {
    setPage(1)
    const params = {}
    if (search) params.search = search
    if (fromDate) params.from = fromDate
    if (toDate) params.to = toDate
    load(params)
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const paginated = rows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="text-sm text-gray-500 flex items-center gap-2">
        <span className="cursor-pointer hover:text-gray-700" onClick={() => navigate('/regulator/overview')}>
          Regulator
        </span>
        <span>/</span>
        <span className="text-gray-900 font-medium">Regulatory Ledger</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Link2 className="text-purple-600" size={24} />
            Regulatory Ledger
          </h1>
          <p className="text-gray-600">
            On-chain events, token mints, and ownership updates per property.
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
              placeholder="Property title, owner, deed number..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10">
            <Link2 className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-600 text-sm">
              No ledger entries found for the current filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-700">Property</th>
                    <th className="text-left py-2 px-3 text-gray-700">Owner</th>
                    <th className="text-left py-2 px-3 text-gray-700">Total Supply</th>
                    <th className="text-left py-2 px-3 text-gray-700">Distributed</th>
                    <th className="text-left py-2 px-3 text-gray-700">Investors</th>
                    <th className="text-left py-2 px-3 text-gray-700">Last On-Chain Event</th>
                    <th className="text-left py-2 px-3 text-gray-700">Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r) => (
                    <tr key={r.propertyId} className="border-b border-gray-100">
                      <td className="py-2 px-3">
                        <div className="font-medium text-gray-900">
                          {r.propertyId}
                        </div>
                        <div className="text-xs text-gray-500">
                          Deed: {r.deedNumber || 'N/A'}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {r.ownerName || 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {r.totalSupply?.toLocaleString() || 0}
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {r.distributedTokens?.toLocaleString() || 0}
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {r.investorsCount || 0}
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-xs">
                        {r.lastOnChainEvent || '—'}
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-xs">
                        {r.lastUpdateDate
                          ? new Date(r.lastUpdateDate).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 text-xs text-gray-600">
              <div>
                Page {page} of {totalPages} · {rows.length} total entries
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