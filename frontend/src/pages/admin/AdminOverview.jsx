import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Building2, Users, CheckCircle, Clock, TrendingUp, 
  DollarSign, AlertCircle, BarChart3, Loader2, Eye, X, Shield
} from 'lucide-react'
import { authHeader, fetchJson, getToken } from '../../lib/api'

export default function AdminOverview() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [notification, setNotification] = useState(null)
  const [properties, setProperties] = useState([])
  const [pendingProperties, setPendingProperties] = useState([])
  const [stats, setStats] = useState({
    totalProperties: 0,
    approvedProperties: 0,
    pendingProperties: 0,
    rejectedProperties: 0,
    activeInvestors: 0,
    totalInvestmentVolume: 0,
    monthlyGrowth: 0
  })

  useEffect(() => {
    loadAdminData()
  }, [])

  async function loadAdminData() {
    try {
      setLoading(true)
      setError('')
      
      if (!getToken()) {
        setError('Please login to view admin dashboard')
        setLoading(false)
        return
      }

      // Fetch all properties
      const propertiesData = await fetchJson('/api/properties', { 
        headers: { ...authHeader() } 
      })
      
      const propertiesList = Array.isArray(propertiesData) ? propertiesData : []
      setProperties(propertiesList)

      // Filter pending properties
      const pending = propertiesList.filter(p => p.status === 'PENDING')
      setPendingProperties(pending)

      // Calculate stats
      const approved = propertiesList.filter(p => p.status === 'APPROVED')
      const rejected = propertiesList.filter(p => p.status === 'REJECTED')
      
      const totalVolume = approved.reduce((sum, p) => {
        const raised = (p.totalTokens - (p.remainingTokens || p.tokensAvailable || 0)) * (p.tokenPrice || 0)
        return sum + raised
      }, 0)

      setStats({
        totalProperties: propertiesList.length,
        approvedProperties: approved.length,
        pendingProperties: pending.length,
        rejectedProperties: rejected.length,
        activeInvestors: 0, // This would come from a separate endpoint
        totalInvestmentVolume: totalVolume,
        monthlyGrowth: 23.5 // Mock data - would come from analytics endpoint
      })
    } catch (err) {
      console.error('Admin dashboard load error:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  async function handlePropertyAction(propertyId, action) {
    try {
      setActionLoading(propertyId)
      setError('')
      
      const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'
      
      await fetchJson(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ status: newStatus })
      })

      // Show success notification
      setNotification({
        type: 'success',
        message: `Property ${action === 'approve' ? 'approved' : 'rejected'} successfully!`
      })

      // Reload data
      await loadAdminData()

      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } catch (err) {
      setError(err.message || `Failed to ${action} property`)
    } finally {
      setActionLoading(null)
    }
  }

  const statCards = [
    {
      title: 'Total Properties',
      value: stats.totalProperties,
      icon: Building2,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      change: '+12%'
    },
    {
      title: 'Approved Properties',
      value: stats.approvedProperties,
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      change: '+8%'
    },
    {
      title: 'Pending Review',
      value: stats.pendingProperties,
      icon: Clock,
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      change: '-2'
    },
    {
      title: 'Active Investors',
      value: stats.activeInvestors,
      icon: Users,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      change: '+15%'
    },
    {
      title: 'Investment Volume',
      value: `SAR ${(stats.totalInvestmentVolume / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      change: '+23.5%'
    },
    {
      title: 'Monthly Growth',
      value: `${stats.monthlyGrowth}%`,
      icon: TrendingUp,
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      change: '+5.2%'
    },
  ]

  if (!getToken()) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Shield className="mx-auto text-gray-400" size={64} />
          <div className="text-gray-600">Please login as admin to view this dashboard.</div>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            Login Now
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-blue-600 mx-auto" size={40} />
          <div className="text-gray-600">Loading admin dashboard...</div>
        </div>
      </div>
    )
  }

  if (error && !notification) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
        <AlertCircle className="text-red-600" size={20} />
        <span className="text-red-700">{error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-gray-600">Monitor performance, review property submissions, and manage users</p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`rounded-lg p-4 flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <CheckCircle className={notification.type === 'success' ? 'text-green-600' : 'text-red-600'} size={20} />
          <span className={notification.type === 'success' ? 'text-green-700' : 'text-red-700'}>{notification.message}</span>
        </div>
      )}
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</h3>
                  <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-xl`}>
                  <Icon className={stat.iconColor} size={24} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pending Properties Table */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pending Property Approvals</h2>
            <p className="text-sm text-gray-600 mt-1">{pendingProperties.length} properties awaiting review</p>
          </div>
          <button 
            onClick={() => navigate('/admin/opportunities')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All →
          </button>
        </div>
        
        {pendingProperties.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <CheckCircle className="mx-auto text-gray-400 mb-2" size={48} />
            <div className="text-gray-600">No pending properties to review</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Property Title</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Owner</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Submitted</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Value</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingProperties.map((property) => (
                  <tr key={property.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-lg flex items-center justify-center">
                          <Building2 className="text-white" size={20} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{property.name || property.title}</div>
                          <div className="text-xs text-gray-500">{property.location || 'Riyadh, SA'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {property.ownerName || 'Property Owner'}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {new Date(property.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">
                      {((property.totalTokens || 0) * (property.tokenPrice || 0)).toLocaleString()} SAR
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                        <Clock size={12} className="mr-1" />
                        Pending
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/properties/${property.id}`)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handlePropertyAction(property.id, 'approve')}
                          disabled={actionLoading === property.id}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                        >
                          {actionLoading === property.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => handlePropertyAction(property.id, 'reject')}
                          disabled={actionLoading === property.id}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                        >
                          <X size={14} />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Platform Activity</h2>
        </div>
        <div className="space-y-3">
          {properties.slice(0, 5).map((property) => {
            const isApproved = property.status === 'APPROVED'
            const isPending = property.status === 'PENDING'
            const isRejected = property.status === 'REJECTED'
            
            return (
              <div
                key={property.id}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isApproved ? 'bg-green-100' : isPending ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  {isApproved && <CheckCircle className="text-green-600" size={20} />}
                  {isPending && <Clock className="text-yellow-600" size={20} />}
                  {isRejected && <AlertCircle className="text-red-600" size={20} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {isApproved && <span className="text-green-600">Approved: </span>}
                    {isPending && <span className="text-yellow-600">Submitted: </span>}
                    {isRejected && <span className="text-red-600">Rejected: </span>}
                    {property.name || property.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(property.createdAt).toLocaleDateString()} • {((property.totalTokens || 0) * (property.tokenPrice || 0)).toLocaleString()} SAR
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}