import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Building2, Edit2, Eye, MapPin, DollarSign, 
  Users, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, Loader2 
} from 'lucide-react'

export default function OwnerProperties() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('All')
  const [properties, setProperties] = useState([]) // Start with empty array
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProperties()
  }, [])

  const loadProperties = async () => {
    setLoading(true)
    try {
      const ownerId = localStorage.getItem('userId') || '1'
      console.log('🔍 Owner Properties - Current User ID:', ownerId)
      
      const response = await fetch(import.meta.env.VITE_API_BASE + '/api/properties')
      const data = await response.json()
      
      console.log('📊 Total properties fetched:', data.length)
      console.log('📊 Sample property ownerIds:', data.slice(0, 3).map(p => ({ id: p.id, name: p.name, ownerId: p.ownerId })))
      
      // Filter properties by ownerId - only show properties owned by this user
      const ownerProperties = data.filter(p => p.ownerId === ownerId)
      
      console.log('✅ Filtered to', ownerProperties.length, 'properties for owner', ownerId)
      
      // Map backend data to frontend format
      const mapped = ownerProperties.map(p => ({
        id: p.id,
        name: p.name,
        location: p.location || 'Riyadh, Saudi Arabia',
        status: p.status === 'APPROVED' ? 'Approved' : p.status === 'REJECTED' ? 'Rejected' : 'Pending',
        targetAmount: p.totalValue,
        raised: 0, // TODO: Calculate from orders
        investors: 0, // TODO: Count from holdings
        yield: p.expectedROI,
        submittedDate: p.submittedDate ? new Date(p.submittedDate).toLocaleDateString() : new Date().toLocaleDateString(),
        approvedDate: p.approvedDate ? new Date(p.approvedDate).toLocaleDateString() : null,
        rejectedDate: p.rejectedDate ? new Date(p.rejectedDate).toLocaleDateString() : null,
        rejectionReason: p.rejectionReason,
        imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
        description: p.description || 'No description provided'
      }))
      
      setProperties(mapped)
    } catch (error) {
      console.error('Failed to load properties:', error)
      // Set empty array on error instead of mock data
      setProperties([])
    } finally {
      setLoading(false)
    }
  }

  const filteredProperties = filter === 'All' 
    ? properties 
    : properties.filter(p => p.status === filter)

  const getStatusBadge = (status) => {
    const styles = {
      Pending: 'bg-yellow-100 text-yellow-700',
      Approved: 'bg-green-100 text-green-700',
      Rejected: 'bg-red-100 text-red-700'
    }
    return styles[status] || 'bg-gray-100 text-gray-700'
  }

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Approved': return <CheckCircle size={20} className="text-green-600" />
      case 'Pending': return <Clock size={20} className="text-yellow-600" />
      case 'Rejected': return <XCircle size={20} className="text-red-600" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Properties</h1>
          <p className="text-gray-600 mt-1">Manage and track your property submissions</p>
        </div>
        <button
          onClick={() => navigate('/owner/properties/new')}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:scale-105"
        >
          <Building2 size={20} />
          Submit New Property
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['All', 'Approved', 'Pending', 'Rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-amber-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-amber-600" size={48} />
        </div>
      ) : (
        <>
      {/* Properties Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProperties.map((property) => {
          const progress = property.targetAmount > 0 
            ? (property.raised / property.targetAmount) * 100 
            : 0

          return (
            <div
              key={property.id}
              className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              {/* Property Image */}
              <div className="relative h-48 bg-gradient-to-br from-amber-500 to-orange-600">
                <img 
                  src={property.imageUrl} 
                  alt={property.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4">
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${getStatusBadge(property.status)}`}>
                    {getStatusIcon(property.status)}
                    {property.status}
                  </span>
                </div>
              </div>

              {/* Property Details */}
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{property.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={16} />
                    {property.location}
                  </div>
                </div>

                <p className="text-sm text-gray-600 line-clamp-2">{property.description}</p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-200">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Target Amount</p>
                    <div className="flex items-center gap-1">
                      <DollarSign size={16} className="text-amber-600" />
                      <span className="font-bold text-gray-900">
                        SAR {property.targetAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {property.status === 'Approved' && (
                    <>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Investors</p>
                        <div className="flex items-center gap-1">
                          <Users size={16} className="text-blue-600" />
                          <span className="font-bold text-gray-900">{property.investors}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Raised</p>
                        <span className="font-bold text-emerald-600">
                          SAR {property.raised.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Yield</p>
                        <div className="flex items-center gap-1">
                          <TrendingUp size={16} className="text-purple-600" />
                          <span className="font-bold text-gray-900">{property.yield}%</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Progress Bar (for Approved properties) */}
                {property.status === 'Approved' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Funding Progress</span>
                      <span className="text-sm font-bold text-amber-600">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-orange-600 h-2.5 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Status Messages */}
                {property.status === 'Pending' && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                    <AlertCircle size={18} className="text-yellow-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-900">Under Review</p>
                      <p className="text-xs text-yellow-700">Submitted on {property.submittedDate}</p>
                    </div>
                  </div>
                )}

                {property.status === 'Rejected' && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                    <XCircle size={18} className="text-red-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">Rejected</p>
                      <p className="text-xs text-red-700">{property.rejectionReason}</p>
                    </div>
                  </div>
                )}

                {property.status === 'Approved' && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <CheckCircle size={18} className="text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">Live & Accepting Investments</p>
                      <p className="text-xs text-green-700">Approved on {property.approvedDate}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                    <Eye size={18} />
                    View Details
                  </button>
                  {(property.status === 'Pending' || property.status === 'Rejected') && (
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium">
                      <Edit2 size={18} />
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredProperties.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto text-gray-400 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No properties found</h3>
          <p className="text-gray-600 mb-6">
            {filter === 'All' 
              ? "You haven't submitted any properties yet" 
              : `No ${filter.toLowerCase()} properties`}
          </p>
          <button
            onClick={() => navigate('/owner/properties/new')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors"
          >
            <Building2 size={20} />
            Submit Your First Property
          </button>
        </div>
      )}
      </>
      )}
    </div>
  )
}