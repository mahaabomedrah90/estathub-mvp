import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, CheckCircle, AlertCircle, Loader2,
  Mail, Phone, ShieldCheck, UserCog, Key,
  ChevronDown, BadgeCheck, User
} from 'lucide-react'
import { authHeader, fetchJson } from '../../lib/api'

// ─── Brand constants ─────────────────────────────────────────────────────────
const C = { primary: '#1F1F4B', soft: '#2A2A66', accent: '#48D1C5' }

// ─── Role display maps ────────────────────────────────────────────────────────
const ROLE_LABELS = {
  investor:  'Investor',
  owner:     'Owner',
  admin:     'Admin',
  regulator: 'Regulator',
}

const ROLE_COLORS = {
  investor:  'bg-teal-100   text-teal-800   border-teal-200',
  owner:     'bg-amber-100  text-amber-800  border-amber-200',
  admin:     'bg-purple-100 text-purple-800 border-purple-200',
  regulator: 'bg-blue-100   text-blue-800   border-blue-200',
}

const STATUS_LABELS = {
  ACTIVE:    'Active',
  INACTIVE:  'Inactive',
  SUSPENDED: 'Suspended',
}

const STATUS_COLORS = {
  ACTIVE:    'bg-emerald-100 text-emerald-800 border-emerald-200',
  INACTIVE:  'bg-gray-100   text-gray-600   border-gray-200',
  SUSPENDED: 'bg-red-100    text-red-800    border-red-200',
}

