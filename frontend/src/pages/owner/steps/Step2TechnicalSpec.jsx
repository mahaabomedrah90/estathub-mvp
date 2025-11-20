import React, { useState } from 'react'
import { Building2, MapPin, AlertCircle, Image as ImageIcon, X } from 'lucide-react'
import { PropertyType, PropertyTypeLabels, PropertyCondition, PropertyConditionLabels, authHeader } from '../../../lib/api'

export default function Step2TechnicalSpec({ formData, onChange, errors = {} }) {
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageError, setImageError] = useState('')

  const handleChange = (field, value) => {
    onChange({ ...formData, [field]: value })
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const currentImages = formData.mainImagesUrls || []
    if (currentImages.length + files.length > 10) {
      setImageError('Maximum 10 images allowed')
      return
    }

    setImageError('')
    setUploadingImages(true)

    try {
      const uploadedUrls = []
      
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          setImageError(`${file.name} is too large. Max 5MB per image.`)
          continue
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('documentType', 'propertyImage')

        const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/properties/upload-document`, {
          method: 'POST',
          headers: authHeader(),
          body: formData
        })

        if (response.ok) {
          const data = await response.json()
          uploadedUrls.push(data.fileUrl)
        }
      }

      handleChange('mainImagesUrls', [...currentImages, ...uploadedUrls])
    } catch (err) {
      console.error('Image upload error:', err)
      setImageError('Failed to upload images')
    } finally {
      setUploadingImages(false)
    }
  }

  const removeImage = (index) => {
    const newImages = [...(formData.mainImagesUrls || [])]
    newImages.splice(index, 1)
    handleChange('mainImagesUrls', newImages)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <Building2 className="text-blue-600" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Technical Specification</h2>
          <p className="text-sm text-gray-600">المواصفات الفنية - Property details and location</p>
        </div>
      </div>

      {/* Property Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Property Type / نوع العقار <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.propertyType}
          onChange={(e) => handleChange('propertyType', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">Select property type</option>
          {Object.entries(PropertyTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        {errors.propertyType && (
          <p className="mt-1 text-sm text-red-600">{errors.propertyType}</p>
        )}
      </div>

      {/* Area Measurements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Land Area (m²) / مساحة الأرض <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.landArea}
            onChange={(e) => handleChange('landArea', e.target.value)}
            placeholder="e.g., 500"
            min="0"
            step="0.01"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          {errors.landArea && (
            <p className="mt-1 text-sm text-red-600">{errors.landArea}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Built Area (m²) / مساحة البناء <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.builtArea}
            onChange={(e) => handleChange('builtArea', e.target.value)}
            placeholder="e.g., 350"
            min="0"
            step="0.01"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          {errors.builtArea && (
            <p className="mt-1 text-sm text-red-600">{errors.builtArea}</p>
          )}
        </div>
      </div>

      {/* Building Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Building Age (years) / عمر البناء <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.buildingAge}
            onChange={(e) => handleChange('buildingAge', e.target.value)}
            placeholder="e.g., 5"
            min="0"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          {errors.buildingAge && (
            <p className="mt-1 text-sm text-red-600">{errors.buildingAge}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Floors / عدد الطوابق <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.floorsCount}
            onChange={(e) => handleChange('floorsCount', e.target.value)}
            placeholder="e.g., 2"
            min="1"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          {errors.floorsCount && (
            <p className="mt-1 text-sm text-red-600">{errors.floorsCount}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Units / عدد الوحدات <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.unitsCount}
            onChange={(e) => handleChange('unitsCount', e.target.value)}
            placeholder="e.g., 1"
            min="1"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          {errors.unitsCount && (
            <p className="mt-1 text-sm text-red-600">{errors.unitsCount}</p>
          )}
        </div>
      </div>

      {/* Property Condition */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Property Condition / حالة العقار <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.propertyCondition}
          onChange={(e) => handleChange('propertyCondition', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">Select condition</option>
          {Object.entries(PropertyConditionLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        {errors.propertyCondition && (
          <p className="mt-1 text-sm text-red-600">{errors.propertyCondition}</p>
        )}
      </div>

      {/* Location Details */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin size={20} />
          Location Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City / المدينة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="e.g., Riyadh"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {errors.city && (
              <p className="mt-1 text-sm text-red-600">{errors.city}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              District / الحي <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.district}
              onChange={(e) => handleChange('district', e.target.value)}
              placeholder="e.g., Al Olaya"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {errors.district && (
              <p className="mt-1 text-sm text-red-600">{errors.district}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Municipality / البلدية <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.municipality}
              onChange={(e) => handleChange('municipality', e.target.value)}
              placeholder="e.g., Riyadh Municipality"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {errors.municipality && (
              <p className="mt-1 text-sm text-red-600">{errors.municipality}</p>
            )}
          </div>
        </div>

        {/* GPS Coordinates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GPS Latitude / خط العرض <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.gpsLatitude}
              onChange={(e) => handleChange('gpsLatitude', e.target.value)}
              placeholder="e.g., 24.7136"
              step="0.000001"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {errors.gpsLatitude && (
              <p className="mt-1 text-sm text-red-600">{errors.gpsLatitude}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GPS Longitude / خط الطول <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.gpsLongitude}
              onChange={(e) => handleChange('gpsLongitude', e.target.value)}
              placeholder="e.g., 46.6753"
              step="0.000001"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {errors.gpsLongitude && (
              <p className="mt-1 text-sm text-red-600">{errors.gpsLongitude}</p>
            )}
          </div>
        </div>
      </div>

      {/* Property Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Property Description / وصف العقار <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.propertyDescription}
          onChange={(e) => handleChange('propertyDescription', e.target.value)}
          placeholder="Provide a detailed description of the property (minimum 100 characters)"
          rows={5}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        <div className="flex justify-between items-center mt-1">
          {errors.propertyDescription && (
            <p className="text-sm text-red-600">{errors.propertyDescription}</p>
          )}
          <p className="text-sm text-gray-500 ml-auto">
            {formData.propertyDescription?.length || 0} / 100 minimum
          </p>
        </div>
      </div>

      {/* Property Images */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ImageIcon size={20} />
            Property Images (3-10 required)
          </h3>
          <span className="text-sm text-gray-600">
            {(formData.mainImagesUrls || []).length} / 10
          </span>
        </div>

        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            disabled={uploadingImages || (formData.mainImagesUrls || []).length >= 10}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            <ImageIcon className="mx-auto text-gray-400 mb-2" size={40} />
            <p className="text-sm text-gray-600 mb-1">
              {uploadingImages ? 'Uploading...' : 'Click to upload property images'}
            </p>
            <p className="text-xs text-gray-500">
              JPG, PNG, WEBP (Max 5MB per image)
            </p>
          </label>
        </div>

        {imageError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle size={16} />
            <span>{imageError}</span>
          </div>
        )}

        {/* Image Preview Grid */}
        {(formData.mainImagesUrls || []).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(formData.mainImagesUrls || []).map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={`${import.meta.env.VITE_API_BASE}${url}`}
                  alt={`Property ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
                {index === 0 && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-emerald-600 text-white text-xs rounded">
                    Main Image
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {errors.mainImagesUrls && (
          <p className="text-sm text-red-600">{errors.mainImagesUrls}</p>
        )}
      </div>
    </div>
  )
}