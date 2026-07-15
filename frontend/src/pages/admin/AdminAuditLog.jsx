import React, { useState, useEffect, useCallback } from 'react'
import {
  ScrollText, Search, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, Calendar, User, Zap,
  ArrowUpRight, ArrowDownLeft, Shield
} from 'lucide-react'
import { authHeader, fetchJson } from '../../lib/api'
import { useTranslation } from 'react-i18next'

// ─── Action badge ──────────────────────────────────────────────────────────────

const ACTION_COLORS = {
  DEPOSIT_APPROVED:    'bg-green-100  text-green-800  border-green-200',
  DEPOSIT_REJECTED:    'bg-red-100    text-red-800    border-red-200',
  ORDER_APPROVED:      'bg-blue-100   text-blue-800   border-blue-200',
  ORDER_CANCELLED:     'bg-orange-100 text-orange-800 border-orange-200',
  PROPERTY_APPROVED:   'bg-teal-100   text-teal-800   border-teal-200',
  PROPERTY_REJECTED:   'bg-rose-100   text-rose-800   border-rose-200',
  PROPERTY_UPDATED:    'bg-indigo-100 text-indigo-800 border-indigo-200',
  KYC_APPROVED:        'bg-emerald-100 text-emerald-800 border-emerald-200',
  KYC_REJECTED:        'bg-red-100    text-red-800    border-red-200',
  WALLET_ADJUSTMENT:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  DIGITAL_DEED_ISSUED: 'bg-purple-100 text-purple-800 border-purple-200',
  ADMIN_LOGIN:         'bg-gray-100   text-gray-800   border-gray-200',
  SETTINGS_CHANGED:    'bg-slate-100  text-slate-800  border-slate-200',
}

function ActionBadge({ action }) {
  const cls = ACTION_COLORS[action] || 'bg-gray-100 text-gray-700 border-gray-200'
  const label = action.replace(/_/g, ' ')
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${cls}`}>
      {label}
    </span>
  )
}

// ─── Wallet delta cell ─────────────────────────────────────────────────────────

function WalletDelta({ before, after }) {
  if (before == null || after == null) return <span className="text-xs text-gray-300">—</span>
  const delta = after - before
  const sign  = delta >= 0 ? '+' : ''
  const cls   = delta >= 0 ? 'text-green-600' : 'text-red-600'
  const Icon  = delta >= 0 ? ArrowUpRight : ArrowDownLeft
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${cls}`}>
      <Icon size={12} />
      {sign}{Number(delta).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
    </span>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export default function AdminAuditLog() {
  const { t, i18n } = useTranslation('pages')
  const isRtl = i18n.dir() === 'rtl'

  const [logs, setLogs]           = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 })
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  // Filters
  const [range, setRange]               = useState('all')
  const [searchInput, setSearchInput]   = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [page, setPage]                 = useState(1)

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => { setDebounced(searchInput); setPage(1) }, 350)
    return () => clearTimeout(id)
  }, [searchInput])

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams({
        page:  String(page),
        limit: String(PAGE_SIZE),
      })
      if (range !== 'all')    params.set('range', range)
      if (debouncedSearch)    params.set('q', debouncedSearch)

      const data = await fetchJson(`/api/admin/audit-logs?${params}`, { headers: authHeader() })
      setLogs(Array.isArray(data.data) ? data.data : [])
      setPagination(data.pagination || { total: 0, page: 1, pages: 1 })
    } catch (err) {
      console.error('Audit log load error:', err)
      setError(t('admin.auditLog.loadError'))
    } finally {
      setLoading(false)
    }
  }, [page, range, debouncedSearch, t])

  useEffect(() => { loadLogs() }, [loadLogs])

  const fmtDate = (d) => d ? new Date(d).toLocaleString(isRtl ? 'ar-SA' : 'en-GB', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—'

  const fmtAmount = (n) => n != null
    ? Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null

  const RANGES = [
    { value: 'today', label: t('admin.auditLog.filterToday')  },
    { value: '7d',    label: t('admin.auditLog.filter7d')     },
    { value: '30d',   label: t('admin.auditLog.filter30d')    },
    { value: 'all',   label: t('admin.auditLog.filterAll')    },
  ]

  const COLS = [
    t('admin.auditLog.colDate'),
    t('admin.auditLog.colAdmin'),
    t('admin.auditLog.colAction'),
    t('admin.auditLog.colInvestor'),
    t('admin.auditLog.colAmount'),
    t('admin.auditLog.colWalletDelta'),
    t('admin.auditLog.colTarget'),
    t('admin.auditLog.colIp'),
  ]

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className="bg-brand-primary text-white rounded-2xl p-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
            <ScrollText size={24} className="text-brand-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('admin.auditLog.title')}</h1>
            <p className="text-white/70 text-sm mt-1">{t('admin.auditLog.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Time range tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => { setRange(r.value); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                range === r.value
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-primary hover:text-brand-primary'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[260px]">
          <Search size={15} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRtl ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={t('admin.auditLog.searchPlaceholder')}
            className={`w-full bg-white border border-gray-200 rounded-xl py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-brand-accent" size={28} />
            <span className="text-gray-500 text-sm">{t('admin.auditLog.loading')}</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle className="text-red-400" size={32} />
            <p className="text-red-600 text-sm font-medium">{error}</p>
            <button onClick={loadLogs} className="text-sm text-brand-accent hover:underline font-medium">
              {t('admin.auditLog.retry')}
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <ScrollText size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm font-medium">{t('admin.auditLog.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {COLS.map(h => (
                    <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    {/* Date */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <Calendar size={11} className="text-gray-400 flex-shrink-0" />
                        {fmtDate(log.createdAt)}
                      </p>
                    </td>

                    {/* Admin */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Shield size={13} className="text-brand-primary flex-shrink-0" />
                        <p className="text-xs text-gray-800 truncate max-w-[140px]" title={log.adminEmail}>
                          {log.adminEmail || '—'}
                        </p>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ActionBadge action={log.action} />
                    </td>

                    {/* Investor */}
                    <td className="px-4 py-3">
                      {log.investorName ? (
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-gray-400 flex-shrink-0" />
                          <p className="text-xs text-gray-700 truncate max-w-[130px]" title={log.investorName}>
                            {log.investorName}
                          </p>
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.amount != null ? (
                        <p className="text-xs font-semibold text-gray-800">
                          {fmtAmount(log.amount)} <span className="font-normal text-gray-400">{t('admin.auditLog.sar')}</span>
                        </p>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>

                    {/* Wallet delta */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <WalletDelta before={log.walletBefore} after={log.walletAfter} />
                    </td>

                    {/* Target */}
                    <td className="px-4 py-3">
                      {log.targetId ? (
                        <p className="text-xs font-mono text-gray-500 truncate max-w-[120px]" title={log.targetId}>
                          {log.targetId.slice(0, 16)}…
                        </p>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>

                    {/* IP */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-mono text-gray-400">{log.ipAddress || '—'}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-gray-500">
            {t('admin.auditLog.pageOf', { page: pagination.page, pages: pagination.pages })}
            {' '}({pagination.total} {isRtl ? 'إدخال' : 'entries'})
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              {t('admin.auditLog.prevPage')}
            </button>
            <button
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('admin.auditLog.nextPage')}
              {isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