// ─── Toast hook ───────────────────────────────────────────────────────────────
function useToasts() {
  const [toasts, setToasts] = useState([])
  const add = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])
  return { toasts, addToast: add }
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, onConfirm, onCancel, loading, confirmLabel, confirmClass }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <h3 className="text-base font-bold mb-2 text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors text-sm disabled:opacity-50">
            إلغاء
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${confirmClass || 'bg-brand-primary hover:bg-brand-primary-soft'}`}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel || 'تأكيد'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function Tab({ id, label, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors rounded-t-xl ${
        active
          ? 'bg-gray-50 text-brand-primary'
          : 'text-white/60 hover:text-white hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  )
}

// ─── Detail row ───────────────────────────────────────────────────────────────
function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <span className={`text-sm font-semibold text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '—'}
      </span>
    </div>
  )
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-teal-500' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
        checked ? 'translate-x-5' : 'translate-x-0.5'
      }`} />
    </button>
  )
}

// ─── Save button ──────────────────────────────────────────────────────────────
function SaveButton({ onClick, loading, label = 'حفظ', disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ background: `linear-gradient(to left, ${C.primary}, ${C.soft})` }}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {label}
    </button>
  )
}

// ─── Tabs definition ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'general',      label: 'المعلومات العامة' },
  { id: 'verification', label: 'التحقق'           },
  { id: 'permissions',  label: 'الصلاحيات'        },
  { id: 'account',      label: 'الحساب'           },
]

// ─── Main component ───────────────────────────────────────────────────────────
export default function UserManagementDrawer({ user: initialUser, onClose, onUserUpdated }) {
  const [user, setUser]           = useState(initialUser)
  const [visible, setVisible]     = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const { toasts, addToast }      = useToasts()
  const [confirm, setConfirm]     = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Verification tab state
  const [emailV, setEmailV]   = useState(!!user.emailVerified)
  const [phoneV, setPhoneV]   = useState(!!user.phoneVerified)
  const [kycV,   setKycV]     = useState(!!user.kycVerified)
  const [savingVerif, setSavingVerif] = useState(false)

  // Permissions tab state
  const [selectedRole, setSelectedRole] = useState(user.role || 'investor')
  const [savingRole, setSavingRole]     = useState(false)

  // Account tab state
  const [selectedStatus, setSelectedStatus] = useState(user.accountStatus || 'ACTIVE')
  const [savingStatus, setSavingStatus]     = useState(false)

  // Password reset
  const [sendingReset, setSendingReset] = useState(false)

  const initialized = useRef(false)

  // Sync local state when user prop changes
  useEffect(() => {
    if (!initialized.current) { initialized.current = true; return }
    setEmailV(!!user.emailVerified)
    setPhoneV(!!user.phoneVerified)
    setKycV(!!user.kycVerified)
    setSelectedRole(user.role || 'investor')
    setSelectedStatus(user.accountStatus || 'ACTIVE')
  }, [user])

  // Slide-in animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Escape key
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const patch = useCallback(async (path, body) =>
    fetchJson(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(body),
    }), [])

  const updateLocal = useCallback((fields) => {
    setUser(prev => {
      const next = { ...prev, ...fields }
      onUserUpdated?.(next)
      return next
    })
  }, [onUserUpdated])

  // ── Save verification ──────────────────────────────────────────────────────
  const handleSaveVerif = async () => {
    setSavingVerif(true)
    try {
      await patch(`/api/users/${user.id}/verification`, {
        emailVerified: emailV,
        phoneVerified: phoneV,
        kycVerified:   kycV,
      })
      updateLocal({ emailVerified: emailV, phoneVerified: phoneV, kycVerified: kycV })
      addToast('تم حفظ حالة التحقق', 'success')
    } catch {
      addToast('فشل حفظ التحقق', 'error')
    } finally {
      setSavingVerif(false)
    }
  }

  // ── Save role ──────────────────────────────────────────────────────────────
  const handleSaveRole = () => {
    if (selectedRole === user.role) return
    setConfirm({
      title: 'تغيير الصلاحية',
      message: `هل تريد تغيير صلاحية ${user.fullName || user.email} من "${ROLE_LABELS[user.role] || user.role}" إلى "${ROLE_LABELS[selectedRole] || selectedRole}"؟`,
      confirmLabel: 'حفظ الصلاحية',
      onConfirm: doSaveRole,
    })
  }

  const doSaveRole = async () => {
    setSavingRole(true); setConfirmLoading(true)
    try {
      await patch(`/api/users/${user.id}/role`, { role: selectedRole.toUpperCase() })
      updateLocal({ role: selectedRole })
      addToast('تم تحديث الصلاحية', 'success')
      setConfirm(null)
    } catch {
      addToast('فشل تحديث الصلاحية', 'error')
    } finally {
      setSavingRole(false); setConfirmLoading(false)
    }
  }

  // ── Save status ────────────────────────────────────────────────────────────
  const handleSaveStatus = () => {
    if (selectedStatus === user.accountStatus) return
    const label = selectedStatus === 'ACTIVE' ? 'نشط' : selectedStatus === 'INACTIVE' ? 'غير نشط' : 'موقوف'
    setConfirm({
      title: 'تغيير حالة الحساب',
      message: `هل تريد تغيير حالة ${user.fullName || user.email} إلى "${label}"؟`,
      confirmLabel: 'حفظ الحالة',
      confirmClass: selectedStatus === 'SUSPENDED' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-primary hover:bg-brand-primary-soft',
      onConfirm: doSaveStatus,
    })
  }

  const doSaveStatus = async () => {
    setSavingStatus(true); setConfirmLoading(true)
    try {
      await patch(`/api/users/${user.id}/status`, { status: selectedStatus })
      updateLocal({ accountStatus: selectedStatus })
      addToast('تم تحديث حالة الحساب', 'success')
      setConfirm(null)
    } catch {
      addToast('فشل تحديث الحالة', 'error')
    } finally {
      setSavingStatus(false); setConfirmLoading(false)
    }
  }

  // ── Quick: toggle single verification field ────────────────────────────────
  const quickToggleVerif = useCallback(async (field, label) => {
    const current = user[field]
    const next = !current
    try {
      await patch(`/api/users/${user.id}/verification`, { [field]: next })
      updateLocal({ [field]: next })
      if (field === 'emailVerified') setEmailV(next)
      if (field === 'phoneVerified') setPhoneV(next)
      if (field === 'kycVerified')   setKycV(next)
      addToast(`${next ? 'تم توثيق' : 'تم إلغاء توثيق'} ${label}`, 'success')
    } catch {
      addToast(`فشل تحديث ${label}`, 'error')
    }
  }, [user, patch, updateLocal, addToast])

  // ── Password reset ─────────────────────────────────────────────────────────
  const handleSendReset = async () => {
    setSendingReset(true)
    try {
      await fetchJson('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      })
      addToast('تم إرسال رابط إعادة التعيين', 'success')
    } catch {
      addToast('فشل إرسال الرابط', 'error')
    } finally {
      setSendingReset(false)
    }
  }

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer — RTL, slides from right */}
      <div
        dir="rtl"
        className={`fixed top-0 bottom-0 right-0 z-[110] w-full md:w-[600px] bg-gray-50 shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ borderRight: '1px solid #e5e7eb' }}
      >
        {/* Toast stack */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 260 }}>
          {toasts.map(t => (
            <div key={t.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold text-white ${
              t.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
            }`}>
              {t.type === 'success' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
              {t.msg}
            </div>
          ))}
        </div>

        {/* ── Header ── */}
        <div className="shrink-0" style={{ background: `linear-gradient(225deg, ${C.primary} 0%, ${C.soft} 100%)` }}>

          {/* User info row */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {/* Avatar */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0"
                style={{ background: 'rgba(72,209,197,0.22)', border: '2px solid rgba(72,209,197,0.35)' }}
              >
                {(user.fullName || user.email || '؟').charAt(0)}
              </div>
              <div className="min-w-0">
                <h2 className="text-white font-black text-lg leading-tight truncate">
                  {user.fullName || '—'}
                </h2>
                <p className="text-white/55 text-xs mt-0.5 font-mono truncate" dir="ltr">{user.email}</p>
                <div className="flex items-center flex-wrap gap-2 mt-2">
                  {/* Role badge */}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                  {/* Account status badge */}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${STATUS_COLORS[user.accountStatus] || STATUS_COLORS.ACTIVE}`}>
                    {STATUS_LABELS[user.accountStatus] || 'Active'}
                  </span>
                  {/* Verification dots */}
                  {user.emailVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 bg-emerald-900/30 border border-emerald-700/30 px-2 py-0.5 rounded-full">
                      <BadgeCheck size={10} /> بريد
                    </span>
                  )}
                  {user.kycVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-300 bg-teal-900/30 border border-teal-700/30 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={10} /> هوية
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

          {/* Quick actions */}
          <div className="px-6 pb-4 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('permissions')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold whitespace-nowrap transition-colors"
            >
              <UserCog size={12} /> تغيير الصلاحية
            </button>
            <button
              onClick={() => quickToggleVerif('emailVerified', 'البريد')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${
                user.emailVerified
                  ? 'bg-emerald-900/35 border-emerald-700/35 text-emerald-300 hover:bg-emerald-900/55'
                  : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Mail size={12} /> {user.emailVerified ? '✓ بريد' : 'توثيق البريد'}
            </button>
            <button
              onClick={() => quickToggleVerif('phoneVerified', 'الجوال')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${
                user.phoneVerified
                  ? 'bg-emerald-900/35 border-emerald-700/35 text-emerald-300 hover:bg-emerald-900/55'
                  : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Phone size={12} /> {user.phoneVerified ? '✓ جوال' : 'توثيق الجوال'}
            </button>
            <button
              onClick={() => quickToggleVerif('kycVerified', 'الهوية')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${
                user.kycVerified
                  ? 'bg-teal-900/35 border-teal-700/35 text-teal-300 hover:bg-teal-900/55'
                  : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
              }`}
            >
              <ShieldCheck size={12} /> {user.kycVerified ? '✓ هوية' : 'اعتماد الهوية'}
            </button>
            <button
              onClick={handleSendReset}
              disabled={sendingReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/20 text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-50"
            >
              {sendingReset ? <Loader2 size={12} className="animate-spin" /> : <Key size={12} />}
              إعادة تعيين كلمة المرور
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 px-4 overflow-x-auto">
            {TABS.map(tab => (
              <Tab key={tab.id} id={tab.id} label={tab.label} active={activeTab === tab.id} onClick={setActiveTab} />
            ))}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ═══ TAB: المعلومات العامة ═══ */}
          {activeTab === 'general' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
                <User size={14} className="text-gray-400" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-wider">المعلومات العامة</span>
              </div>
              <div className="px-5 py-2">
                <DetailRow label="الاسم الكامل"         value={user.fullName} />
                <DetailRow label="البريد الإلكتروني"    value={user.email} mono />
                <DetailRow label="رقم الجوال"           value={user.phone} mono />
                <DetailRow label="رقم الهوية"           value={user.nationalId} mono />
                <DetailRow label="تاريخ التسجيل"        value={fmtDate(user.joinedDate)} />
                <DetailRow label="آخر تسجيل دخول"       value="غير متاح حالياً" />
              </div>
            </div>
          )}

          {/* ═══ TAB: التحقق ═══ */}
          {activeTab === 'verification' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
                  <ShieldCheck size={14} className="text-gray-400" />
                  <span className="text-xs font-black text-gray-500 uppercase tracking-wider">التحقق والتوثيق</span>
                </div>
                <div className="px-5 py-3 space-y-1">
                  {/* Email */}
                  <div className="flex items-center justify-between py-3.5 border-b border-gray-50">
                    <div>
                      <p className="text-sm font-bold text-gray-800">البريد الإلكتروني موثق</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono" dir="ltr">{user.email}</p>
                    </div>
                    <Toggle checked={emailV} onChange={setEmailV} />
                  </div>
                  {/* Phone */}
                  <div className="flex items-center justify-between py-3.5 border-b border-gray-50">
                    <div>
                      <p className="text-sm font-bold text-gray-800">رقم الجوال موثق</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono" dir="ltr">{user.phone || '—'}</p>
                    </div>
                    <Toggle checked={phoneV} onChange={setPhoneV} />
                  </div>
                  {/* KYC */}
                  <div className="flex items-center justify-between py-3.5">
                    <div>
                      <p className="text-sm font-bold text-gray-800">الهوية الوطنية معتمدة</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono" dir="ltr">{user.nationalId || '—'}</p>
                    </div>
                    <Toggle checked={kycV} onChange={setKycV} />
                  </div>
                </div>
              </div>

              <SaveButton
                onClick={handleSaveVerif}
                loading={savingVerif}
                label="حفظ التحقق"
              />
            </div>
          )}

          {/* ═══ TAB: الصلاحيات ═══ */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
                  <UserCog size={14} className="text-gray-400" />
                  <span className="text-xs font-black text-gray-500 uppercase tracking-wider">الصلاحيات</span>
                </div>
                <div className="p-5 space-y-3">
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">الصلاحية الحالية</label>
                  <div className="relative">
                    <select
                      value={selectedRole}
                      onChange={e => setSelectedRole(e.target.value)}
                      className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors pr-10"
                      style={{ color: C.primary }}
                    >
                      <option value="investor">Investor</option>
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="regulator">Regulator</option>
                    </select>
                    <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {selectedRole !== user.role && (
                    <p className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                      <AlertCircle size={11} />
                      يجب على المستخدم تسجيل الخروج وإعادة الدخول لتفعيل الصلاحية الجديدة.
                    </p>
                  )}
                </div>
              </div>

              <SaveButton
                onClick={handleSaveRole}
                loading={savingRole}
                label="حفظ الصلاحية"
                disabled={selectedRole === user.role}
              />
            </div>
          )}

          {/* ═══ TAB: الحساب ═══ */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
                  <ShieldCheck size={14} className="text-gray-400" />
                  <span className="text-xs font-black text-gray-500 uppercase tracking-wider">حالة الحساب</span>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-500">الحالة الحالية</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[user.accountStatus] || STATUS_COLORS.ACTIVE}`}>
                      {STATUS_LABELS[user.accountStatus] || 'Active'}
                    </span>
                  </div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">تغيير الحالة</label>
                  <div className="relative">
                    <select
                      value={selectedStatus}
                      onChange={e => setSelectedStatus(e.target.value)}
                      className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors pr-10"
                      style={{ color: C.primary }}
                    >
                      <option value="ACTIVE">نشط  (Active)</option>
                      <option value="INACTIVE">غير نشط  (Inactive)</option>
                      <option value="SUSPENDED">موقوف  (Suspended)</option>
                    </select>
                    <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>

                  {selectedStatus === 'INACTIVE' && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
                      <AlertCircle size={14} className="text-gray-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-600 leading-relaxed">
                        المستخدم <strong>غير النشط</strong> لن يتمكن من تسجيل الدخول إلى المنصة.
                      </p>
                    </div>
                  )}
                  {selectedStatus === 'SUSPENDED' && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                      <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700 leading-relaxed">
                        الحساب <strong>الموقوف</strong> لن يتمكن من الاستثمار أو السحب.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <SaveButton
                onClick={handleSaveStatus}
                loading={savingStatus}
                label="حفظ الحالة"
                disabled={selectedStatus === user.accountStatus}
              />
            </div>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
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
