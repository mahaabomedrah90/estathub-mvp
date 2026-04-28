import React, { useState, useEffect } from 'react'
import { Users, Edit2, Ban, CheckCircle, Mail, Phone, Shield, User, Loader2, TrendingUp } from 'lucide-react'
import { authHeader, fetchJson } from '../../lib/api'
import { useTranslation } from 'react-i18next'

export default function AdminUsers() {
  const { t, i18n } = useTranslation('pages')
  const isArabic = i18n.language === 'ar'
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [confirmRole, setConfirmRole] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  // Fetch users from database
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true)
        setError('')
        const fetchedUsers = await fetchJson('/api/users', {
          headers: authHeader()
        })
        console.log('👥 Fetched users from database:', fetchedUsers)
        setUsers(fetchedUsers)
      } catch (err) {
        console.error('❌ Failed to fetch users:', err)
        setError(t('admin.users.messages.loadFailed'))
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [])

  const handleStatusToggle = async (id) => {
    try {
      const user = users.find(u => u.id === id)
      const newStatus = user.status === 'Active' ? 'Suspended' : 'Active'
      
      await fetchJson(`/api/users/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ status: newStatus })
      })
      
      setUsers(users.map(u => 
        u.id === id 
          ? { ...u, status: newStatus }
          : u
      ))
      
      console.log(`🔄 Updated user ${id} status to ${newStatus}`)
    } catch (err) {
      console.error('❌ Failed to update user status:', err)
      setError(t('admin.users.messages.statusUpdateFailed'))
    }
  }

  const handleRoleChange = async (id, newRole) => {
    try {
      await fetchJson(`/api/users/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ role: newRole })
      })
      
      const updatedUser = users.find(u => u.id === id)
      setUsers(users.map(u => 
        u.id === id ? { ...u, role: newRole } : u
      ))
      
      setSelectedUser(null)
      setConfirmRole(null)
      console.log(`🔄 Updated user ${id} role to ${newRole}`)
      
      // Show success message with logout reminder
      setSuccessMessage(t('admin.users.messages.roleUpdateSuccess'))
      setConfirmRole(null)
    } catch (err) {
      console.error('❌ Failed to update user role:', err)
      setError(t('admin.users.messages.roleUpdateFailed'));
      setTimeout(() => setError(''), 5000);
    }
  }

  const filteredUsers = filter === 'all'
  ? users
  : users.filter(p => p.role === filter)

  const getRoleBadge = (role) => {
    const styles = {
      owner: 'bg-[#CDB9A1]/20 text-[#1E1958] border border-[#CDB9A1]/40',
      investor: 'bg-[#41EAD4]/20 text-[#1E1958] border border-[#41EAD4]/40',
      admin: 'bg-[#986F9A]/20 text-[#1E1958] border border-[#986F9A]/40'
    }
    return styles[role] || 'bg-gray-100 text-gray-700'
  }

  const getStatusBadge = (status) => {
    return status === 'Active' 
      ? 'bg-[#41EAD4]/10 text-[#41EAD4] border border-[#41EAD4]/30' 
      : 'bg-[#ED9072]/10 text-[#ED9072] border border-[#ED9072]/30'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={24} />
          <span className="text-gray-600">
            {t('admin.users.loading')}
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-600 mb-2">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="text-blue-600 hover:text-blue-700 underline"
          >
            {t('admin.users.errorTryAgain')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1E1958]">
          {t('admin.users.headerTitle')}
        </h1>
        <p className="text-gray-600 mt-2">
          {t('admin.users.headerSubtitle')}
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'owner', 'investor', 'admin'].map((role) => (
          <button
            key={role}
            onClick={() => setFilter(role)}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              filter === role
                ? 'bg-gradient-to-r from-[#1E1958] to-[#2a2458] text-white shadow-lg'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-[#41EAD4] hover:text-[#41EAD4]'
            }`}
          >
            {t(`admin.users.filters.${role}`)}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users Card */}
        <div className="bg-gradient-to-br from-[#1E1958] to-[#2a2458] rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Users className="text-white" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded">
              <TrendingUp size={14} />
              <span>{isArabic ? 'إجمالي' : 'Total'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{users.length}</div>
          <div className="text-white/80 text-sm">
            {t('admin.users.stats.totalUsers')}
          </div>
        </div>

        {/* Owners Card */}
        <div className="bg-[#CDB9A1]/30 border border-[#CDB9A1]/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#1E1958]/10 rounded-lg flex items-center justify-center">
              <Shield className="text-[#1E1958]" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-[#1E1958]">
              <Shield size={14} />
              <span>{isArabic ? 'مالك' : 'Owners'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1E1958] mb-1">
            {users.filter(u => u.role === 'owner').length}
          </div>
          <div className="text-sm text-gray-600">
            {t('admin.users.stats.owners')}
          </div>
        </div>

        {/* Investors Card */}
        <div className="bg-[#41EAD4]/10 border border-[#41EAD4]/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#41EAD4]/20 rounded-lg flex items-center justify-center">
              <User className="text-[#41EAD4]" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-[#41EAD4]">
              <User size={14} />
              <span>{isArabic ? 'مستثمر' : 'Investors'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1E1958] mb-1">
            {users.filter(u => u.role === 'investor').length}
          </div>
          <div className="text-sm text-gray-600">
            {t('admin.users.stats.investors')}
          </div>
        </div>

        {/* Admins Card */}
        <div className="bg-[#986F9A]/10 border border-[#986F9A]/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#986F9A]/20 rounded-lg flex items-center justify-center">
              <Edit2 className="text-[#986F9A]" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-[#986F9A]">
              <Edit2 size={14} />
              <span>{isArabic ? 'مشرف' : 'Admins'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1E1958] mb-1">
            {users.filter(u => u.role === 'admin').length}
          </div>
          <div className="text-sm text-gray-600">
            {t('admin.users.stats.admins')}
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
            <CheckCircle className="text-green-600" size={20} />
            <span className="text-green-700">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#1E1958]/5 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1E1958]">
                  {t('admin.users.table.name')}
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1E1958]">
                  {t('admin.users.table.email')}
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1E1958]">
                  {t('admin.users.table.role')}
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1E1958]">
                  {t('admin.users.table.status')}
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1E1958]">
                  {t('admin.users.table.registered')}
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-[#1E1958]">
                  {t('admin.users.table.actions')}
                </th>
              </tr>
            </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {user.fullName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.fullName || user.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleStatusToggle(user.id)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                            user.status === 'Active' 
                              ? 'bg-[#ED9072] hover:bg-[#ED9072]/80 text-white shadow-sm' 
                              : 'bg-[#41EAD4] hover:bg-[#41EAD4]/80 text-white shadow-sm'
                          }`}
                        >
                          {user.status === 'Active' ? (
                            <>
                              <Ban size={14} className="inline mr-1" />
                              {t('admin.users.actions.suspend')}
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} className="inline mr-1" />
                              {t('admin.users.actions.activate')}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setConfirmRole(user.role === 'admin' ? 'owner' : 'admin')
                          }}
                          className="p-2 text-gray-600 hover:text-[#1E1958] hover:bg-[#1E1958]/10 rounded-xl transition-colors"
                          title={t('admin.users.actions.changeRole')}
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {/* Role Change Modal */}
      {selectedUser && confirmRole && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-100">
            <div className="w-16 h-16 bg-[#1E1958]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Edit2 className="text-[#1E1958]" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-[#1E1958] mb-4 text-center">
              {t('admin.users.roleChange.title')}
            </h3>
            <p className="text-gray-600 mb-8 text-center leading-relaxed">
              {t('admin.users.roleChange.message', { 
                currentRole: selectedUser.role, 
                newRole: confirmRole,
                userName: selectedUser.fullName || selectedUser.email 
              })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConfirmRole(null)
                  setSelectedUser(null)
                }}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                {t('admin.users.actions.cancel')}
              </button>
              <button
                onClick={() => handleRoleChange(selectedUser.id, confirmRole)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1E1958] to-[#2a2458] text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
              >
                {t('admin.users.actions.confirm_change')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}