import React, { useState, useEffect, useRef } from 'react'
import { Building2, MapPin, AlertCircle, Image as ImageIcon, X } from 'lucide-react'
import { PropertyType, PropertyTypeLabels, PropertyCondition, PropertyConditionLabels, authHeader } from '../../../lib/api'
import { useTranslation } from 'react-i18next';



export default function Step2TechnicalSpec({ formData, onChange, errors = {} }) {
const { t } = useTranslation('pages');
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageError, setImageError] = useState('')

  // Map state (Leaflet loaded dynamically, similar to OwnerNewProperty)
  const [showMap, setShowMap] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  const handleChange = (field, value) => {
    onChange({ ...formData, [field]: value })
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const currentImages = formData.mainImagesUrls || []
    if (currentImages.length + files.length > 10) {
      setImageError(t('owner.newProperty.step2.imageErrorMax', { max: 10 }))
      return
    }

    setImageError('')
    setUploadingImages(true)

    try {
      const uploadedUrls = []
      
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          setImageError(
            t('owner.newProperty.step2.imageErrorTooLarge', {
              file: file.name,
            })
          )
          continue
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('documentType', 'propertyImage')

        const response = await fetch('/api/properties/upload-document', {
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
      setImageError(t('owner.newProperty.step2.imageUploadFailed'))
    } finally {
      setUploadingImages(false)
    }
  }

  const removeImage = (index) => {
    const newImages = [...(formData.mainImagesUrls || [])]
    newImages.splice(index, 1)
    handleChange('mainImagesUrls', newImages)
  }

  // Load Leaflet CSS & JS only when map is shown
  useEffect(() => {
    if (!showMap) return

    // CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // JS
    if (!window.L) {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => setMapLoaded(true)
      document.body.appendChild(script)
    } else {
      setMapLoaded(true)
    }
  }, [showMap])

  // Initialize Leaflet map once loaded
  useEffect(() => {
    if (!mapLoaded || !showMap || mapRef.current) return

    const L = window.L
    const lat = Number(formData.gpsLatitude) || 24.7136
    const lng = Number(formData.gpsLongitude) || 46.6753

    const map = L.map('owner-property-map').setView([lat, lng], 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    const marker = L.marker([lat, lng], { draggable: true }).addTo(map)

    const updateFromLatLng = (p) => {
      handleChange('gpsLatitude', p.lat.toFixed(6))
      handleChange('gpsLongitude', p.lng.toFixed(6))
    }

    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng()
      updateFromLatLng(pos)
    })

    map.on('click', (e) => {
      marker.setLatLng(e.latlng)
      updateFromLatLng(e.latlng)
    })

    mapRef.current = map
    markerRef.current = marker

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [mapLoaded, showMap, formData.gpsLatitude, formData.gpsLongitude])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-border-soft">
        <div className="w-14 h-14 bg-brand-primary/10 rounded-2xl flex items-center justify-center">
          <Building2 className="text-brand-primary" size={28} />
        </div>
        <div>
         <h2 className="text-2xl font-bold text-brand-primary">
  {t('owner.newProperty.step2.title')}
</h2>
<p className="text-text-muted mt-1">
  {t('owner.newProperty.step2.subtitle')}
</p>
        </div>
      </div>

      {/* Property Type */}
      <div>
        <label className="block text-sm font-semibold text-text-body mb-3">
       {t('owner.newProperty.step2.propertyTypeLabel')}
 <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.propertyType}
          onChange={(e) => handleChange('propertyType', e.target.value)}
          className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
        >
          <option value="">
            {t('owner.newProperty.step2.propertyTypePlaceholder')}
          </option>
          {Object.keys(PropertyTypeLabels).map((key) => (
            <option key={key} value={key}>
              {t(`owner.newProperty.step2.propertyTypes.${key}`)}
            </option>
          ))}
        </select>
        {errors.propertyType && (
          <p className="mt-1 text-sm text-red-600">{errors.propertyType}</p>
        )}
      </div>

      {/* Area Measurements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-text-body mb-3">
       {t('owner.newProperty.step2.landAreaLabel')} <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.landArea}
            onChange={(e) => handleChange('landArea', e.target.value)}
             placeholder={t('owner.newProperty.step2.landAreaPlaceholder')}
            min="0"
            step="0.01"
            className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
          />
          {errors.landArea && (
            <p className="mt-1 text-sm text-red-600">{errors.landArea}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-body mb-3">
       {t('owner.newProperty.step2.builtAreaLabel')} <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.builtArea}
            onChange={(e) => handleChange('builtArea', e.target.value)}
            placeholder={t('owner.newProperty.step2.builtAreaPlaceholder')}
            min="0"
            step="0.01"
            className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
          />
          {errors.builtArea && (
            <p className="mt-1 text-sm text-red-600">{errors.builtArea}</p>
          )}
        </div>
      </div>

      {/* Building Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-text-body mb-3">
       {t('owner.newProperty.step2.buildingAgeLabel')} <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.buildingAge}
            onChange={(e) => handleChange('buildingAge', e.target.value)}
            placeholder={t('owner.newProperty.step2.buildingAgePlaceholder')}
            min="0"
            className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
          />
          {errors.buildingAge && (
            <p className="mt-1 text-sm text-red-600">{errors.buildingAge}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-body mb-3">
       {t('owner.newProperty.step2.floorsCountLabel')} <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.floorsCount}
            onChange={(e) => handleChange('floorsCount', e.target.value)}
            placeholder= {t('owner.newProperty.step2.floorsCountPlaceholder')}
            min="1"
            className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
          />
          {errors.floorsCount && (
            <p className="mt-1 text-sm text-red-600">{errors.floorsCount}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-body mb-3">
           {t('owner.newProperty.step2.unitsCountLabel')}
 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.unitsCount}
            onChange={(e) => handleChange('unitsCount', e.target.value)}
            placeholder={t('owner.newProperty.step2.unitsCountPlaceholder')}
            min="1"
            className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
          />
          {errors.unitsCount && (
            <p className="mt-1 text-sm text-red-600">{errors.unitsCount}</p>
          )}
        </div>
      </div>

      {/* Property Condition */}
      <div>
        <label className="block text-sm font-semibold text-text-body mb-3">
       {t('owner.newProperty.step2.propertyConditionLabel')} <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.propertyCondition}
          onChange={(e) => handleChange('propertyCondition', e.target.value)}
          className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
        >
          <option value="">
            {t('owner.newProperty.step2.propertyConditionPlaceholder')}
          </option>
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
        <h3 className="text-xl font-semibold text-brand-primary flex items-center gap-3">
          <MapPin size={24} />
          {t('owner.newProperty.step2.locationInformationTitle')}
        </h3>

        {/* Map toggle */}
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className="text-sm text-brand-accent hover:text-brand-accent/90 font-semibold mb-3 transition-colors"
        >
          {showMap
            ? t('owner.newProperty.step2.hideMapButton', { defaultValue: 'Hide map' })
            : t('owner.newProperty.step2.showMapButton', { defaultValue: 'Select location on map' })}
        </button>

        {showMap && (
          <div className="mb-4 h-64 rounded-xl border border-border-soft overflow-hidden shadow-sm">
            <div id="owner-property-map" className="w-full h-full" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-text-body mb-3">
           {t('owner.newProperty.step2.cityLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder={t('owner.newProperty.step2.cityPlaceholder')}
              className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
            />
            {errors.city && (
              <p className="mt-1 text-sm text-red-600">{errors.city}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-body mb-3">
           {t('owner.newProperty.step2.districtLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.district}
              onChange={(e) => handleChange('district', e.target.value)}
              placeholder={t('owner.newProperty.step2.districtPlaceholder')}
              className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
            />
            {errors.district && (
              <p className="mt-1 text-sm text-red-600">{errors.district}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-body mb-3">
           {t('owner.newProperty.step2.municipalityLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.municipality}
              onChange={(e) => handleChange('municipality', e.target.value)}
              placeholder={t('owner.newProperty.step2.municipalityPlaceholder')}
              className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
            />
            {errors.municipality && (
              <p className="mt-1 text-sm text-red-600">{errors.municipality}</p>
            )}
          </div>
        </div>

        {/* GPS Coordinates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-text-body mb-3">
              {t('owner.newProperty.step2.gpsLatitudeLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.gpsLatitude}
              onChange={(e) => handleChange('gpsLatitude', e.target.value)}
              placeholder={t('owner.newProperty.step2.gpsLatitudePlaceholder')}
              step="0.000001"
              className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
            />
            {errors.gpsLatitude && (
              <p className="mt-1 text-sm text-red-600">{errors.gpsLatitude}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-body mb-3">
           {t('owner.newProperty.step2.gpsLongitudeLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.gpsLongitude}
              onChange={(e) => handleChange('gpsLongitude', e.target.value)}
              placeholder={t('owner.newProperty.step2.gpsLongitudePlaceholder')}
              step="0.000001"
              className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
            />
            {errors.gpsLongitude && (
              <p className="mt-1 text-sm text-red-600">{errors.gpsLongitude}</p>
            )}
          </div>
        </div>
      </div>

      {/* Property Description */}
      <div>
        <label className="block text-sm font-semibold text-text-body mb-3">
           {t('owner.newProperty.step2.propertyDescriptionLabel')} <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.propertyDescription}
          onChange={(e) => handleChange('propertyDescription', e.target.value)}
          placeholder={t('owner.newProperty.step2.propertyDescriptionPlaceholder')}
          rows={5}
          className="w-full border border-border-soft rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
        />
        <div className="flex justify-between items-center mt-1">
          {errors.propertyDescription && (
            <p className="text-sm text-red-600">{errors.propertyDescription}</p>
          )}
          <p className="text-sm text-gray-500 ml-auto">
            {t('owner.newProperty.step2.descriptionCounter', {
              count: formData.propertyDescription?.length || 0,
              min: 100,
            })}
          </p>
        </div>
      </div>

      {/* Property Images */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-brand-primary flex items-center gap-3">
            <ImageIcon size={24} />
            {t('owner.newProperty.step2.propertyImagesRangeLabel', { min: 3, max: 10 })}
          </h3>
          <span className="text-sm text-text-muted font-medium">
            {(formData.mainImagesUrls || []).length} / 10
          </span>
        </div>

        {/* Upload Area */}
        <div className="border-2 border-dashed border-brand-accent/40 rounded-2xl p-8 text-center hover:border-brand-accent hover:bg-brand-accent-soft/30 transition-all duration-300">
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
            <ImageIcon className="mx-auto text-brand-accent mb-4" size={48} />
            <p className="text-sm text-text-body font-medium mb-2">
  {uploadingImages
    ? t('owner.newProperty.step2.uploadingImagesLabel')
    : t('owner.newProperty.step2.uploadImagesLabel')}
</p>
            <p className="text-xs text-text-muted">
  {t('owner.newProperty.step2.imagesFormatsHint')}
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
                  className="w-full h-32 object-cover rounded-xl border border-border-soft"
                />
                <button type="button" onClick={() => removeImage(index)} className="absolute top-3 right-3 p-2 bg-brand-coral text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-brand-coral/90">
                  <X size={16} />
                </button>
                {index === 0 && (
                  <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-brand-accent text-white text-xs rounded-lg font-medium">
                    {t('owner.newProperty.step2.mainImageBadge')}
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