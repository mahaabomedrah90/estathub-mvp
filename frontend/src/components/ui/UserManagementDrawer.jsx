import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  X, User, CheckCircle, XCircle, AlertCircle, Loader2,
  Wallet, ScrollText, Settings, ChevronDown, Mail, Phone,
  Key, ArrowUpRight, ArrowDownLeft, Clock,
  Activity, Ban, Snowflake, TrendingUp, BadgeCheck,
  UserCog, ShieldCheck, RefreshCw, Copy, ExternalLink,
  Tag, BarChart2, AlertTriangle, Globe, Search, Calendar
} from 'lucide-react'
import { authHeader, fetchJson } from '../../lib/api'
import { useTranslation } from 'react-i18next'

// ─── Brand palette ──────────────────────────────────────────────────────────────
const C = {
  primary:    '#1F1F4B',
  accent:     '#48D1C5',
  soft:       '#2A2A66',
  accentSoft: '#DDF8F5',
}

// ─── Toasts ─────────────────────────────────────────────────────────────────────
function useToasts() {
  const [toasts, setToasts] = useState([])
  const add = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])
  return { toasts, addToast: add }
}

function ToastStack({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 280 }}>
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold text-white ${
          t.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {t.type === 'success' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ─── Confirm dialog ──────────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, onConfirm, onCancel, loading, confirmLabel, confirmClass }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-2" style={{ color: C.primary }}>{title}</h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors text-sm disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${confirmClass || 'bg-brand-primary hover:bg-brand-primary-soft'}`}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Copy button ─────────────────────────────────────────────────────────────────
function CopyButton({ value }) {
  const [copied, setCopied] = useState(false)
  const handle = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }
  return (
    <button onClick={handle} title="Copy" className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
      {copied ? <CheckCircle size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  )
}

// ─── Section card ────────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
          {Icon && <Icon size={15} className="text-gray-500" />}
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</span>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Info row (with optional copy) ───────────────────────────────────────────────
function InfoRow({ label, value, mono, copyValue }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0 gap-4">
      <span className="text-xs text-gray-500 font-medium shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-xs font-semibold text-gray-800 text-right truncate ${mono ? 'font-mono' : ''}`}>
          {value || '—'}
        </span>
        {copyValue && <CopyButton value={copyValue} />}
      </div>
    </div>
  )
}

// ─── Verification pill ────────────────────────────────────────────────────────────
function VerificationPill({ verified }) {
  return verified
    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full"><BadgeCheck size={11} /> Verified</span>
    : <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full"><AlertCircle size={11} /> Not Verified</span>
}

// ─── TODO badge ──────────────────────────────────────────────────────────────────
function TodoBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
      TODO: backend
    </span>
  )
}

// ─── Disabled toggle ─────────────────────────────────────────────────────────────
function ToggleSwitchDisabled({ label, desc }) {
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-400">{label} <TodoBadge /></div>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <div className="w-10 h-5 rounded-full bg-gray-200 shrink-0 cursor-not-allowed mt-0.5" />
    </div>
  )
}

// ─── Role pill ───────────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  admin:     'bg-purple-100 text-purple-800 border-purple-200',
  investor:  'bg-teal-100   text-teal-800   border-teal-200',
  owner:     'bg-amber-100  text-amber-800  border-amber-200',
  regulator: 'bg-blue-100   text-blue-800   border-blue-200',
}

function RolePill({ role }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {role}
    </span>
  )
}

// ─── Internal tags ────────────────────────────────────────────────────────────────
const INTERNAL_TAGS = [
  { id: 'vip',         label: 'VIP',         cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'hnn',         label: 'HNN',         cls: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'aml',         label: 'AML',         cls: 'bg-red-100    text-red-800    border-red-200'    },
  { id: 'blacklisted', label: 'Blacklisted', cls: 'bg-gray-900   text-white      border-gray-900'   },
  { id: 'employee',    label: 'Employee',    cls: 'bg-blue-100   text-blue-800   border-blue-200'   },
  { id: 'sandbox',     label: 'Sandbox',     cls: 'bg-green-100  text-green-800  border-green-200'  },
]

