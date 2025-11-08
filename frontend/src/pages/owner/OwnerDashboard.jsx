import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Building2, DollarSign, Users, TrendingUp, 
  Clock, CheckCircle, AlertCircle, Plus, Loader2, Eye, Edit2 
} from 'lucide-react'
import { authHeader, fetchJson, getToken } from '../../lib/api'

export default function OwnerDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [properties, setProperties] = useState([])
  const [stats, setStats] = useState({
    totalProperties: 0,
    approvedProperties: 0,
    pendingProperties: 0,
    rejectedProperties: 0,
    totalRevenue: 0,
    monthlyYield: 0
  })

  useEffect(() => {
    loadOwnerData()
  }, [])

  async function loadOwnerData() {
    try {
      setLoading(true)
      setError('')
      
      if (!getToken()) {
        setError('Please login to view your dashboard')
        setLoading(false)
        return
      }

      // Fetch all properties (owner sees all their properties regardless of status)
      const propertiesData = await fetchJson('/api/properties', { 
        headers: { ...authHeader() } 
      })
      
      const propertiesList = Array.isArray(propertiesData) ? propertiesData : []
      setProperties(propertiesList)

      // Calculate stats
      const approved = propertiesList.filter(p => p.status === 'APPROVED')
      const pending = propertiesList.filter(p => p.status === 'PENDING')
      const rejected = propertiesList.filter(p => p.status === 'REJECTED')
      
      const totalRevenue = approved.reduce((sum, p) => {
        const raised = (p.totalTokens - (p.remainingTokens || p.tokensAvailable || 0)) * (p.tokenPrice || 0)
        return sum + raised
      }, 0)
      
      const avgYield = approved.length > 0 
        ? approved.reduce((sum, p) => sum + (p.monthlyYield || 0), 0) / approved.length 
        : 0

      setStats({
        totalProperties: propertiesList.length,
        approvedProperties: approved.length,
        pendingProperties: pending.length,
        rejectedProperties: rejected.length,
        totalRevenue,
        monthlyYield: avgYield
      })
    } catch (err) {
      console.error('Owner dashboard load error:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      Pending: 'bg-yellow-100 text-yellow-700',
      Approved: 'bg-green-100 text-green-700',
      Rejected: 'bg-red-100 text-red-700'
    }
    return styles[status] || 'bg-gray-100 text-gray-700'
  }

  if (!getToken()) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Building2 className="mx-auto text-gray-400" size={64} />
          <div className="text-gray-600">Please login to view your dashboard.</div>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors"
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
          <Loader2 className="animate-spin text-amber-600 mx-auto" size={40} />
          <div className="text-gray-600">Loading your dashboard...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
        <AlertCircle className="text-red-600" size={20} />
        <span className="text-red-700">{error}</span>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Properties',
      value: stats.totalProperties,
      icon: Building2,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      change: 'All submissions'
    },
    {
      title: 'Approved Properties',
      value: stats.approvedProperties,
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      change: 'Live on platform'
    },
    {
      title: 'Pending Review',
      value: stats.pendingProperties,
      icon: Clock,
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      change: 'Awaiting approval'
    },
    {
      title: 'Total Revenue',
      value: `${(stats.totalRevenue / 1000).toFixed(0)}K SAR`,
      icon: DollarSign,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      change: 'From tokenization'
    },
    {
      title: 'Avg Monthly Yield',
      value: `${stats.monthlyYield.toFixed(1)}%`,
      icon: TrendingUp,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      change: 'Expected returns'
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, Property Owner! 👋</h1>
            <p className="text-amber-100 text-lg">
              Manage your real estate portfolio and track tokenization progress
            </p>
          </div>
          <button
            onClick={() => navigate('/owner/new')}
            className="flex items-center gap-2 px-6 py-3 bg-white text-amber-600 rounded-xl font-semibold hover:bg-amber-50 transition-all hover:scale-105 shadow-lg"
          >
            <Plus size={20} />
            Submit New Property
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</h3>
                  <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`${stat.bgColor} p-4 rounded-xl`}>
                  <Icon className={stat.iconColor} size={28} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Properties Overview */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Your Properties</h2>
          <button
            onClick={() => navigate('/owner/properties')}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            View All →
          </button>
        </div>
        
        {properties.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Building2 className="mx-auto text-gray-400 mb-3" size={48} />
            <div className="text-gray-600 mb-4">No properties submitted yet</div>
            <button
              onClick={() => navigate('/owner/new')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <Plus size={20} />
              Submit Your First Property
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => {
              const status = property.status || 'PENDING'
              const totalTokens = property.totalTokens || 0
              const remainingTokens = property.remainingTokens ?? property.tokensAvailable ?? 0
              const soldTokens = totalTokens - remainingTokens
              const tokenPrice = property.tokenPrice || 0
              const raised = soldTokens * tokenPrice
              const targetAmount = totalTokens * tokenPrice
              const progress = targetAmount > 0 ? (raised / targetAmount) * 100 : 0
              
              return (
                <div
                  key={property.id}
                  className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="text-white" size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{property.name || property.title}</h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold mt-1 ${getStatusBadge(status)}`}>
                          {status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/properties/${property.id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-white text-gray-700 text-sm font-medium transition-colors"
                      >
                        <Eye size={16} />
                        <span>View</span>
                      </button>
                      {status === 'REJECTED' && (
                        <button
                          onClick={() => navigate('/owner/properties')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
                        >
                          <Edit2 size={16} />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {status === 'APPROVED' && (
                    <>
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-600">Raised</p>
                          <p className="text-sm font-semibold text-emerald-600">
                            {raised.toLocaleString()} SAR
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Target</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {targetAmount.toLocaleString()} SAR
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Tokens Sold</p>
                          <p className="text-sm font-semibold text-blue-600">
                            {soldTokens} / {totalTokens}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Yield</p>
                          <p className="text-sm font-semibold text-purple-600">
                            {property.monthlyYield || 0}%
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-orange-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {progress.toFixed(1)}% funded
                      </p>
                    </>
                  )}

                  {status === 'PENDING' && (
                    <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg">
                      <Clock size={16} />
                      <span>Awaiting admin approval - Your property will be reviewed shortly</span>
                    </div>
                  )}

                  {status === 'REJECTED' && (
                    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-lg">
                      <AlertCircle size={16} />
                      <span>Property was rejected - Please review and resubmit with corrections</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}