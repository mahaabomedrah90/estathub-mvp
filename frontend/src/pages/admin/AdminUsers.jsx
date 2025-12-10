import React, { useState, useEffect } from 'react'
import { Users, Edit2, Ban, CheckCircle, Mail, Phone, Shield, User, Loader2 } from 'lucide-react'
import { authHeader, fetchJson } from '../../lib/api'
import { useTranslation } from 'react-i18next';


export default function AdminUsers() {
  const { t } = useTranslation('pages');
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
     setSuccessMessage(
  t('admin.users.messages.roleUpdateSuccess', {
    role: newRole.toUpperCase(),
    name: updatedUser.name,
  })
)
      setTimeout(() => setSuccessMessage(''), 8000) // Auto-hide after 8 seconds
    } catch (err) {
      console.error('❌ Failed to update user role:', err)
      setError(t('admin.users.messages.roleUpdateFailed'));
      setTimeout(() => setError(''), 5000);
    }
  }

  const filteredUsers = filter === 'all'
  ? users
  : users.filter(u => u.role === filter)

  const getRoleBadge = (role) => {
    const styles = {
      owner: 'bg-amber-100 text-amber-700',
      investor: 'bg-emerald-100 text-emerald-700',
      admin: 'bg-blue-100 text-blue-700'
    }
    return styles[role] || 'bg-gray-100 text-gray-700'
  }

  const getStatusBadge = (status) => {
    return status === 'Active' 
      ? 'bg-green-100 text-green-700' 
      : 'bg-red-100 text-red-700'
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
      <div className="flex items-center justify-between">
        <div>
         <h1 className="text-2xl font-bold text-gray-900">
  {t('admin.users.headerTitle')}
</h1>
<p className="text-gray-600 mt-1">
  {t('admin.users.headerSubtitle')}
</p>
        </div>
        <div className="flex gap-2">
         {['all', 'owner', 'investor', 'admin'].map((role) => (
  <button
    key={role}
    onClick={() => setFilter(role)}
    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
      filter === role
        ? 'bg-blue-600 text-white'
        : 'bg-white text-gray-700 hover:bg-gray-100'
    }`}
  >
    {t(`admin.users.filters.${role}`)}
  </button>
))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
             <p className="text-sm text-gray-600">
  {t('admin.users.stats.totalUsers')}
</p>

              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
              <Shield className="text-amber-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">
  {t('admin.users.stats.owners')}
</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'owner').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
              <User className="text-emerald-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">
  {t('admin.users.stats.investors')}
</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'investor').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>   
              <p className="text-sm text-gray-600">
  {t('admin.users.stats.active')}
</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.status === 'Active').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin.users.table.user')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin.users.table.contact')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin.users.table.role')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin.users.table.status')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin.users.table.joined')}
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin.users.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">
                          {user.role === 'owner' && `${user.properties} properties`}
                          {user.role === 'investor' && `${user.investments} investments`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={14} />
                        {user.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone size={14} />
                        {user.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(user.status)}`}>
                     {user.status === 'Active'
    ? t('admin.users.status.active')
    : t('admin.users.status.suspended')}
</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{user.joinedDate}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                        title={t('admin.users.actions.edit')}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleStatusToggle(user.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.status === 'Active'
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                        title={
  user.status === 'Active'
    ? t('admin.users.actions.suspend')
    : t('admin.users.actions.activate')
}
                      > 
                        {user.status === 'Active' ? <Ban size={16} /> : <CheckCircle size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
          <div className="bg-green-50 border-2 border-green-500 rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">{t('admin.users.messages.success')}</p>
              </div>
              <button
                onClick={() => setSuccessMessage('')}
                className="text-green-600 hover:text-green-700"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {selectedUser && !confirmRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
  {t('admin.users.actions.changeRole')}
</h2>
<p className="text-gray-600 mb-6">
  {t('admin.users.texts.selectNewRole', { name: selectedUser.name })}
</p>
            <div className="space-y-3">
              {['investor', 'owner', 'admin'].map((role) => (
                <button
                  key={role}
                  onClick={() => setConfirmRole(role)}
                  disabled={selectedUser.role === role}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    selectedUser.role === role
                      ? 'border-gray-300 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold capitalize">
  {t(`admin.users.role.${role}`)}
</span>
{selectedUser.role === role && (
  <span className="text-xs text-gray-500">
    {t('admin.users.texts.currentRole')}
  </span>
)}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedUser(null)}
              className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
                  {t('admin.users.actions.cancel')}

            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmRole && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="text-amber-600" size={24} />
            </div>
             <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
  {t('admin.users.actions.confirmRole')}
</h2>
<p className="text-gray-600 mb-6 text-center">
  {t('admin.users.messages.roleChangeConfirm', {
    name: selectedUser.name,
    from: selectedUser.role,
    to: confirmRole,
  })}
</p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
  <strong>⚠️ {t('admin.users.texts.important')}</strong>{' '}
  {t('admin.users.texts.roleChangeLoginNote')}
</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConfirmRole(null)
                  setSelectedUser(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                {t('admin.users.actions.cancel')}
              </button>
              <button
                onClick={() => handleRoleChange(selectedUser.id, confirmRole)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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