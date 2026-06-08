import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Users, Edit2, CheckCircle, Shield, User, Loader2,
  AlertCircle, Search, RefreshCw, UserCog
} from 'lucide-react'
import { authHeader, fetchJson } from '../../lib/api'
import { useTranslation } from 'react-i18next'
import UserManagementDrawer from '../../components/ui/UserManagementDrawer'

// ─── Role badge styling ─────────────────────────────────────────────────────────
const ROLE_STYLES = {
  owner:     'bg-amber-50  text-amber-800  border-amber-200',
  investor:  'bg-teal-50   text-teal-800   border-teal-200',
  admin:     'bg-purple-50 text-purple-800 border-purple-200',
  regulator: 'bg-blue-50   text-blue-800   border-blue-200',
}

function RoleBadge({ role, label }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${ROLE_STYLES[role] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {label || role}
    </span>
  )
}

// ─── Verification status indicators ────────────────────────────────────────────
function VerifDots({ user }) {
  return (
    <div className="flex items-center gap-1">
      <span title="Email" className={`w-2 h-2 rounded-full ${user.emailVerified ? 'bg-emerald-500' : 'bg-gray-200'}`} />
      <span title="Phone" className={`w-2 h-2 rounded-full ${user.phoneVerified ? 'bg-emerald-500' : 'bg-gray-200'}`} />
      <span title="KYC"   className={`w-2 h-2 rounded-full ${user.kycVerified   ? 'bg-teal-500'   : 'bg-gray-200'}`} />
    </div>
  )
}

// ─── Stat cards ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, colorClass, bgClass }) {
  return (
    <div className={`${bgClass} rounded-2xl p-5 border`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/60`}>
          <Icon size={18} className={colorClass} />
        </div>
        <span className={`text-2xl font-bold ${colorClass}`}>{value}</span>
      </div>
      <p className="text-xs font-semibold text-gray-600">{label}</p>
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────────
function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
        <Users size={24} className="text-gray-400" />
      </div>
      <p className="text-gray-400 text-sm font-medium">{message}</p>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const { t, i18n } = useTranslation('pages')
  const isRtl = i18n.dir() === 'rtl'

  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [filter, setFilter]         = useState('all')
  const [search, setSearch]         = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await fetchJson('/api/users', { headers: authHeader() })
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('❌ Failed to fetch users:', err)
      setError(t('admin.users.messages.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { loadUsers() }, [loadUsers])

  // Auto-dismiss success message
  useEffect(() => {
    if (!successMsg) return
    const id = setTimeout(() => setSuccessMsg(''), 4000)
    return () => clearTimeout(id)
  }, [successMsg])

  // ── Filters & search ──────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let list = filter === 'all' ? users : users.filter(u => u.role === filter)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(u =>
        (u.fullName  || '').toLowerCase().includes(q) ||
        (u.email     || '').toLowerCase().includes(q) ||
        (u.phone     || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [users, filter, search])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     users.length,
    owners:    users.filter(u => u.role === 'owner').length,
    investors: users.filter(u => u.role === 'investor').length,
    admins:    users.filter(u => u.role === 'admin').length,
  }), [users])

  // ── Callback from drawer ──────────────────────────────────────────────────
  const handleUserUpdated = useCallback((updated) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u))
    setSelectedUser(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
    setSuccessMsg(t('admin.users.messages.success'))
  }, [t])

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 className="animate-spin text-brand-accent" size={28} />
        <span className="text-gray-500 text-sm">{t('admin.users.loading')}</span>
      </div>
    )
  }

  if (error && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="text-red-400" size={32} />
        <p className="text-red-600 text-sm font-medium">{error}</p>
        <button onClick={loadUsers} className="text-sm text-brand-accent hover:underline font-medium flex items-center gap-1">
          <RefreshCw size={14} /> {t('admin.users.errorTryAgain')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── Page header ── */}
      <div className="bg-brand-primary text-white rounded-2xl p-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Users size={24} className="text-brand-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('admin.users.headerTitle')}</h1>
              <p className="text-white/70 text-sm mt-0.5">{t('admin.users.headerSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={loadUsers}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}     value={stats.total}     label={t('admin.users.stats.totalUsers')} colorClass="text-indigo-700"  bgClass="bg-indigo-50 border-indigo-100" />
        <StatCard icon={Shield}    value={stats.owners}    label={t('admin.users.stats.owners')}     colorClass="text-amber-700"   bgClass="bg-amber-50 border-amber-100"   />
        <StatCard icon={User}      value={stats.investors} label={t('admin.users.stats.investors')}  colorClass="text-teal-700"    bgClass="bg-teal-50 border-teal-100"     />
        <StatCard icon={Edit2}     value={stats.admins}    label={t('admin.users.stats.admins')}     colorClass="text-purple-700"  bgClass="bg-purple-50 border-purple-100" />
      </div>

      {/* ── Success toast ── */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-700 text-sm font-medium">
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      {/* ── Filter tabs + search ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'owner', 'investor', 'admin', 'regulator'].map(role => (
            <button
              key={role}
              onClick={() => setFilter(role)}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold border transition-colors capitalize ${
                filter === role
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-primary hover:text-brand-primary'
              }`}
            >
              {t(`admin.users.filters.${role}`, { defaultValue: role })}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRtl ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or phone…"
            className={`w-full bg-white border border-gray-200 rounded-xl py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
          />
        </div>
      </div>

      {/* ── Users table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {filteredUsers.length === 0 ? (
          <EmptyState message={search ? `No users matching "${search}"` : 'No users found'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className={`px-5 py-3.5 ${isRtl ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-500 uppercase tracking-wide`}>{t('admin.users.table.name')}</th>
                  <th className={`px-5 py-3.5 ${isRtl ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-500 uppercase tracking-wide`}>{t('admin.users.table.role')}</th>
                  <th className={`px-5 py-3.5 ${isRtl ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell`}>KYC</th>
                  <th className={`px-5 py-3.5 ${isRtl ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell`}>{t('admin.users.table.registered')}</th>
                  <th className={`px-5 py-3.5 ${isRtl ? 'text-left' : 'text-right'} text-xs font-semibold text-gray-500 uppercase tracking-wide`}>{t('admin.users.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    {/* Name + email */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-brand-primary">
                            {(user.fullName || user.email || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{user.fullName || '—'}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-3.5">
                      <RoleBadge role={user.role} label={t(`admin.users.role.${user.role}`, { defaultValue: user.role })} />
                    </td>

                    {/* KYC dots */}
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <VerifDots user={user} />
                        <span className="text-xs text-gray-400">E·P·K</span>
                      </div>
                    </td>

                    {/* Joined */}
                    <td className="px-5 py-3.5 text-xs text-gray-500 hidden lg:table-cell whitespace-nowrap">
                      {user.joinedDate ?? '—'}
                    </td>

                    {/* Action button */}
                    <td className="px-5 py-3.5">
                      <div className={`flex items-center gap-2 ${isRtl ? 'justify-start' : 'justify-end'}`}>
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedUser(user) }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition-colors"
                        >
                          <UserCog size={13} /> Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Row count footer */}
        {filteredUsers.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </div>
        )}
      </div>

      {/* ── User Management Drawer ── */}
      {selectedUser && (
        <UserManagementDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </div>
  )
}

