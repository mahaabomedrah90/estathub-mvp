import React, { useState, useEffect } from 'react'
import { Building2, Eye, CheckCircle, X, MapPin, DollarSign, Clock, User, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next';



export default function AdminOpportunities() {
  const { t, i18n } = useTranslation('pages');

  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  /* const [mockProperties] = useState([
    {
      id: 1,
      name: 'Luxury Villa - Al Malqa',
      location: 'Al Malqa, Riyadh',
      owner: 'Mohammed Al-Saud',
      targetAmount: 2000000,
      description: 'Modern luxury villa with 5 bedrooms, pool, and garden',
      status: 'Pending',
      submittedDate: '2025-01-05',
      imageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800'
    },
    {
      id: 2,
      name: 'Commercial Tower - King Fahd',
      location: 'King Fahd Road, Riyadh',
      owner: 'Sara Al-Rashid',
      targetAmount: 5000000,
      description: '10-floor commercial building in prime location',
      status: 'approved',
      submittedDate: '2025-01-04',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800'
    },
    {
      id: 3,
      name: 'Residential Complex - Al Olaya',
      location: 'Al Olaya, Riyadh',
      owner: 'Ahmed Al-Otaibi',
      targetAmount: 3500000,
      description: '20-unit residential complex with modern amenities',
      status: 'rejected',
      submittedDate: '2025-01-01',
      imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'
    },
    {
      id: 4,
      name: 'Shopping Mall - Al Nakheel',
      location: 'Al Nakheel, Riyadh',
      owner: 'Fatima Al-Harbi',
      targetAmount: 8000000,
      description: 'Large shopping mall with 50+ retail spaces',
      status: 'pending',
      submittedDate: '2024-12-28',
      imageUrl: 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=800'
    },
  ]) */

  const [selectedProperty, setSelectedProperty] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadProperties()
  }, [])

  const loadProperties = async () => {
    setLoading(true)
    try {
      const response = await fetch(import.meta.env.VITE_API_BASE + '/api/properties')
      const data = await response.json()
      
      // Map backend data to frontend format
      const mapped = data.map(p => ({
        
        id: p.id,
        name: p.name,
        location: p.location || t('admin.opportunities.defaults.location'),
        owner: p.ownerName || t('admin.opportunities.defaults.owner'),
        targetAmount: p.totalValue,
description: p.description || t('admin.opportunities.defaults.description'),
       status: p.status === 'APPROVED'
  ? 'approved'
  : p.status === 'REJECTED'
    ? 'rejected'
    : 'pending',

        submittedDate: p.submittedDate ? new Date(p.submittedDate).toLocaleDateString() : new Date().toLocaleDateString(),
        imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
        rejectionReason: p.rejectionReason
      }))
      
      setProperties(mapped)
    } catch (error) {
      console.error('Failed to load properties:', error)
      // Fallback to mock data if API fails
      setProperties([])
    } finally {
      setLoading(false)
    }                                                                                                                                                                                                                             
  }

  const handleApprove = async (id) => {
    try {
      const response = await fetch(import.meta.env.VITE_API_BASE + `/api/properties/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (response.ok) {
        setProperties(properties.map(p => 
          p.id === id ? { ...p, status: 'approved' } : p
        ))
        setSelectedProperty(null)
        alert(t('admin.opportunities.messages.approveSuccess'))
        loadProperties() // Reload to get fresh data
      } else {
        alert(t('admin.opportunities.messages.approveFailed'))
        console.error('Approve failed with status:', response.status);
      }
    } catch (error) {
      console.error('Approve error:', error)
      alert(t('admin.opportunities.messages.approveFailed'))

    }
  }

  const handleReject = async (id) => {
    const reason =
  prompt(t('admin.opportunities.messages.rejectReasonPrompt')) ||
  t('admin.opportunities.messages.rejectNoReason')    
    try {
      const response = await fetch(import.meta.env.VITE_API_BASE + `/api/properties/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      
      if (response.ok) {
        setProperties(properties.map(p => 
          p.id === id ? { ...p, status: 'rejected', rejectionReason: reason } : p
        ))
        setSelectedProperty(null)
        alert(t('admin.opportunities.messages.rejectFailed'))

        loadProperties() // Reload to get fresh data
      } else {
        console.error('Reject failed with status:', response.status);
        alert(t('admin.opportunities.messages.rejectFailed'))

      }
    } catch (error) {
      console.error('Reject error:', error)
      alert(t('admin.opportunities.messages.rejectFailed'))

    }
  }

  const filteredProperties = filter === 'all'
  ? properties
  : properties.filter(p => p.status === filter)

  const getStatusBadge = (status) => {
    const styles = {
        pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    }
    return styles[status] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
         <h1 className="text-2xl font-bold text-gray-900">
  {t('admin.opportunities.headerTitle')}
</h1>
<p className="text-gray-600 mt-1">
  {t('admin.opportunities.headerSubtitle')}
</p>        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
                  onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t(`admin.opportunities.filters.${status}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Properties Table */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin.opportunities.table.property')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin.opportunities.table.owner')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin.opportunities.table.targetAmount')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin.opportunities.table.status')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin.opportunities.table.submitted')}
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin.opportunities.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProperties.map((property) => (
                <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Building2 className="text-white" size={24} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{property.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin size={14} />
                          {property.location}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-900">{property.owner}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                      <DollarSign size={16} className="text-emerald-600" />
                      {t('admin.opportunities.currency')} {property.targetAmount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(property.status)}`}>
                      {t(`admin.opportunities.status.${property.status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock size={14} />
                      {t('admin.opportunities.table.submittedDate', { date: property.submittedDate })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedProperty(property)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <Eye size={16} />
                      {i18n.language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                    {t('admin.opportunities.modal.title')}
                </h2>
                <button
                  onClick={() => setSelectedProperty(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Property Image */}
              <div className="w-full h-64 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl overflow-hidden">
                <img 
                  src={selectedProperty.imageUrl} 
                  alt={selectedProperty.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Property Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
               <label className="text-sm font-semibold text-gray-600">
  {t('admin.opportunities.fields.name')}
</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">{selectedProperty.name}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">
  {t('admin.opportunities.fields.location')}
</label>
                  <p className="text-lg text-gray-900 mt-1">{selectedProperty.location}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">
  {t('admin.opportunities.fields.owner')}
</label>
                  <p className="text-lg text-gray-900 mt-1">{selectedProperty.owner}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">
  {t('admin.opportunities.fields.targetAmount')}
</label>
                  <p className="text-lg font-bold text-emerald-600 mt-1">
  {t('admin.opportunities.currency')} {selectedProperty.targetAmount.toLocaleString()}
</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">
  {t('admin.opportunities.fields.status')}
</label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold mt-1 ${getStatusBadge(selectedProperty.status)}`}>
                    {t(`admin.opportunities.status.${selectedProperty.status}`)}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    {t('admin.opportunities.fields.submittedDate')}
                  </label>
                  <p className="text-lg text-gray-900 mt-1">
                    {selectedProperty.submittedDate}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-semibold text-gray-600">
  {t('admin.opportunities.fields.description')}
</label>
                <p className="text-gray-700 mt-2 leading-relaxed">{selectedProperty.description}</p>
              </div>

              {/* Actions */}
              {selectedProperty.status === 'pending' && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleApprove(selectedProperty.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold"
                  >
                    <CheckCircle size={20} />
                    {t('admin.opportunities.actions.approve')}
                  </button>
                  <button
                    onClick={() => handleReject(selectedProperty.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold"
                  >
                    <X size={20} />
                    {t('admin.opportunities.actions.reject')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}