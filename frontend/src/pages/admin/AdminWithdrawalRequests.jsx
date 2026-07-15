import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ArrowDownCircle, CheckCircle2, XCircle, Loader2, AlertCircle,
  RefreshCw, User, Calendar, X, Search, TrendingUp, Clock,
  Wallet, Building2, CreditCard
} from 'lucide-react'
import { authHeader, fetchJson } from '../../lib/api'
import { useTranslation } from 'react-i18next'
import WalletHistoryModal from '../../components/ui/WalletHistoryModal'

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING:  { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500' },
  APPROVED: { color: 'bg-green-100 text-green-800 border-green-200',   dot: 'bg-green-500'  },
  REJECTED: { color: 'bg-red-100 text-red-800 border-red-200',         dot: 'bg-red-500'    },
}

const fmt = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const maskIban = (iban) => {
  if (!iban) return null
  const clean = iban.replace(/\s+/g, '')
  if (clean.length < 8) return '****'
  return `${clean.slice(0, 4)} **** **** **** **** ${clean.slice(-4)}`
}

function fmtDate(d, isRtl) {
  return d ? new Date(d).toLocaleDateString(isRtl ? 'ar-SA' : 'en-GB', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : '—'
}

// ─── StatusBadge ────────────────────────────────────────────────────────────

function StatusBadge({ status, t }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
  const label = {
    PENDING:  t('admin.withdrawalRequests.statusPending'),
    APPROVED: t('admin.withdrawalRequests.statusApproved'),
    REJECTED: t('admin.withdrawalRequests.statusRejected'),
  }[status] ?? status
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {label}
    </span>
  )
}

// ─── SummaryCards ────────────────────────────────────────────────────────────

