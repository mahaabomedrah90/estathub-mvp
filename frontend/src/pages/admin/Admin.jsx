import React, { useEffect, useState } from 'react'
import { authHeader, fetchJson, getToken } from '../../lib/api'
import { 
  Building2, Plus, Edit2, Save, X, Loader2, AlertCircle, 
  CheckCircle2, TrendingUp, Coins, MapPin, Upload, Image as ImageIcon, Map 
} from 'lucide-react'

export default function Admin() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    tokenPrice: '',
    totalTokens: '',
    monthlyYield: '',
    location: 'Riyadh, Saudi Arabia',
    description: '',
    imageUrl: '',
    latitude: '',
    longitude: ''
  })

  useEffect(() => {
    loadProperties()
  }, [])

  async function loadProperties() {
    try {
      setLoading(true)
      setError('')
      const data = await fetch(import.meta.env.VITE_API_BASE + '/api/properties').then(r => r.json())
      setProperties(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      tokenPrice: '',
      totalTokens: '',
      monthlyYield: '',
      location: 'Riyadh, Saudi Arabia',
      description: '',
      imageUrl: '',
      latitude: '',
      longitude: ''
    })
    setEditingId(null)
    setShowForm(false)
    setError('')
    setSuccess('')
  }

  function handleEdit(property) {
    setFormData({
      name: property.name || property.title || '',
      tokenPrice: property.tokenPrice || '',
      totalTokens: property.totalTokens || property.tokensAvailable || '',
      monthlyYield: property.monthlyYield || '',
      location: property.location || 'Riyadh, Saudi Arabia',
      description: property.description || '',
      imageUrl: property.imageUrl || ''
    })
    setEditingId(property.id)
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!getToken()) {
      setError('Please login to manage properties')
      return
    }

    try {
      setSubmitting(true)
      
      const payload = {
        name: formData.name,
        tokenPrice: Number(formData.tokenPrice),
        totalTokens: Number(formData.totalTokens),
        monthlyYield: Number(formData.monthlyYield),
        location: formData.location,
        description: formData.description,
        imageUrl: formData.imageUrl,
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null
      }

      if (editingId) {
        // Update existing property
        await fetchJson(`/api/properties/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify(payload)
        })
        setSuccess('Property updated successfully!')
      } else {
        // Create new property
        await fetchJson('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify(payload)
        })
        setSuccess('Property created successfully!')
      }

      await loadProperties()
      setTimeout(() => resetForm(), 2000)
    } catch (err) {
      setError(err.message || 'Failed to save property')
    } finally {
      setSubmitting(false)
    }
  }

  function handleInputChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!getToken()) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Building2 className="mx-auto text-gray-400" size={64} />
          <div className="text-gray-600">Please login to access the admin panel.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Property Management</h1>
          <p className="text-gray-600">Add and manage real estate investment opportunities</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
          >
            <Plus size={20} />
            <span>Add Property</span>
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle2 className="text-emerald-600" size={20} />
          <span className="text-emerald-700">{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="text-red-600" size={20} />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingId ? 'Edit Property' : 'Add New Property'}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              {/* Property Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  className="border border-gray-300 rounded-lg w-full px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., Luxury Villa in Riyadh"
                  required
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => handleInputChange('location', e.target.value)}
                  className="border border-gray-300 rounded-lg w-full px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., Riyadh, Saudi Arabia"
                  required
                />
              </div>

              {/* Latitude */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Map className="text-gray-400" size={18} />
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={e => handleInputChange('latitude', e.target.value)}
                    className="border border-gray-300 rounded-lg w-full pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., 24.7136"
                  />
                </div>
              </div>

              {/* Longitude */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Map className="text-gray-400" size={18} />
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={e => handleInputChange('longitude', e.target.value)}
                    className="border border-gray-300 rounded-lg w-full pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., 46.6753"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Tip: Get coordinates from <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">Google Maps</a> by right-clicking on the location
                </p>
              </div>

              {/* Token Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token Price (SAR) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={formData.tokenPrice}
                  onChange={e => handleInputChange('tokenPrice', e.target.value)}
                  className="border border-gray-300 rounded-lg w-full px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., 1000"
                  required
                />
              </div>

              {/* Total Tokens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Tokens *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.totalTokens}
                  onChange={e => handleInputChange('totalTokens', e.target.value)}
                  className="border border-gray-300 rounded-lg w-full px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., 1000"
                  required
                />
              </div>

              {/* Monthly Yield */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Yield (%) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.monthlyYield}
                  onChange={e => handleInputChange('monthlyYield', e.target.value)}
                  className="border border-gray-300 rounded-lg w-full px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., 2.5"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={e => handleInputChange('description', e.target.value)}
                className="border border-gray-300 rounded-lg w-full px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Describe the property and investment opportunity..."
                rows={4}
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Image URL
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ImageIcon className="text-gray-400" size={20} />
                    </div>
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={e => handleInputChange('imageUrl', e.target.value)}
                      className="border border-gray-300 rounded-lg w-full pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="https://example.com/property-image.jpg"
                    />
                  </div>
                </div>
                {formData.imageUrl && (
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="text-sm text-gray-600 mb-2">Image Preview:</div>
                    <div className="relative w-full h-48 bg-gray-200 rounded-lg overflow-hidden">
                      <img 
                        src={formData.imageUrl} 
                        alt="Property preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                      <div className="absolute inset-0 hidden items-center justify-center bg-gray-100">
                        <div className="text-center text-gray-500">
                          <ImageIcon className="mx-auto mb-2" size={32} />
                          <div className="text-sm">Invalid image URL</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Tip: You can use free image hosting services like Imgur, Cloudinary, or upload to your own server.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    <span>{editingId ? 'Update Property' : 'Create Property'}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Properties List */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Existing Properties</h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <Loader2 className="animate-spin text-emerald-600 mx-auto" size={40} />
              <div className="text-gray-600">Loading properties...</div>
            </div>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Building2 className="mx-auto mb-2 text-gray-300" size={48} />
            <div>No properties yet. Add your first property to get started!</div>
          </div>
        ) : (
          <div className="space-y-4">
            {properties.map(property => {
              const tokenPrice = Number(property.tokenPrice ?? 0)
              const monthlyYield = property.monthlyYield ?? 0
              const remainingTokens = property.remainingTokens ?? property.tokensAvailable ?? 0
              const totalTokens = property.totalTokens ?? remainingTokens
              const percentageSold = totalTokens > 0 ? ((totalTokens - remainingTokens) / totalTokens * 100).toFixed(0) : 0

              return (
                <div key={property.id} className="border border-gray-200 rounded-lg overflow-hidden hover:border-emerald-300 transition-colors">
                  <div className="flex flex-col md:flex-row">
                    {/* Property Image */}
                    <div className="md:w-48 h-48 flex-shrink-0">
                      {property.imageUrl ? (
                        <img 
                          src={property.imageUrl} 
                          alt={property.name || property.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 ${property.imageUrl ? 'hidden' : 'flex'} items-center justify-center`}>
                        <Building2 className="text-white opacity-50" size={64} />
                      </div>
                    </div>

                    {/* Property Details */}
                    <div className="flex-1 p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900 mb-1">{property.name || property.title}</h3>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin size={14} />
                            <span>{property.location || 'Riyadh, Saudi Arabia'}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleEdit(property)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
                        >
                          <Edit2 size={16} />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
                            <Coins size={14} />
                            <span>Token Price</span>
                          </div>
                          <div className="font-semibold text-gray-900">{tokenPrice.toLocaleString()} SAR</div>
                        </div>

                        <div className="bg-emerald-50 rounded-lg p-3">
                          <div className="flex items-center gap-1 text-emerald-600 text-xs mb-1">
                            <TrendingUp size={14} />
                            <span>Monthly Yield</span>
                          </div>
                          <div className="font-semibold text-emerald-700">{monthlyYield}%</div>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="text-blue-600 text-xs mb-1">Total Tokens</div>
                          <div className="font-semibold text-blue-700">{totalTokens.toLocaleString()}</div>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-3">
                          <div className="text-purple-600 text-xs mb-1">Sold</div>
                          <div className="font-semibold text-purple-700">{percentageSold}%</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-emerald-600 h-2 rounded-full transition-all" 
                            style={{ width: `${percentageSold}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}