import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Building2,
  ArrowLeft,
  MapPin,
  Users,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { getRegulatorProperty } from '../../lib/api'

export default function RegPropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    try {
      setLoading(true)
      setError('')
      const resp = await getRegulatorProperty(id)
      setData(resp)
    } catch (e) {
      console.error('Regulator property detail error:', e)
      setError(e.message || 'Failed to load property details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-purple-600 mx-auto" size={40} />
          <div className="text-gray-600">Loading property details...</div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/regulator/properties')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Properties
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertTriangle className="text-red-600" size={20} />
          <span className="text-red-700">{error || 'Property not found'}</span>
        </div>
      </div>
    )
  }

  const { property, ownership = [] } = data

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="text-sm text-gray-500 flex items-center gap-2">
        <span
          className="cursor-pointer hover:text-gray-700"
          onClick={() => navigate('/regulator/overview')}
        >
          Regulator
        </span>
        <span>/</span>
        <span
          className="cursor-pointer hover:text-gray-700"
          onClick={() => navigate('/regulator/properties')}
        >
          Properties
        </span>
        <span>/</span>
        <span className="text-gray-900 font-medium">Property Detail</span>
      </div>

      <button
        onClick={() => navigate('/regulator/properties')}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={16} />
        Back to Properties
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="h-56 bg-gray-100 flex items-center justify-center relative">
          {property.imageUrl ? (
            <img
              src={property.imageUrl}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Building2 className="text-purple-300" size={80} />
          )}
        </div>
        <div className="p-6 space-y-3">
          <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <span>
                {property.location ||
                  [property.city, property.district, property.municipality]
                    .filter(Boolean)
                    .join(', ') ||
                  'Location not specified'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>Owner: {property.ownerName || 'N/A'}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <InfoPill label="Status" value={<StatusBadge status={property.status} />} />
            <InfoPill
              label="Total Tokens"
              value={property.totalTokens?.toLocaleString() || '-'}
            />
            <InfoPill
              label="Remaining Tokens"
              value={property.remainingTokens?.toLocaleString() || '-'}
            />
            <InfoPill
              label="Token Price"
              value={
                property.tokenPrice
                  ? `${property.tokenPrice.toLocaleString()} SAR`
                  : '-'
              }
            />
            <InfoPill label="Deed Number" value={property.deedNumber || '-'} />
          </div>
        </div>
      </div>

      {/* Description & ownership */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Property Description
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              {property.description || 'No description provided.'}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Legal & Municipal Data
            </h2>
            <dl className="grid md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Row label="Municipality" value={property.municipality || '-'} />
              <Row label="District" value={property.district || '-'} />
              <Row label="City" value={property.city || '-'} />
            </dl>
          </div>
        </div>

        <div className="md:col-span-1 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="text-purple-600" size={18} />
            Ownership Breakdown
          </h2>
          {ownership.length === 0 ? (
            <p className="text-sm text-gray-600">
              No investors yet for this property.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {ownership.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {o.userName}
                    </div>
                    <div className="text-xs text-gray-500">{o.userEmail}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-purple-700">
                      {o.ownershipPct}%</div>
                    <div className="text-xs text-gray-500">
                      {o.tokens.toLocaleString()} tokens
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const s = status || 'PENDING'
  const base =
    s === 'APPROVED'
      ? 'bg-emerald-100 text-emerald-700'
      : s === 'REJECTED'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700'
  const label =
    s === 'APPROVED'
      ? 'Approved'
      : s === 'REJECTED'
      ? 'Rejected'
      : 'Under Review'
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${base}`}>
      {label}
    </span>
  )
}

function InfoPill({ label, value }) {
  return (
    <div className="inline-flex flex-col px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 font-medium">{value}</dd>
    </div>
  )
}