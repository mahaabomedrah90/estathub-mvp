import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Clock3,
  Download, ListChecks, Loader2, Search, Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { apiUrl, authHeader, fetchJson } from '../../lib/api'

const PAGE_SIZE = 20

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
          <Icon size={19} className="text-brand-primary" />
        </div>
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-gray-500">{label}</p>
    </div>
  )
}

export default function AdminWaitingList() {
  const { t, i18n } = useTranslation('pages')
  const isRtl = i18n.dir() === 'rtl'
  const [registrations, setRegistrations] = useState([])
  const [summary, setSummary] = useState({ total: 0, today: 0, week: 0, month: 0 })
  const [sources, setSources] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, pages: 0 })
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const loadRegistrations = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (search) params.set('q', search)
      if (source) params.set('source', source)
      const result = await fetchJson(`/api/admin/waiting-list?${params}`, { headers: authHeader() })
      setRegistrations(Array.isArray(result.data) ? result.data : [])
      setSummary(result.summary || { total: 0, today: 0, week: 0, month: 0 })
      setSources(Array.isArray(result.sources) ? result.sources : [])
      setPagination(result.pagination || { total: 0, page: 1, limit: PAGE_SIZE, pages: 0 })
    } catch (err) {
      console.error('Waiting-list load error:', err)
      setError(t('admin.waitingList.loadError'))
    } finally {
      setLoading(false)
    }
  }, [page, search, source, t])

  useEffect(() => { loadRegistrations() }, [loadRegistrations])

  const exportCsv = async () => {
    setExporting(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (source) params.set('source', source)
      const response = await fetch(apiUrl(`/api/admin/waiting-list/export?${params}`), {
        headers: authHeader(),
      })
      if (!response.ok) throw new Error(`Export failed with status ${response.status}`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `waiting-list-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Waiting-list export error:', err)
      setError(t('admin.waitingList.exportError'))
    } finally {
      setExporting(false)
    }
  }

  const formatDate = (value) => new Date(value).toLocaleString(
    isRtl ? 'ar-SA' : 'en-GB',
    {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  )

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-brand-primary text-white rounded-2xl p-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
            <ListChecks size={24} className="text-brand-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('admin.waitingList.title')}</h1>
            <p className="text-white/70 text-sm mt-1">{t('admin.waitingList.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={exportCsv}
          disabled={exporting || loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-accent text-white font-semibold text-sm hover:bg-brand-accent/90 disabled:opacity-60"
        >
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {t('admin.waitingList.exportCsv')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} label={t('admin.waitingList.total')} value={summary.total} />
        <StatCard icon={Clock3} label={t('admin.waitingList.today')} value={summary.today} />
        <StatCard icon={CalendarDays} label={t('admin.waitingList.week')} value={summary.week} />
        <StatCard icon={CalendarDays} label={t('admin.waitingList.month')} value={summary.month} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search size={16} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRtl ? 'right-3' : 'left-3'}`} />
          <input
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            placeholder={t('admin.waitingList.searchPlaceholder')}
            className={`w-full bg-white border border-gray-200 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
          />
        </div>
        <select
          value={source}
          onChange={event => { setSource(event.target.value); setPage(1) }}
          className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        >
          <option value="">{t('admin.waitingList.allSources')}</option>
          {sources.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-brand-accent" size={28} />
            <span className="text-gray-500 text-sm">{t('admin.waitingList.loading')}</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle className="text-red-400" size={32} />
            <p className="text-red-600 text-sm font-medium">{error}</p>
            <button onClick={loadRegistrations} className="text-sm text-brand-accent hover:underline font-medium">
              {t('admin.waitingList.retry')}
            </button>
          </div>
        ) : registrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <ListChecks size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm font-medium">{t('admin.waitingList.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['contact', 'amount', 'source', 'language', 'registeredAt'].map(column => (
                    <th key={column} className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {t(`admin.waitingList.columns.${column}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrations.map(registration => (
                  <tr key={registration.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">{registration.contact}</td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{registration.amount || '—'}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-semibold">
                        {registration.source}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{registration.language}</td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{formatDate(registration.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-gray-500">
            {t('admin.waitingList.pageOf', { page: pagination.page, pages: pagination.pages, total: pagination.total })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(value => Math.max(1, value - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border border-gray-200 rounded-lg bg-white disabled:opacity-40"
            >
              {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              {t('admin.waitingList.previous')}
            </button>
            <button
              onClick={() => setPage(value => Math.min(pagination.pages, value + 1))}
              disabled={page >= pagination.pages}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border border-gray-200 rounded-lg bg-white disabled:opacity-40"
            >
              {t('admin.waitingList.next')}
              {isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
