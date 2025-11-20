import React, { useState, useRef } from 'react'
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader } from 'lucide-react'
import { formatFileSize, authHeader } from '../lib/api'

export default function FileUpload({ 
  label, 
  labelAr,
  required = false,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSize = 10 * 1024 * 1024,
  value,
  onChange,
  documentType,
  disabled = false
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(value || '')
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > maxSize) {
      setError(`File too large. Maximum size is ${formatFileSize(maxSize)}`)
      return
    }

    const fileExt = '.' + file.name.split('.').pop().toLowerCase()
    const acceptedTypes = accept.split(',')
    if (!acceptedTypes.includes(fileExt)) {
      setError(`Invalid file type. Accepted: ${accept}`)
      return
    }

    setError('')
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType || 'document')

      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/properties/upload-document`, {
        method: 'POST',
        headers: authHeader(),
        body: formData
      })

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => setPreview(reader.result)
        reader.readAsDataURL(file)
      } else {
        setPreview(data.fileUrl)
      }

      onChange(data.fileUrl)
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload file. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview('')
    onChange('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isPDF = preview && (preview.endsWith('.pdf') || preview.includes('pdf'))
  const isImage = preview && !isPDF

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {labelAr && <span className="text-gray-500">/ {labelAr}</span>}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {!preview ? (
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer hover:border-emerald-500 hover:bg-emerald-50'
          } ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || uploading}
          />
          
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader className="animate-spin text-emerald-600" size={32} />
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="text-gray-400" size={32} />
              <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500">{accept.toUpperCase()} (Max {formatFileSize(maxSize)})</p>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <div className="flex items-start gap-3">
            {isImage ? (
              <img 
                src={preview.startsWith('data:') ? preview : `${import.meta.env.VITE_API_BASE}${preview}`}
                alt="Preview" 
                className="w-20 h-20 object-cover rounded"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center">
                <FileText className="text-gray-400" size={32} />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {isPDF ? 'Document uploaded' : 'Image uploaded'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle2 className="text-green-600 flex-shrink-0" size={16} />
                    <span className="text-xs text-green-600">Upload successful</span>
                  </div>
                </div>
                
                {!disabled && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X size={18} className="text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}