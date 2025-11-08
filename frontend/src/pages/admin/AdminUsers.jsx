import React, { useState } from 'react'
import { Users, Edit2, Ban, CheckCircle, Mail, Phone, Shield, User } from 'lucide-react'

export default function AdminUsers() {
  const [users, setUsers] = useState([
    {
      id: 1,
      name: 'Mohammed Al-Saud',
      email: 'mohammed@example.com',
      phone: '+966 50 123 4567',
      role: 'owner',
      status: 'Active',
      joinedDate: '2024-11-15',
      properties: 3
    },
    {
      id: 2,
      name: 'Sara Al-Rashid',
      email: 'sara@example.com',
      phone: '+966 55 234 5678',
      role: 'owner',
      status: 'Active',
      joinedDate: '2024-12-01',
      properties: 2
    },
    {
      id: 3,
      name: 'Ahmed Al-Otaibi',
      email: 'ahmed@example.com',
      phone: '+966 50 345 6789',
      role: 'investor',
      status: 'Active',
      joinedDate: '2024-10-20',
      investments: 5
    },
    {
      id: 4,
      name: 'Fatima Al-Harbi',
      email: 'fatima@example.com',
      phone: '+966 55 456 7890',
      role: 'investor',
      status: 'Active',
      joinedDate: '2024-11-05',
      investments: 8
    },
    {
      id: 5,
      name: 'Khalid Al-Mutairi',
      email: 'khalid@example.com',
      phone: '+966 50 567 8901',
      role: 'investor',
      status: 'Suspended',
      joinedDate: '2024-09-10',
      investments: 2
    },
  ])

  const [filter, setFilter] = useState('All')
  const [selectedUser, setSelectedUser] = useState(null)

  const handleStatusToggle = (id) => {
    setUsers(users.map(u => 
      u.id === id 
        ? { ...u, status: u.status === 'Active' ? 'Suspended' : 'Active' }
        : u
    ))
  }

  const handleRoleChange = (id, newRole) => {
    setUsers(users.map(u => 
      u.id === id ? { ...u, role: newRole } : u
    ))
    setSelectedUser(null)
    alert(`User role updated to ${newRole}`)
  }

  const filteredUsers = filter === 'All' 
    ? users 
    : users.filter(u => u.role === filter.toLowerCase())

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage platform users and their roles</p>
        </div>
        <div className="flex gap-2">
          {['All', 'Owner', 'Investor', 'Admin'].map((role) => (
            <button
              key={role}
              onClick={() => setFilter(role)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === role
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {role}
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
              <p className="text-sm text-gray-600">Total Users</p>
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
              <p className="text-sm text-gray-600">Owners</p>
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
              <p className="text-sm text-gray-600">Investors</p>
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
              <p className="text-sm text-gray-600">Active</p>
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
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
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
                      {user.status}
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
                        title="Edit Role"
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
                        title={user.status === 'Active' ? 'Suspend' : 'Activate'}
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

      {/* Edit Role Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Change User Role</h2>
            <p className="text-gray-600 mb-6">
              Select a new role for <span className="font-semibold">{selectedUser.name}</span>
            </p>
            <div className="space-y-3">
              {['investor', 'owner', 'admin'].map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(selectedUser.id, role)}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    selectedUser.role === role
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold capitalize">{role}</span>
                    {selectedUser.role === role && (
                      <CheckCircle className="text-blue-600" size={20} />
                    )}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedUser(null)}
              className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}