function SummaryCards({ requests, t }) {
  const pending  = requests.filter(r => r.status === 'PENDING').length
  const approved = requests.filter(r => r.status === 'APPROVED').length
  const rejected = requests.filter(r => r.status === 'REJECTED').length
  const totalApproved = requests.filter(r => r.status === 'APPROVED').reduce((s, r) => s + (r.amount || 0), 0)

  const cards = [
    { label: t('admin.withdrawalRequests.statsPending'),      value: pending,       icon: Clock,        color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
    { label: t('admin.withdrawalRequests.statsApproved'),     value: approved,      icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50 border-green-200'   },
    { label: t('admin.withdrawalRequests.statsRejected'),     value: rejected,      icon: XCircle,      color: 'text-red-600',    bg: 'bg-red-50 border-red-200'       },
    { label: t('admin.withdrawalRequests.statsTotalApproved'), value: `${fmt(totalApproved)} ${t('admin.withdrawalRequests.sar')}`, icon: TrendingUp, color: 'text-brand-primary', bg: 'bg-brand-primary/5 border-brand-primary/20' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${bg}`}>
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm flex-shrink-0">
            <Icon size={18} className={color} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 truncate">{label}</p>
            <p className={`text-lg font-bold ${color} truncate`}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── ApproveConfirmModal ──────────────────────────────────────────────────────

function ApproveConfirmModal({ req, onConfirm, onCancel, t, isRtl }) {
  if (!req) return null
  const row = (label, value) => value ? (
    <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-semibold text-gray-500 w-28 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-800 break-all">{value}</span>
    </div>
  ) : null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{t('admin.withdrawalRequests.approveModalTitle')}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{t('admin.withdrawalRequests.approveModalSubtitle')}</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-0 bg-gray-50 mx-4 mt-4 rounded-xl">
          {row(t('admin.withdrawalRequests.approveModalInvestor'), req.user?.fullName)}
          {row(t('admin.withdrawalRequests.approveModalEmail'),    req.user?.email)}
          {row(t('admin.withdrawalRequests.approveModalAmount'),   `${fmt(req.amount)} ${t('admin.withdrawalRequests.sar')}`)}
          {row(t('admin.withdrawalRequests.approveModalBank'),     req.bankName)}
          {row(t('admin.withdrawalRequests.approveModalIban'),     req.iban)}
          {row(t('admin.withdrawalRequests.approveModalDate'),     fmtDate(req.createdAt, isRtl))}
        </div>

        {/* Transfer warning */}
        <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-snug">{t('admin.withdrawalRequests.approveModalTransferWarning')}</p>
        </div>

        <div className="flex gap-3 px-6 py-5">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            {t('admin.withdrawalRequests.cancel')}
          </button>
          <button onClick={() => onConfirm(req)} className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <CheckCircle2 size={15} />
            {t('admin.withdrawalRequests.approveModalConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── RejectModal ──────────────────────────────────────────────────────────────

function RejectModal({ onConfirm, onCancel, t, isRtl }) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{t('admin.withdrawalRequests.rejectTitle')}</h3>
        <p className="text-sm text-gray-500 mb-4">{t('admin.withdrawalRequests.rejectSubtitle')}</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 resize-none"
          placeholder={t('admin.withdrawalRequests.rejectReasonPlaceholder')}
        />
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            {t('admin.withdrawalRequests.cancel')}
          </button>
          <button onClick={() => onConfirm(reason)} className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors">
            {t('admin.withdrawalRequests.confirmReject')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── WithdrawalRow ────────────────────────────────────────────────────────────

function WithdrawalRow({ req, onApprove, onReject, onWalletHistory, approving, rejecting, t, isRtl }) {
  const isPending   = req.status === 'PENDING'
  const isApproving = approving === req.id
  const isRejecting = rejecting === req.id
  const isBusy      = isApproving || isRejecting

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Investor */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-brand-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{req.user?.fullName || '—'}</p>
            <p className="text-xs text-gray-500 truncate">{req.user?.email || '—'}</p>
          </div>
        </div>
      </td>

      {/* Amount */}
      <td className="px-4 py-4">
        <p className="text-sm font-bold text-gray-900">{fmt(req.amount)}</p>
        <p className="text-xs text-gray-400">{t('admin.withdrawalRequests.sar')}</p>
      </td>

      {/* Bank / IBAN — masked in table */}
      <td className="px-4 py-4">
        {req.bankName || req.iban ? (
          <div className="space-y-0.5">
            {req.bankName && <p className="text-xs font-medium text-gray-700 flex items-center gap-1"><Building2 size={11} className="text-gray-400" />{req.bankName}</p>}
            {req.iban && <p className="text-xs text-gray-500 font-mono flex items-center gap-1"><CreditCard size={11} className="text-gray-400" />{maskIban(req.iban)}</p>}
          </div>
        ) : <span className="text-xs text-gray-300">—</span>}
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        <StatusBadge status={req.status} t={t} />
      </td>

      {/* Dates */}
      <td className="px-4 py-4">
        <div className="space-y-1">
          <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={11} />{fmtDate(req.createdAt, isRtl)}</p>
          {req.reviewedAt && <p className="text-xs text-gray-400 flex items-center gap-1"><CheckCircle2 size={11} />{fmtDate(req.reviewedAt, isRtl)}</p>}
        </div>
      </td>

      {/* Admin Note */}
      <td className="px-4 py-4">
        {req.adminNote
          ? <p className="text-xs text-gray-500 max-w-[140px] truncate" title={req.adminNote}>{req.adminNote}</p>
          : <span className="text-xs text-gray-300">—</span>
        }
      </td>

      {/* Actions */}
      <td className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {isPending && (
            <>
              <button
                onClick={() => onApprove(req)}
                disabled={isBusy}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {isApproving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />}
                {t('admin.withdrawalRequests.approve')}
              </button>
              <button
                onClick={() => onReject(req)}
                disabled={isBusy}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed text-red-700 text-xs font-semibold rounded-lg transition-colors"
              >
                {isRejecting ? <Loader2 size={12} className="animate-spin text-red-600" /> : <XCircle size={13} />}
                {t('admin.withdrawalRequests.reject')}
              </button>
            </>
          )}
          <button
            onClick={() => onWalletHistory({ userId: req.userId, name: req.user?.fullName || req.user?.email })}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-semibold rounded-lg transition-colors"
          >
            <Wallet size={12} />
            {t('admin.walletHistory.walletHistoryBtn')}
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminWithdrawalRequests() {
  const { t, i18n } = useTranslation('pages')
  const isRtl = i18n.dir() === 'rtl'

  const [requests, setRequests]             = useState([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')
  const [toast, setToast]                   = useState(null)
  const [filterStatus, setFilterStatus]     = useState('all')
  const [searchQuery, setSearchQuery]       = useState('')
  const [approving, setApproving]           = useState(null)
  const [rejecting, setRejecting]           = useState(null)
  const [approveTarget, setApproveTarget]   = useState(null)
  const [rejectTarget, setRejectTarget]     = useState(null)
  const [walletTarget, setWalletTarget]     = useState(null)

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const url = filterStatus === 'all'
        ? '/api/admin/withdrawal-requests'
        : `/api/admin/withdrawal-requests?status=${filterStatus}`
      const data = await fetchJson(url, { headers: authHeader() })
      setRequests(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load withdrawal requests:', err)
      setError(t('admin.withdrawalRequests.loadError'))
    } finally {
      setLoading(false)
    }
  }, [filterStatus, t])

  useEffect(() => { loadRequests() }, [loadRequests])

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const handleApproveConfirm = async (req) => {
    setApproveTarget(null)
    setApproving(req.id)
    try {
      await fetchJson(`/api/admin/withdrawal-requests/${req.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
      })
      showToast('success', t('admin.withdrawalRequests.approveSuccess'))
      await loadRequests()
    } catch (err) {
      const msg = err?.data?.error
      showToast('error', msg === 'insufficient_balance'
        ? t('admin.withdrawalRequests.insufficientBalance')
        : msg === 'already_approved'
          ? t('admin.withdrawalRequests.alreadyApproved')
          : t('admin.withdrawalRequests.approveError')
      )
    } finally {
      setApproving(null)
    }
  }

  const handleRejectConfirm = async (reason) => {
    const req = rejectTarget
    setRejectTarget(null)
    setRejecting(req.id)
    try {
      await fetchJson(`/api/admin/withdrawal-requests/${req.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ adminNote: reason }),
      })
      showToast('success', t('admin.withdrawalRequests.rejectSuccess'))
      await loadRequests()
    } catch (err) {
      showToast('error', t('admin.withdrawalRequests.rejectError'))
    } finally {
      setRejecting(null)
    }
  }

  const visibleRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return requests
    return requests.filter(r =>
      (r.user?.fullName || '').toLowerCase().includes(q) ||
      (r.user?.email    || '').toLowerCase().includes(q) ||
      (r.bankName       || '').toLowerCase().includes(q) ||
      (r.iban           || '').toLowerCase().includes(q)
    )
  }, [requests, searchQuery])

  const FILTERS = [
    { value: 'all',      label: t('admin.withdrawalRequests.filterAll')      },
    { value: 'PENDING',  label: t('admin.withdrawalRequests.filterPending')  },
    { value: 'APPROVED', label: t('admin.withdrawalRequests.filterApproved') },
    { value: 'REJECTED', label: t('admin.withdrawalRequests.filterRejected') },
  ]

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 ${isRtl ? 'left-4' : 'right-4'} z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {walletTarget && (
        <WalletHistoryModal
          userId={walletTarget.userId}
          investorName={walletTarget.name}
          onClose={() => setWalletTarget(null)}
        />
      )}
      {approveTarget && (
        <ApproveConfirmModal
          req={approveTarget}
          onConfirm={handleApproveConfirm}
          onCancel={() => setApproveTarget(null)}
          t={t}
          isRtl={isRtl}
        />
      )}
      {rejectTarget && (
        <RejectModal
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
          t={t}
          isRtl={isRtl}
        />
      )}

      {/* Header */}
      <div className="bg-brand-primary text-white rounded-2xl p-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <ArrowDownCircle size={24} className="text-brand-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('admin.withdrawalRequests.title')}</h1>
              <p className="text-white/70 text-sm mt-1">{t('admin.withdrawalRequests.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={loadRequests}
            disabled={loading}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {t('admin.withdrawalRequests.refresh')}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && !error && <SummaryCards requests={requests} t={t} />}

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                filterStatus === f.value
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-primary hover:text-brand-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRtl ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('admin.withdrawalRequests.searchPlaceholder')}
            className={`w-full bg-white border border-gray-200 rounded-xl py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-brand-accent" size={28} />
            <span className="text-gray-500 text-sm">{t('admin.withdrawalRequests.loading')}</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle className="text-red-400" size={32} />
            <p className="text-red-600 text-sm font-medium">{error}</p>
            <button onClick={loadRequests} className="text-sm text-brand-accent hover:underline font-medium">
              {t('admin.withdrawalRequests.retry')}
            </button>
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <ArrowDownCircle size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm font-medium">{t('admin.withdrawalRequests.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {[
                    t('admin.withdrawalRequests.colInvestor'),
                    t('admin.withdrawalRequests.colAmount'),
                    t('admin.withdrawalRequests.colBank'),
                    t('admin.withdrawalRequests.colStatus'),
                    t('admin.withdrawalRequests.colDates'),
                    t('admin.withdrawalRequests.colNote'),
                    t('admin.withdrawalRequests.colActions'),
                  ].map(h => (
                    <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRequests.map(req => (
                  <WithdrawalRow
                    key={req.id}
                    req={req}
                    onApprove={r => setApproveTarget(r)}
                    onReject={r => setRejectTarget(r)}
                    onWalletHistory={setWalletTarget}
                    approving={approving}
                    rejecting={rejecting}
                    t={t}
                    isRtl={isRtl}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
