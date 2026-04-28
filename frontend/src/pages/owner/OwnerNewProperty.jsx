import React, { useState, useEffect, useRef } from "react";
import { MapPin, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, authHeader, ApiError, fetchJson, getToken } from '../../lib/api';
import { useTranslation } from 'react-i18next'



const OwnerNewProperty = () => {
    const { t } = useTranslation('pages')
  const { t: tCommon } = useTranslation('common')
  const { i18n } = useTranslation('pages')
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    propertyName: "",
    propertyType: "",
    location: "",
    latitude: 24.7136, // Default: Riyadh
    longitude: 46.6753,
    area: "",
    buildingAge: "",
    description: "",
    propertyValue: "",
    expectedROI: "",
    totalTokens: "",
    tokenPrice: "",
    monthlyYield: "",
    imageUrl: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    saleType: "SELL",
  });
  
  const [showMap, setShowMap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [minInvestment, setMinInvestment] = useState(100);
  const [maxInvestment, setMaxInvestment] = useState(1000000);
  const [validationErrors, setValidationErrors] = useState({});
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Load Leaflet CSS and JS dynamically
  useEffect(() => {
    if (!showMap) return;
    
    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    
    // Load Leaflet JS
    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setMapLoaded(true);
      document.body.appendChild(script);
    } else {
      setMapLoaded(true);
    }
  }, [showMap]);
  
  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !showMap || mapRef.current) return;
    
    const L = window.L;
    
    // Create map
    const map = L.map('property-map').setView([form.latitude, form.longitude], 13);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    
    // Add draggable marker
    const marker = L.marker([form.latitude, form.longitude], {
      draggable: true,
    }).addTo(map);
    
    // Update location on marker drag
    marker.on('dragend', async function(e) {
      const position = e.target.getLatLng();
      setForm(prev => ({
        ...prev,
        latitude: position.lat,
        longitude: position.lng,
      }));
      
      // Reverse geocode to get address
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`
        );
        const data = await response.json();
        if (data.display_name) {
          setForm(prev => ({ ...prev, location: data.display_name }));
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      }
    });
    
    // Update marker on map click
    map.on('click', async function(e) {
      marker.setLatLng(e.latlng);
      setForm(prev => ({
        ...prev,
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      }));
      
      // Reverse geocode
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`
        );
        const data = await response.json();
        if (data.display_name) {
          setForm(prev => ({ ...prev, location: data.display_name }));
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      }
    });
    
    mapRef.current = map;
    markerRef.current = marker;
    
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [mapLoaded, showMap]);
// Fetch investment limits from settings
 useEffect(() => {
 const fetchSettings = async () => {
 try {
 const token = getToken();
 if (token) {
 const settings = await fetchJson('/api/settings', { headers: authHeader() });
 if (settings?.general) {
 setMinInvestment(parseFloat(settings.general.minInvestmentAmount) || 100);
 setMaxInvestment(parseFloat(settings.general.maxInvestmentAmount) || 1000000);
 console.log('💰 Investment limits loaded for property creation:', {
 min: settings.general.minInvestmentAmount,
 max: settings.general.maxInvestmentAmount
 });
 }
 }
 } catch (error) {
 console.error('Failed to fetch settings:', error);
 // Keep default values
 }
 };
 fetchSettings();
 }, []);
 // Comprehensive validation function
 const validateForm = () => {
 const errors = {};
 // Step 1: Basic Information
 if (!form.propertyName || form.propertyName.trim().length < 3) {
 errors.propertyName = 'Property name must be at least 3 characters';
 }
 if (!form.location || form.location.trim().length < 5) {
 errors.location = 'Location must be at least 5 characters';
 }
 // Step 2: Financials
 const propertyValue = parseFloat(form.propertyValue);
 const totalTokens = parseInt(form.totalTokens);
 const tokenPrice = parseFloat(form.tokenPrice);
 const expectedROI = parseFloat(form.expectedROI);
 const monthlyYield = parseFloat(form.monthlyYield);
 
 // Validate property value (reasonable minimum, no maximum)
 if (!propertyValue || isNaN(propertyValue)) {
 errors.propertyValue = 'Property value is required';
 } else if (propertyValue < 100000) {
 errors.propertyValue = 'Property value must be at least 100,000 SAR';
 }
 
 if (!totalTokens || totalTokens < 1) {
 errors.totalTokens = 'Total tokens must be at least 1';
 }
 
 // Validate token price against investment limits (this is what investors buy)
 if (!tokenPrice || isNaN(tokenPrice)) {
 errors.tokenPrice = 'Token price is required';
 } else if (tokenPrice < minInvestment) {
 errors.tokenPrice = `Token price must be at least ${minInvestment.toLocaleString()} SAR (platform minimum investment)`;
 } else if (tokenPrice > maxInvestment) {
 errors.tokenPrice = `Token price cannot exceed ${maxInvestment.toLocaleString()} SAR (platform maximum investment)`;
 }
 if (!expectedROI || expectedROI < 0) {
 errors.expectedROI = 'Expected ROI must be a positive number';
 }
 if (!monthlyYield || monthlyYield < 0) {
 errors.monthlyYield = 'Monthly yield must be a positive number';
 }
 // Step 3: Contact Information
 if (!form.contactName || form.contactName.trim().length < 2) {
 errors.contactName = 'Contact name must be at least 2 characters';
 }
 if (!form.contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
 errors.contactEmail = 'Please enter a valid email address';
 }
 if (!form.contactPhone || form.contactPhone.trim().length < 10) {
 errors.contactPhone = 'Please enter a valid phone number';
 }
 
 setValidationErrors(errors);
 return Object.keys(errors).length === 0;
 };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

   setValidationErrors({});
 // Comprehensive validation
 if (!validateForm()) {
 setError("Please fix the validation errors before submitting.");
 // Scroll to first error
 window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setLoading(true);
      
      // Prepare property data for API
      const propertyValue = parseFloat(form.propertyValue) || 0;
      const totalTokens = parseInt(form.totalTokens) || 10000;
      const tokenPrice = parseFloat(form.tokenPrice) || (propertyValue / totalTokens);
      const monthlyYield = parseFloat(form.monthlyYield) || 0;
      
      // Create FormData for multipart upload (supports images)
      const formData = new FormData();
      
      // Add all property fields
      formData.append('name', form.propertyName);
      formData.append('location', form.location);
      formData.append('description', form.description || '');
      formData.append('propertyValue', propertyValue.toString());
      formData.append('expectedROI', (parseFloat(form.expectedROI) || 0).toString());
      formData.append('totalTokens', totalTokens.toString());
      formData.append('tokenPrice', tokenPrice.toString());
      formData.append('monthlyYield', monthlyYield.toString());
      formData.append('ownerName', form.contactName || 'Property Owner');
      formData.append('ownerId', ''); // Will be set by backend if auth is implemented
      
      // Add image file if selected
      if (imageFile) {
        formData.append('images', imageFile);
      }
      
      console.log("📤 Submitting property with FormData:", {
        name: form.propertyName,
        hasImage: !!imageFile,
        imageSize: imageFile ? (imageFile.size / 1024).toFixed(2) + ' KB' : 'none'
      });
      
      // Use enhanced API client for FormData upload
      const result = await api.upload('/api/properties', formData, {
        headers: authHeader()
      });
      
      console.log("✅ Property created:", result);
      alert("✅ Property submitted successfully! Waiting for admin approval.");
      
      // Redirect to owner properties page
      navigate('/owner/properties');
      
    } catch (err) {
      console.error('❌ Property submission error:', err);
      
      // Handle different error types with better UX
      let errorMessage = 'Failed to submit property. Please try again.';
      
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'missing_required_fields':
            errorMessage = 'Please fill in all required fields: Property Name, Total Tokens, and Token Price.';
            break;
          case 'invalid_file_type':
            errorMessage = 'Please upload only image files (JPEG, PNG, GIF, WebP).';
            break;
          case 'file_too_large':
            errorMessage = 'Image size should be less than 5MB. Please choose a smaller file.';
            break;
          case 'too_many_files':
            errorMessage = 'Please upload a maximum of 10 images.';
            break;
          default:
            errorMessage = err.details || err.message || errorMessage;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-12 bg-white border border-border-soft rounded-2xl shadow-card p-8">
     <div className="text-center mb-8">
       <h1 className="text-3xl font-bold text-brand-primary mb-4">
         {t('owner.newProperty.pageTitle')}
       </h1>
       <p className="text-text-muted text-lg">
         {t('owner.newProperty.pageSubtitle')}
       </p>
     </div>

      {/* Step Indicator */}
      <div className="flex justify-center mb-12">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`flex items-center ${
              n < 3 ? 'flex-1' : ''
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                step >= n
                  ? 'bg-brand-accent text-white shadow-lg'
                  : 'bg-surface-muted text-text-muted'
              }`}
            >
              {step > n ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                n
              )}
            </div>
            {n < 3 && (
              <div className={`flex-1 h-1 mx-2 transition-all duration-300 ${
                step > n ? 'bg-brand-accent' : 'bg-surface-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              {t('owner.newProperty.step1.title')}
            </h2>

            <label className="block mb-2 font-medium">
              {t('owner.newProperty.step1.propertyNameLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="propertyName"
              placeholder="e.g., Riyadh Villa – Al Malqa"
              value={form.propertyName}
              onChange={handleChange}
              required
              maxLength={80}
              className={`w-full border border-border-soft rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors ${
                validationErrors.propertyName
                  ? 'border-red-500 bg-red-50'
                  : 'bg-surface-card'
              }`}
 />
 {validationErrors.propertyName && (
 <p className="text-red-600 text-sm mt-1 font-medium">{validationErrors.propertyName}</p>
 )}

            <label className="block mt-4 mb-2 font-medium">
              {t('owner.newProperty.step1.propertyTypeLabel')} <span className="text-red-500">*</span>
            </label>
           <select
                name="propertyType"
                value={form.propertyType}
                onChange={handleChange}
                required
                className="w-full border border-border-soft rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
              >
                <option value="">{t('owner.newProperty.step1.propertyTypePlaceholder')}</option>

                <option value="APARTMENT">{t('owner.newProperty.step1.propertyTypeApartment')}</option>
                <option value="VILLA">{t('owner.newProperty.step1.propertyTypeVilla')}</option>
                <option value="DUPLEX">{t('owner.newProperty.step1.propertyTypeDuplex')}</option>
                <option value="OFFICE">{t('owner.newProperty.step1.propertyTypeOffice')}</option>
                <option value="BUILDING">{t('owner.newProperty.step1.propertyTypeBuilding')}</option>
                <option value="WAREHOUSE">{t('owner.newProperty.step1.propertyTypeWarehouse')}</option>
                <option value="LAND">{t('owner.newProperty.step1.propertyTypeLand')}</option>
                <option value="COMMERCIAL">{t('owner.newProperty.step1.propertyTypeCommercial')}</option>
              </select>


            <label className="block mt-4 mb-2 font-medium">
              {t('owner.newProperty.step1.locationLabel')} <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <input
                type="text"
                name="location"
                placeholder="e.g., Al Malqa, Riyadh, Saudi Arabia"
                value={form.location}
                onChange={handleChange}
                required
                className="w-full border border-border-soft rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="flex items-center gap-2 text-brand-accent hover:text-brand-accent/90 font-medium transition-colors"
              >
                <MapPin size={18} />
                {showMap ? 'Hide Map' : 'Select on Map'}
              </button>
              
              {showMap && (
                <div className="border border-border-soft rounded-xl overflow-hidden shadow-sm">
                  <div id="property-map" style={{ height: '400px', width: '100%' }}></div>
                  <div className="bg-surface-muted p-4 text-sm text-text-muted border-t border-border-soft">
                   <p>
  <strong>{t('owner.newProperty.map.tipLabel')}:</strong>{' '}
  {t('owner.newProperty.map.tipText')}
</p>
{form.latitude && form.longitude && (
  <p className="mt-2">
    <strong>{t('owner.newProperty.map.coordinatesLabel')}:</strong>{' '}
    {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
  </p>
)}
                  </div>
                </div>
              )}
            </div>

            <label className="block mt-4 mb-2 font-medium">
                {t('owner.newProperty.step1.areaLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="area"
              placeholder="e.g., 250"
              value={form.area}
              onChange={handleChange}
              required
              min={1}
              step={0.01}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <label className="block mt-4 mb-2 font-medium">
                {t('owner.newProperty.step1.buildingAgeLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="buildingAge"
              placeholder="e.g., 5 (or 0 for new construction)"
              value={form.buildingAge}
              onChange={handleChange}
              required
              min={0}
              max={200}
              step={1}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <label className="block mt-4 mb-2 font-medium">
                {t('owner.newProperty.step1.descriptionLabel')}
            </label>
            <textarea
              name="description"
              placeholder="Describe property features, investment potential, and nearby landmarks..."
              value={form.description}
              onChange={handleChange}
              rows={4}
              className="w-full border border-border-soft rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors"
            />

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={nextStep}
                className="px-8 py-3 bg-brand-accent text-white rounded-xl font-semibold hover:bg-brand-accent/90 transition-all hover:scale-[1.02] active:scale-95 shadow-lg hover:shadow-xl"
              >
                {t('owner.newProperty.step1.nextButtonLabel')} {i18n.dir() === 'rtl' ? '←' : '→'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
                {t('owner.newProperty.step2.title')}
            </h2>

            <label className="block mb-2 font-medium">
                {t('owner.newProperty.step2.propertyValueLabel')} <span className="text-red-500">*</span>
              <span className="text-sm text-gray-500 ml-2">
                (Min: {minInvestment.toLocaleString()} SAR, Max: {maxInvestment.toLocaleString()} SAR)
              </span>
            </label>
            <input
              type="number"
              name="propertyValue"
              value={form.propertyValue}
              onChange={handleChange}
              placeholder="e.g., 2500000"
              required
              min={minInvestment}
              max={maxInvestment}
              step={1000}
              className={`w-full border border-border-soft rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors ${
                validationErrors.propertyValue
                  ? 'border-red-500 bg-red-50'
                  : ''
              }`}
            />
            {validationErrors.propertyValue && (
              <p className="text-red-600 text-sm mt-1 font-medium">{validationErrors.propertyValue}</p>
            )}

            <label className="block mt-4 mb-2 font-medium">
                {t('owner.newProperty.step2.expectedROILabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="expectedROI"
              value={form.expectedROI}
              onChange={handleChange}
              placeholder="e.g., 8"
              required
              min={0}
              max={100}
              step={0.1}
             className={`w-full border border-border-soft rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors ${
            validationErrors.monthlyYield
            ? 'border-red-500 bg-red-50'
            : ''
            }`}
            />
            {validationErrors.monthlyYield && (
            <p className="text-red-600 text-sm mt-1 font-medium">{validationErrors.monthlyYield}</p>
            )}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block mb-2 font-medium">
                  {t('owner.newProperty.step2.totalTokensLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="totalTokens"
                  value={form.totalTokens}
                  onChange={handleChange}
                  placeholder="e.g., 10000"
                  required
                  min={1}
                  step={1}
                  className={`w-full border border-border-soft rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors ${
 validationErrors.totalTokens
 ? 'border-red-500 bg-red-50'
 : ''
 }`}
 />
 {validationErrors.totalTokens && (
 <p className="text-red-600 text-sm mt-1">{validationErrors.totalTokens}</p>
 )}
              </div>
              <div>
                <label className="block mb-2 font-medium">
                    {t('owner.newProperty.step2.tokenPriceLabel')} <span className="text-red-500">*</span>
                  <span className="text-sm text-gray-500 block">
                    (Range: {minInvestment.toLocaleString()} - {maxInvestment.toLocaleString()} SAR per token)
                  </span>
                </label>
                <input
                  type="number"
                  name="tokenPrice"
                  value={form.tokenPrice}
                  onChange={handleChange}
                  placeholder="e.g., 250"
                  required
                  min={minInvestment}
                  max={maxInvestment}
                  step={0.01}
                 className={`w-full border border-border-soft rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors ${
            validationErrors.tokenPrice
            ? 'border-red-500 bg-red-50'
            : ''
            }`}
            />
            {validationErrors.tokenPrice && (
            <p className="text-red-600 text-sm mt-1 font-medium">{validationErrors.tokenPrice}</p>
            )}
            </div>
            </div>
            {/* Investment Limits Info */}
            <div className="mt-4 p-4 bg-brand-accent-soft border border-brand-accent/30 rounded-xl">
              <p className="text-sm text-brand-primary">
                <strong>Investment Limits:</strong> Investors can invest between {minInvestment.toLocaleString()} SAR and {maxInvestment.toLocaleString()} SAR per transaction.
                <br />
                <strong>Token Price Guidance:</strong> Set token price between {minInvestment.toLocaleString()} SAR and {maxInvestment.toLocaleString()} SAR to allow single-token purchases.
              </p>
            </div>

            <label className="block mt-4 mb-2 font-medium">
                {t('owner.newProperty.step2.monthlyYieldLabel')}
            </label>
            <input
              type="number"
              name="monthlyYield"
              value={form.monthlyYield}
              onChange={handleChange}
              placeholder="e.g., 0.5"
              min={0}
              max={100}
              step={0.01}
              className={`w-full border border-border-soft rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors ${
              validationErrors.expectedROI
              ? 'border-red-500 bg-red-50'
              : ''
              }`}
              />
              {validationErrors.expectedROI && (
              <p className="text-red-600 text-sm mt-1 font-medium">{validationErrors.expectedROI}</p>
              )}
            

            <label className="block mt-4 mb-2 font-medium">
                {t('owner.newProperty.step2.propertyImageLabel')}
            </label>
            <div className="space-y-3">
              {!imagePreview ? (
                <div className="border-2 border-dashed border-brand-accent/40 rounded-xl p-8 text-center hover:border-brand-accent hover:bg-brand-accent-soft/30 transition-all duration-300 cursor-pointer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center gap-3"
                  >
                    <Upload className="text-brand-accent" size={48} />
                    <span className="text-brand-primary font-medium text-lg">
                      {t('owner.newProperty.step2.uploadSingleImageLabel')}
                    </span>
                    <span className="text-text-muted text-sm">
                      {t('owner.newProperty.step2.singleImageFormatsHint')}
                    </span>
                  </label>
                </div>
              ) : (
                <div className="relative border border-border-soft rounded-xl overflow-hidden shadow-sm">
                  <img
                    src={imagePreview}
                    alt="Property preview"
                    className="w-full h-64 object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-3 right-3 bg-brand-coral text-white p-2 rounded-full hover:bg-brand-coral/90 transition-colors shadow-lg"
                  >
                    <X size={20} />
                  </button>
                  <div className="bg-surface-muted p-4 text-sm text-text-muted">
                    <p>
                      <strong>{t('owner.newProperty.step2.fileLabel')}:</strong> {imageFile?.name}
                    </p>
                    <p>
                      <strong>{t('owner.newProperty.step2.sizeLabel')}:</strong>{' '}
                      {(imageFile?.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              )}
            </div>

                        <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={prevStep}
                disabled={loading}
                className="px-6 py-3 text-text-muted border border-border-soft rounded-xl font-medium hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {i18n.dir() === 'rtl' ? '→' : '←'} {t('owner.newProperty.step3.backButtonLabel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    {t('owner.newProperty.step3.submittingLabel')}
                  </>
                ) : (
                  t('owner.newProperty.step3.submitButtonLabel')
                )}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
                {t('owner.newProperty.step3.title')}
            </h2>

            <label className="block mb-2 font-medium">
                {t('owner.newProperty.step3.fullNameLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="contactName"
              value={form.contactName}
              onChange={handleChange}
              placeholder="Your full name"
              required
              minLength={3}
            className={`w-full border border-border-soft rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors ${
 validationErrors.contactName
 ? 'border-red-500 bg-red-50'
 : ''
 }`}
 />
 {validationErrors.contactName && (
 <p className="text-red-600 text-sm mt-1 font-medium">{validationErrors.contactName}</p>
 )}

            <label className="block mt-4 mb-2 font-medium">
                {t('owner.newProperty.step3.emailLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="contactEmail"
              value={form.contactEmail}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              className={`w-full border border-border-soft rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors ${
 validationErrors.contactEmail
 ? 'border-red-500 bg-red-50'
 : ''
 }`}
 />
 {validationErrors.contactEmail && (
 <p className="text-red-600 text-sm mt-1 font-medium">{validationErrors.contactEmail}</p>
 )}

            <label className="block mt-4 mb-2 font-medium">
                {t('owner.newProperty.step3.phoneNumberLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="contactPhone"
              value={form.contactPhone}
              onChange={handleChange}
              placeholder="+966512345678"
              pattern="[+]?[0-9\s-]{9,15}"
              title="Please enter a valid phone number (9-15 digits, may include +, spaces, or dashes)"
              required
             className={`w-full border border-border-soft rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-surface-card transition-colors ${
 validationErrors.contactPhone
 ? 'border-red-500 bg-red-50'
 : ''
 }`}
 />
 {validationErrors.contactPhone && (
 <p className="text-red-600 text-sm mt-1 font-medium">{validationErrors.contactPhone}</p>
 )}

            <label className="block mt-4 mb-2 font-medium">
                {t('owner.newProperty.step3.saleTypeLabel')} <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label>
                <input
                  type="radio"
                  name="saleType"
                  value="SELL"
                  checked={form.saleType === "SELL"}
                  onChange={handleChange}
                />{" "}
                {t('owner.newProperty.step3.sellPropertyLabel')}
              </label>
              <label>
                <input
                  type="radio"
                  name="saleType"
                  value="LEASE"
                  checked={form.saleType === "LEASE"}
                  onChange={handleChange}
                />{" "}
                {t('owner.newProperty.step3.longTermLeaseLabel')}
              </label>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={prevStep}
                disabled={loading}
                className="px-6 py-3 text-text-muted border border-border-soft rounded-xl font-medium hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {i18n.dir() === 'rtl' ? '→' : '←'} {t('owner.newProperty.step3.backButtonLabel')}
              </button>
            <button
  type="submit"
  disabled={loading}
  className="px-8 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-lg hover:shadow-xl"
>
  {loading ? (
    <>
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {t('owner.newProperty.step3.submittingLabel')}
    </>
  ) : (
    t('owner.newProperty.step3.submitButtonLabel')
  )}
</button>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('owner.newProperty.step3.submittingLabel')}
                
                ) : (
                    {t('owner.newProperty.step3.submitButtonLabel')}
                )
              
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default OwnerNewProperty;