// ─── Transaction row ─────────────────────────────────────────────────────────────
const TX_CONFIG = {
  DEPOSIT:        { sign: +1, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  DISTRIBUTION:   { sign: +1, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  WITHDRAWAL:     { sign: -1, color: 'text-red-600',     bg: 'bg-red-50'     },
  TOKEN_MINT:     { sign: -1, color: 'text-orange-600',  bg: 'bg-orange-50'  },
  TOKEN_TRANSFER: { sign: -1, color: 'text-blue-600',    bg: 'bg-blue-50'    },
}

function TxRow({ tx }) {
  const cfg = TX_CONFIG[tx.type] || { sign: 1, color: 'text-gray-700', bg: 'bg-gray-50' }
  const pos = cfg.sign > 0
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}>
          {pos ? <ArrowUpRight size={12} className="text-emerald-600" /> : <ArrowDownLeft size={12} className="text-red-600" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate">{tx.description || tx.type}</p>
          <p className="text-xs text-gray-400">
            {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
          </p>
        </div>
      </div>
      <span className={`text-xs font-bold shrink-0 ml-3 ${cfg.color}`}>
        {pos ? '+' : '−'}{Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
      </span>
    </div>
  )
}

// ─── Audit row ────────────────────────────────────────────────────────────────────
const AUDIT_COLORS = {
  DEPOSIT_APPROVED:    'bg-green-100  text-green-800',
  DEPOSIT_REJECTED:    'bg-red-100    text-red-800',
  ORDER_APPROVED:      'bg-blue-100   text-blue-800',
  ORDER_CANCELLED:     'bg-orange-100 text-orange-800',
  PROPERTY_APPROVED:   'bg-teal-100   text-teal-800',
  PROPERTY_REJECTED:   'bg-rose-100   text-rose-800',
  KYC_APPROVED:        'bg-emerald-100 text-emerald-800',
  KYC_REJECTED:        'bg-red-100    text-red-800',
  WALLET_ADJUSTMENT:   'bg-yellow-100 text-yellow-800',
  ADMIN_LOGIN:         'bg-gray-100   text-gray-700',
  SETTINGS_CHANGED:    'bg-slate-100  text-slate-700',
}

function AuditRow({ log }) {
  const cls = AUDIT_COLORS[log.action] || 'bg-gray-100 text-gray-700'
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${cls}`}>
        {log.action?.replace(/_/g, ' ')}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-600 font-medium truncate">{log.adminEmail || '—'}</p>
        <p className="text-xs text-gray-400">
          {log.createdAt ? new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
        </p>
      </div>
      {log.amount != null && (
        <span className="text-xs font-semibold text-gray-700 shrink-0">
          {Number(log.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
        </span>
      )}
    </div>
  )
}

// ─── Timeline item ────────────────────────────────────────────────────────────────
function TimelineItem({ icon: Icon, label, date, iconBg = 'bg-gray-100', iconColor = 'text-gray-400' }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={14} className={iconColor} />
      </div>
      <div className="pt-1">
        <p className="text-xs font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{date || 'Not recorded'}</p>
      </div>
    </div>
  )
}

// ─── Financial card ────────────────────────────────────────────────────────────────
function FinancialCard({ label, value, icon: Icon, colorClass, bgClass, loading }) {
  return (
    <div className={`${bgClass} rounded-xl p-3.5 border`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={13} className={colorClass} />
        <span className="text-xs text-gray-500 font-medium truncate">{label}</span>
      </div>
      {loading
        ? <div className="h-5 w-20 bg-white/60 rounded animate-pulse" />
        : <p className={`text-sm font-bold ${colorClass}`}>{value}</p>
      }
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'general',      icon: User,        label: 'General'      },
  { id: 'permissions',  icon: UserCog,     label: 'Permissions'  },
  { id: 'verification', icon: ShieldCheck, label: 'Verification' },
  { id: 'wallet',       icon: Wallet,      label: 'Wallet'       },
  { id: 'activity',     icon: Activity,    label: 'Activity'     },
  { id: 'actions',      icon: Settings,    label: 'Admin'        },
]

// ─── Main component ───────────────────────────────────────────────────────────────
export default function UserManagementDrawer({ user: initialUser, onClose, onUserUpdated }) {
  const { i18n } = useTranslation('pages')
  const isRtl = i18n.dir() === 'rtl'

  const [user, setUser]           = useState(initialUser)
  const [visible, setVisible]     = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const { toasts, addToast }      = useToasts()
  const [confirm, setConfirm]     = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const [selectedRole, setSelectedRole] = useState(user.role)
  const [savingRole, setSavingRole]     = useState(false)
  const [savingVerif, setSavingVerif]   = useState(null)
  const [sendingReset, setSendingReset] = useState(false)

  const [walletTxs, setWalletTxs]         = useState([])
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletLoaded, setWalletLoaded]   = useState(false)
  const [walletSearch, setWalletSearch]   = useState('')

  const [auditLogs, setAuditLogs]         = useState([])
  const [auditLoading, setAuditLoading]   = useState(false)
  const [auditLoaded, setAuditLoaded]     = useState(false)
  const [auditSearch, setAuditSearch]     = useState('')

  const walletInitialized = useRef(false)

  // Slide in on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // ── Data loaders ───────────────────────────────────────────────────────────────
  const loadWallet = useCallback(async () => {
    setWalletLoading(true)
    try {
      const data = await fetchJson(`/api/admin/users/${user.id}/wallet-history`, { headers: authHeader() })
      setWalletTxs(Array.isArray(data) ? data : [])
    } catch {
      setWalletTxs([])
    } finally {
      setWalletLoading(false)
      setWalletLoaded(true)
    }
  }, [user.id])

  const loadAudit = useCallback(async () => {
    setAuditLoading(true)
    try {
      const data = await fetchJson(`/api/admin/audit-logs?q=${encodeURIComponent(user.id)}&limit=50`, { headers: authHeader() })
      setAuditLogs(Array.isArray(data?.data) ? data.data : [])
    } catch {
      setAuditLogs([])
    } finally {
      setAuditLoading(false)
      setAuditLoaded(true)
    }
  }, [user.id])

  // Load wallet once on mount (for General tab financial summary)
  useEffect(() => {
    if (!walletInitialized.current) {
      walletInitialized.current = true
      loadWallet()
    }
  }, [loadWallet])

  // Load audit lazily when Activity tab first opened
  useEffect(() => {
    if (activeTab === 'activity' && !auditLoaded && !auditLoading) {
      loadAudit()
    }
  }, [activeTab, auditLoaded, auditLoading, loadAudit])

  // ── Financial summary (computed from transactions) ─────────────────────────────
  const financial = useMemo(() => {
    let balance = 0, deposits = 0, withdrawals = 0, investments = 0
    for (const tx of walletTxs) {
      balance += tx.amount
      if (tx.type === 'DEPOSIT' || tx.type === 'DISTRIBUTION')       deposits    += Math.abs(tx.amount)
      else if (tx.type === 'WITHDRAWAL')                              withdrawals += Math.abs(tx.amount)
      else if (tx.type === 'TOKEN_MINT' || tx.type === 'TOKEN_TRANSFER') investments += Math.abs(tx.amount)
    }
    const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return { balance: fmt(balance), deposits: fmt(deposits), withdrawals: fmt(withdrawals), investments: fmt(investments) }
  }, [walletTxs])

  // ── Filtered lists ─────────────────────────────────────────────────────────────
  const filteredWalletTxs = useMemo(() => {
    const q = walletSearch.trim().toLowerCase()
    if (!q) return walletTxs
    return walletTxs.filter(tx =>
      (tx.description || '').toLowerCase().includes(q) ||
      (tx.type || '').toLowerCase().includes(q) ||
      (tx.ref || '').toLowerCase().includes(q)
    )
  }, [walletTxs, walletSearch])

  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase()
    if (!q) return auditLogs
    return auditLogs.filter(log =>
      (log.action || '').toLowerCase().includes(q) ||
      (log.adminEmail || '').toLowerCase().includes(q) ||
      (log.targetType || '').toLowerCase().includes(q)
    )
  }, [auditLogs, auditSearch])

  // ── Role change ────────────────────────────────────────────────────────────────
  const handleSaveRole = () => {
    if (selectedRole === user.role) return
    setConfirm({
      title: 'Confirm Role Change',
      message: `Change ${user.fullName || user.email}'s role from "${user.role}" to "${selectedRole}"? The user must log out and back in for this to take effect.`,
      confirmLabel: 'Save Role',
      onConfirm: async () => {
        setSavingRole(true); setConfirmLoading(true)
        try {
          await fetchJson(`/api/users/${user.id}/role`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify({ role: selectedRole.toUpperCase() }),
          })
          const updated = { ...user, role: selectedRole }
          setUser(updated); onUserUpdated?.(updated)
          addToast('Role updated successfully', 'success')
          setConfirm(null)
        } catch {
          addToast('Failed to update role', 'error')
        } finally {
          setSavingRole(false); setConfirmLoading(false)
        }
      },
    })
  }

  // ── Verification toggle ────────────────────────────────────────────────────────
  const doToggleVerif = useCallback(async (field, value) => {
    setSavingVerif(field); setConfirmLoading(true)
    try {
      await fetchJson(`/api/users/${user.id}/verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ [field]: value }),
      })
      const updated = { ...user, [field]: value }
      setUser(updated); onUserUpdated?.(updated)
      addToast(`${field === 'emailVerified' ? 'Email' : field === 'phoneVerified' ? 'Phone' : 'KYC'} status updated`, 'success')
      setConfirm(null)
    } catch {
      addToast('Failed to update verification status', 'error')
    } finally {
      setSavingVerif(null); setConfirmLoading(false)
    }
  }, [user, onUserUpdated, addToast])

  const handleToggleVerif = useCallback((field, label) => {
    const next = !user[field]
    setConfirm({
      title: `${next ? 'Verify' : 'Un-verify'} ${label}`,
      message: `${next ? 'Mark' : 'Unmark'} ${user.fullName || user.email}'s ${label.toLowerCase()} as ${next ? 'verified' : 'not verified'}?`,
      confirmLabel: next ? 'Mark as Verified' : 'Mark as Unverified',
      confirmClass: next ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700',
      onConfirm: () => doToggleVerif(field, next),
    })
  }, [user, doToggleVerif])

  const handleApproveKyc = () => { if (!user.kycVerified) handleToggleVerif('kycVerified', 'KYC') }
  const handleRejectKyc  = () => {
    if (!user.kycVerified) return
    setConfirm({
      title: 'Reject KYC',
      message: `Reject KYC for ${user.fullName || user.email}? This will unmark their KYC as verified.`,
      confirmLabel: 'Reject KYC',
      confirmClass: 'bg-red-600 hover:bg-red-700',
      onConfirm: () => doToggleVerif('kycVerified', false),
    })
  }

  // ── Password reset ─────────────────────────────────────────────────────────────
  const handleSendReset = async () => {
    setSendingReset(true)
    try {
      await fetchJson('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      })
      addToast('Password reset email sent', 'success')
    } catch {
      addToast('Failed to send reset email', 'error')
    } finally {
      setSendingReset(false)
    }
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : null

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className={`fixed top-0 bottom-0 right-0 z-[110] w-full md:w-[720px] bg-gray-50 shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ borderLeft: '1px solid #e5e7eb' }}
      >
        <ToastStack toasts={toasts} />

        {/* ── Premium Header ── */}
        <div className="shrink-0" style={{ background: `linear-gradient(135deg, ${C.primary} 0%, ${C.soft} 100%)` }}>

          {/* Top row: avatar + info + close */}
          <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0 border-2 border-white/20"
                style={{ background: `rgba(72,209,197,0.25)` }}
              >
                {(user.fullName || user.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-white font-bold text-base md:text-lg leading-tight truncate">
                  {user.fullName || '—'}
                </h2>
                <p className="text-white/55 text-xs mt-0.5 font-mono truncate">{user.email}</p>
                <div className="flex items-center flex-wrap gap-1.5 mt-2">
                  <RolePill role={user.role} />
                  {user.emailVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 bg-emerald-900/40 border border-emerald-700/40 px-2 py-0.5 rounded-full">
                      <BadgeCheck size={10} /> Email
                    </span>
                  )}
                  {user.phoneVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-300 bg-teal-900/40 border border-teal-700/40 px-2 py-0.5 rounded-full">
                      <BadgeCheck size={10} /> Phone
                    </span>
                  )}
                  {user.kycVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-300 bg-purple-900/40 border border-purple-700/40 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={10} /> KYC
                    </span>
                  )}
                  {user.joinedDate && (
                    <span className="text-xs text-white/35 flex items-center gap-1">
                      <Calendar size={10} /> {fmtDate(user.joinedDate)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Actions row */}
          <div className="px-5 pb-3 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('permissions')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold whitespace-nowrap transition-colors"
            >
              <UserCog size={12} /> Change Role
            </button>
            <button
              onClick={() => handleToggleVerif('emailVerified', 'Email')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                user.emailVerified
                  ? 'bg-emerald-900/40 border-emerald-700/40 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Mail size={12} /> {user.emailVerified ? '✓ Email' : 'Verify Email'}
            </button>
            <button
              onClick={() => handleToggleVerif('phoneVerified', 'Phone')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                user.phoneVerified
                  ? 'bg-emerald-900/40 border-emerald-700/40 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Phone size={12} /> {user.phoneVerified ? '✓ Phone' : 'Verify Phone'}
            </button>
            {!user.kycVerified ? (
              <button
                onClick={handleApproveKyc}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/20 text-xs font-semibold whitespace-nowrap transition-colors"
              >
                <ShieldCheck size={12} /> Approve KYC
              </button>
            ) : (
              <button
                onClick={handleRejectKyc}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/40 border border-red-700/40 text-red-300 hover:bg-red-900/60 text-xs font-semibold whitespace-nowrap transition-colors"
              >
                <XCircle size={12} /> Reject KYC
              </button>
            )}
            <button
              onClick={handleSendReset}
              disabled={sendingReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/20 text-xs font-semibold whitespace-nowrap transition-colors disabled:opacity-50"
            >
              {sendingReset ? <Loader2 size={12} className="animate-spin" /> : <Key size={12} />}
              Reset Password
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 px-4 pb-0 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors rounded-t-xl ${
                  activeTab === tab.id
                    ? 'bg-gray-50 text-brand-primary'
                    : 'text-white/55 hover:text-white hover:bg-white/10'
                }`}
              >
                <tab.icon size={13} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ═══════════════ TAB: GENERAL ═══════════════ */}
          {activeTab === 'general' && (
            <>
              {/* Financial Summary */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Wallet size={12} /> Financial Summary
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <FinancialCard label="Wallet Balance"     value={`${financial.balance} SAR`}     icon={Wallet}        colorClass="text-teal-700"    bgClass="bg-teal-50    border-teal-100"    loading={walletLoading} />
                  <FinancialCard label="Total Deposits"     value={`${financial.deposits} SAR`}    icon={ArrowUpRight}  colorClass="text-emerald-700" bgClass="bg-emerald-50 border-emerald-100" loading={walletLoading} />
                  <FinancialCard label="Total Investments"  value={`${financial.investments} SAR`} icon={TrendingUp}    colorClass="text-indigo-700"  bgClass="bg-indigo-50  border-indigo-100"  loading={walletLoading} />
                  <FinancialCard label="Total Withdrawals"  value={`${financial.withdrawals} SAR`} icon={ArrowDownLeft} colorClass="text-red-700"     bgClass="bg-red-50     border-red-100"     loading={walletLoading} />
                </div>
              </div>

              {/* Account Details */}
              <SectionCard title="Account Details" icon={User}>
                <InfoRow label="Full Name"   value={user.fullName} />
                <InfoRow label="Email"       value={user.email}      mono copyValue={user.email} />
                <InfoRow label="Phone"       value={user.phone}      mono copyValue={user.phone || undefined} />
                <InfoRow label="National ID" value={user.nationalId} mono copyValue={user.nationalId || undefined} />
                <InfoRow label="Role"        value={<RolePill role={user.role} />} />
                <InfoRow label="Registered"  value={fmtDate(user.joinedDate)} />
                <InfoRow label="Last Login"  value={<span className="text-gray-400 italic text-xs flex items-center gap-1">Not available <TodoBadge /></span>} />
                <InfoRow label="Tenant"      value={user.tenantId} mono />
              </SectionCard>

              {/* Verification Status */}
              <SectionCard title="Verification Status" icon={ShieldCheck}>
                <InfoRow label="Email Verified" value={<VerificationPill verified={user.emailVerified} />} />
                <InfoRow label="Phone Verified" value={<VerificationPill verified={user.phoneVerified} />} />
                <InfoRow label="KYC Status"     value={<VerificationPill verified={user.kycVerified} />} />
              </SectionCard>

              {/* Timeline */}
              <SectionCard title="User Timeline" icon={Clock}>
                <div className="space-y-4">
                  <TimelineItem icon={User}       label="Account Registered" date={fmtDate(user.joinedDate)}
                    iconBg="bg-indigo-100" iconColor="text-indigo-600" />
                  <TimelineItem icon={Mail}       label="Email Verified"     date={user.emailVerified ? 'Verified' : undefined}
                    iconBg={user.emailVerified ? 'bg-emerald-100' : 'bg-gray-100'} iconColor={user.emailVerified ? 'text-emerald-600' : 'text-gray-400'} />
                  <TimelineItem icon={Phone}      label="Phone Verified"     date={user.phoneVerified ? 'Verified' : undefined}
                    iconBg={user.phoneVerified ? 'bg-teal-100' : 'bg-gray-100'} iconColor={user.phoneVerified ? 'text-teal-600' : 'text-gray-400'} />
                  <TimelineItem icon={ShieldCheck} label="KYC Approved"      date={user.kycVerified ? 'Approved' : undefined}
                    iconBg={user.kycVerified ? 'bg-purple-100' : 'bg-gray-100'} iconColor={user.kycVerified ? 'text-purple-600' : 'text-gray-400'} />
                  <TimelineItem icon={TrendingUp} label="First Investment"   date={user.investments > 0 ? `${user.investments} investment(s) on record` : undefined}
                    iconBg={user.investments > 0 ? 'bg-amber-100' : 'bg-gray-100'} iconColor={user.investments > 0 ? 'text-amber-600' : 'text-gray-400'} />
                </div>
              </SectionCard>

              {/* Internal Tags */}
              <SectionCard title="Internal Tags" icon={Tag}>
                <div className="flex items-center gap-2 mb-3">
                  <TodoBadge />
                  <span className="text-xs text-gray-400">Requires backend implementation</span>
                </div>
                {/* TODO: GET/POST /api/admin/users/:id/tags — not yet implemented */}
                <div className="flex flex-wrap gap-2">
                  {INTERNAL_TAGS.map(tag => (
                    <button key={tag.id} disabled title="TODO: backend"
                      className={`px-3 py-1 rounded-full text-xs font-semibold border cursor-not-allowed opacity-50 ${tag.cls}`}>
                      {tag.label}
                    </button>
                  ))}
                </div>
              </SectionCard>

              {/* Risk & Security */}
              <SectionCard title="Risk & Security" icon={AlertTriangle}>
                <div className="space-y-0">
                  {[
                    { label: 'Risk Score',             desc: 'Low / Medium / High classification' },
                    { label: 'Failed Login Attempts',  desc: 'Last 30 days' },
                    { label: 'MFA Enabled',            desc: undefined },
                    { label: 'Last Login IP / Device', desc: undefined },
                  ].map(({ label, desc }) => (
                    <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-gray-600">{label}</p>
                        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
                      </div>
                      <TodoBadge />
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* External links */}
              <div className="flex flex-wrap gap-2">
                <a href="/admin/investors" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-brand-primary hover:bg-brand-primary hover:text-white text-xs font-semibold transition-colors shadow-sm">
                  <ExternalLink size={12} /> View Investor Profile
                </a>
                {/* TODO: /api/admin/users/:id/properties — endpoint not yet implemented */}
                <button disabled title="TODO: backend"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-400 cursor-not-allowed text-xs font-semibold shadow-sm">
                  <ExternalLink size={12} /> Property Ownership <TodoBadge />
                </button>
                {/* TODO: /api/admin/users/:id/portfolio — endpoint not yet implemented */}
                <button disabled title="TODO: backend"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-400 cursor-not-allowed text-xs font-semibold shadow-sm">
                  <BarChart2 size={12} /> View Portfolio <TodoBadge />
                </button>
              </div>
            </>
          )}

          {/* ═══════════════ TAB: PERMISSIONS ═══════════════ */}
          {activeTab === 'permissions' && (
            <>
              <SectionCard title="Role Management" icon={UserCog}>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">User Role</label>
                    <div className="relative">
                      <select
                        value={selectedRole}
                        onChange={e => setSelectedRole(e.target.value)}
                        className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold bg-white pr-8 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors"
                        style={{ color: C.primary }}
                      >
                        {['admin', 'investor', 'owner', 'regulator'].map(r => (
                          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    {selectedRole !== user.role && (
                      <p className="text-xs text-amber-600 mt-1.5 font-medium flex items-center gap-1">
                        <AlertTriangle size={11} />
                        Changing from <strong>{user.role}</strong> to <strong>{selectedRole}</strong>. User must re-login.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleSaveRole}
                    disabled={savingRole || selectedRole === user.role}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: selectedRole !== user.role ? `linear-gradient(to right, ${C.primary}, ${C.soft})` : '#9ca3af' }}
                  >
                    {savingRole && <Loader2 size={14} className="animate-spin" />}
                    Save Role
                  </button>
                </div>
              </SectionCard>

              <SectionCard title="Account Status" icon={Activity}>
                <div className="flex items-center justify-between py-2 mb-3 border-b border-gray-50">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Current Status</p>
                    <p className="text-xs text-gray-500 mt-0.5">Active / Inactive / Suspended / Frozen</p>
                  </div>
                  {/* TODO: PATCH /api/users/:id/status — not yet implemented */}
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                    <CheckCircle size={11} /> Active
                  </span>
                </div>
                <ToggleSwitchDisabled label="Active Account" desc="Inactive users cannot access the platform" />
              </SectionCard>

              <SectionCard title="Account Restrictions" icon={Snowflake}>
                {/* TODO: PATCH /api/users/:id/freeze — not yet implemented */}
                <ToggleSwitchDisabled label="Freeze Account" desc="Frozen users cannot invest or withdraw but can still login" />
                <div className="border-t border-gray-50 mt-1 pt-1">
                  {/* TODO: PATCH /api/users/:id/investment-permission — not yet implemented */}
                  <ToggleSwitchDisabled label="Allow Investments" desc="When off, user can browse but cannot invest" />
                </div>
              </SectionCard>
            </>
          )}

          {/* ═══════════════ TAB: VERIFICATION ═══════════════ */}
          {activeTab === 'verification' && (
            <>
              <SectionCard title="Email Verification" icon={Mail}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Email</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">{user.email}</p>
                    <div className="mt-2"><VerificationPill verified={user.emailVerified} /></div>
                  </div>
                  <button
                    onClick={() => handleToggleVerif('emailVerified', 'Email')}
                    disabled={!!savingVerif}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
                      user.emailVerified ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {savingVerif === 'emailVerified' && <Loader2 size={12} className="animate-spin" />}
                    {user.emailVerified ? 'Mark Unverified' : 'Mark Verified'}
                  </button>
                </div>
              </SectionCard>

              <SectionCard title="Phone Verification" icon={Phone}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Phone</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">{user.phone || 'Not provided'}</p>
                    <div className="mt-2"><VerificationPill verified={user.phoneVerified} /></div>
                  </div>
                  <button
                    onClick={() => handleToggleVerif('phoneVerified', 'Phone')}
                    disabled={!!savingVerif}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
                      user.phoneVerified ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {savingVerif === 'phoneVerified' && <Loader2 size={12} className="animate-spin" />}
                    {user.phoneVerified ? 'Mark Unverified' : 'Mark Verified'}
                  </button>
                </div>
              </SectionCard>

              <SectionCard title="KYC Management" icon={ShieldCheck}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">KYC Status</p>
                    <div className="mt-2">
                      {user.kycVerified
                        ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full"><CheckCircle size={11} /> Approved</span>
                        : <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full"><Clock size={11} /> Pending Review</span>
                      }
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleApproveKyc} disabled={!!savingVerif || user.kycVerified}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    {savingVerif === 'kycVerified' && <Loader2 size={12} className="animate-spin" />}
                    <CheckCircle size={13} /> Approve KYC
                  </button>
                  <button onClick={handleRejectKyc} disabled={!!savingVerif || !user.kycVerified}
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    {savingVerif === 'kycVerified' && <Loader2 size={12} className="animate-spin" />}
                    <XCircle size={13} /> Reject KYC
                  </button>
                </div>
              </SectionCard>
            </>
          )}

          {/* ═══════════════ TAB: WALLET ═══════════════ */}
          {activeTab === 'wallet' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FinancialCard label="Balance"     value={`${financial.balance} SAR`}     icon={Wallet}        colorClass="text-teal-700"    bgClass="bg-teal-50    border-teal-100"    loading={walletLoading} />
                <FinancialCard label="Deposits"    value={`${financial.deposits} SAR`}    icon={ArrowUpRight}  colorClass="text-emerald-700" bgClass="bg-emerald-50 border-emerald-100" loading={walletLoading} />
                <FinancialCard label="Investments" value={`${financial.investments} SAR`} icon={TrendingUp}    colorClass="text-indigo-700"  bgClass="bg-indigo-50  border-indigo-100"  loading={walletLoading} />
                <FinancialCard label="Withdrawals" value={`${financial.withdrawals} SAR`} icon={ArrowDownLeft} colorClass="text-red-700"     bgClass="bg-red-50     border-red-100"     loading={walletLoading} />
              </div>

              <div className="relative">
                <Search size={14} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 pointer-events-none" />
                <input type="text" value={walletSearch} onChange={e => setWalletSearch(e.target.value)}
                  placeholder="Search transactions…"
                  className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-9 pr-4 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors"
                />
              </div>

              <SectionCard title={`Transactions${walletSearch ? ` · ${filteredWalletTxs.length} result(s)` : ` · ${walletTxs.length} total`}`} icon={Wallet}>
                {walletLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : filteredWalletTxs.length === 0 ? (
                  <p className="text-center py-8 text-gray-400 text-sm">
                    {walletSearch ? `No transactions matching "${walletSearch}"` : 'No transactions found'}
                  </p>
                ) : (
                  <div>{filteredWalletTxs.map(tx => <TxRow key={tx.id} tx={tx} />)}</div>
                )}
              </SectionCard>

              <button onClick={loadWallet} disabled={walletLoading}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:underline mx-auto disabled:opacity-50">
                <RefreshCw size={12} /> Refresh
              </button>
            </>
          )}

          {/* ═══════════════ TAB: ACTIVITY ═══════════════ */}
          {activeTab === 'activity' && (
            <>
              <div className="relative">
                <Search size={14} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 pointer-events-none" />
                <input type="text" value={auditSearch} onChange={e => setAuditSearch(e.target.value)}
                  placeholder="Search audit logs…"
                  className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-9 pr-4 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors"
                />
              </div>

              <SectionCard title={`Admin Audit Trail${auditSearch ? ` · ${filteredAuditLogs.length} result(s)` : ''}`} icon={ScrollText}>
                {auditLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm">Loading activity…</span>
                  </div>
                ) : filteredAuditLogs.length === 0 ? (
                  <p className="text-center py-8 text-gray-400 text-sm">
                    {auditSearch ? `No records matching "${auditSearch}"` : 'No audit records found for this user'}
                  </p>
                ) : (
                  <div>{filteredAuditLogs.map(log => <AuditRow key={log.id} log={log} />)}</div>
                )}
              </SectionCard>

              <button
                onClick={() => { setAuditLoaded(false); loadAudit() }}
                disabled={auditLoading}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:underline mx-auto disabled:opacity-50"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </>
          )}

          {/* ═══════════════ TAB: ADMIN ACTIONS ═══════════════ */}
          {activeTab === 'actions' && (
            <>
              <SectionCard title="Account Management" icon={Settings}>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Send Password Reset</p>
                    <p className="text-xs text-gray-500 mt-0.5">Sends a reset link to {user.email}</p>
                  </div>
                  <button onClick={handleSendReset} disabled={sendingReset}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-soft disabled:opacity-50 transition-colors">
                    {sendingReset ? <Loader2 size={12} className="animate-spin" /> : <Key size={12} />}
                    Send Reset Email
                  </button>
                </div>
              </SectionCard>

              {/* Internal Notes */}
              <SectionCard title="Internal Notes" icon={ScrollText}>
                <div className="mb-3"><TodoBadge /></div>
                {/* TODO: GET/POST /api/admin/users/:id/notes — not yet implemented */}
                <textarea disabled rows={3} placeholder="Notes will appear here once backend is implemented…"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-400 resize-none cursor-not-allowed" />
              </SectionCard>

              {/* Impersonation */}
              <SectionCard title="Impersonation" icon={Globe}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Login As This User</p>
                    {/* TODO: POST /api/admin/users/:id/impersonate — not yet implemented */}
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      Access the platform as this user <TodoBadge />
                    </p>
                  </div>
                  <button disabled
                    className="shrink-0 px-4 py-2 rounded-xl bg-gray-100 text-gray-400 text-xs font-semibold cursor-not-allowed flex items-center gap-1.5">
                    <User size={12} /> Impersonate
                  </button>
                </div>
              </SectionCard>

              {/* Danger Zone */}
              <SectionCard title="Danger Zone" icon={AlertTriangle} className="border-red-200">
                <div className="space-y-0">
                  <div className="flex items-center justify-between py-3 border-b border-gray-50">
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Deactivate User</p>
                      {/* TODO: PATCH /api/users/:id/status { active: false } — not yet implemented */}
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        Prevent platform access <TodoBadge />
                      </p>
                    </div>
                    <button disabled className="shrink-0 px-4 py-2 rounded-xl bg-gray-100 text-gray-400 text-xs font-semibold cursor-not-allowed flex items-center gap-1.5">
                      <Ban size={12} /> Deactivate
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-50">
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Freeze Account</p>
                      {/* TODO: PATCH /api/users/:id/freeze — not yet implemented */}
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        Block investments &amp; withdrawals <TodoBadge />
                      </p>
                    </div>
                    <button disabled className="shrink-0 px-4 py-2 rounded-xl bg-gray-100 text-gray-400 text-xs font-semibold cursor-not-allowed flex items-center gap-1.5">
                      <Snowflake size={12} /> Freeze
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-400">Delete User</p>
                      <p className="text-xs text-gray-400 mt-0.5">Permanent deletion — future feature</p>
                    </div>
                    <button disabled className="shrink-0 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-300 text-xs font-semibold cursor-not-allowed">
                      Delete
                    </button>
                  </div>
                </div>
              </SectionCard>
            </>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          confirmClass={confirm.confirmClass}
          loading={confirmLoading}
          onConfirm={confirm.onConfirm}
          onCancel={() => { setConfirm(null); setConfirmLoading(false) }}
        />
      )}
    </>
  )
}
