import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Building2,
  Shield,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import {
  getRegulatorProperties,
  getRegulatorLedger,
  getRegulatorAMLAlerts,
} from '../../lib/api'

export default function RegOverview() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [properties, setProperties] = useState([])
  const [ledger, setLedger] = useState([])
  const [alerts, setAlerts] = useState({ high: [], medium: [], low: [] })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError('')
      const [props, ledg, aml] = await Promise.all([
        getRegulatorProperties({ status: 'PENDING' }),
        getRegulatorLedger({}),
        getRegulatorAMLAlerts(),
      ])
      setProperties(Array.isArray(props) ? props : [])
      setLedger(Array.isArray(ledg) ? ledg : [])
      setAlerts({
        high: aml?.high || [],
        medium: aml?.medium || [],
        low: aml?.low || [],
      })
    } catch (e) {
      console.error('Regulator overview error:', e)
      setError(e.message || 'Failed to load regulatory overview')
    } finally {
      setLoading(false)
    }
  }

  const pendingCount = properties.filter((p) => p.status === 'PENDING').length
  const approvedCount = properties.filter((p) => p.status === 'APPROVED').length
  const rejectedCount = properties.filter((p) => p.status === 'REJECTED').length
  const totalAlerts =
    (alerts.high?.length || 0) +
    (alerts.medium?.length || 0) +
    (alerts.low?.length || 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-purple-600 mx-auto" size={40} />
          <div className="text-gray-600">Loading regulator overview...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
        <AlertTriangle className="text-red-600" size={20} />
        <span className="text-red-700">{error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="text-sm text-gray-500 flex items-center gap-2">
        <span className="cursor-pointer hover:text-gray-700" onClick={() => navigate('/regulator/overview')}>
          Regulator
        </span>
        <span>/</span>
        <span className="text-gray-900 font-medium">Overview</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-purple-600" size={28} />
            Regulatory Overview
          </h1>
          <p className="text-gray-600">
            Monitor platform compliance, property approvals, and AML signals.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Pending Reviews"
          value={pendingCount}
          icon={Clock}
          bg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Approved Properties"
          value={approvedCount}
          icon={CheckCircle2}
          bg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Rejected Properties"
          value={rejectedCount}
          icon={AlertTriangle}
          bg="bg-red-50"
          iconColor="text-red-600"
        />
        <StatCard
          title="Open AML Alerts"
          value={totalAlerts}
          icon={Shield}
          bg="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* Pending properties table (short) */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="text-purple-600" size={20} />
              Pending Property Approvals
            </h2>
            <p className="text-sm text-gray-600">
              {pendingCount} properties awaiting regulatory decision.
            </p>
          </div>
          <button
            onClick={() => navigate('/regulator/properties')}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            View all →
          </button>
        </div>
        {pendingCount === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={32} />
            <div className="text-gray-600">No pending properties at the moment.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-700">Title</th>
                  <th className="text-left py-2 px-3 text-gray-700">Owner</th>
                  <th className="text-left py-2 px-3 text-gray-700">Submitted</th>
                  <th className="text-left py-2 px-3 text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {properties.slice(0, 5).map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/regulator/properties/${p.id}`)}
                  >
                    <td className="py-2 px-3">{p.title}</td>
                    <td className="py-2 px-3 text-gray-600">{p.ownerName || 'N/A'}</td>
                    <td className="py-2 px-3 text-gray-600">
                      {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-2 px-3">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AML alerts summary */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="text-purple-600" size={20} />
              AML Alerts Snapshot
            </h2>
            <p className="text-sm text-gray-600">
              High: {alerts.high.length} · Medium: {alerts.medium.length} · Low:{' '}
              {alerts.low.length}
            </p>
          </div>
          <button
            onClick={() => navigate('/regulator/aml-alerts')}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            View alerts →
          </button>
        </div>
        {totalAlerts === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <Shield className="mx-auto text-gray-400 mb-2" size={32} />
            <div className="text-gray-600">No AML alerts currently raised.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <AlertColumn title="High Severity" color="red" items={alerts.high} />
            <AlertColumn title="Medium Severity" color="amber" items={alerts.medium} />
            <AlertColumn title="Low Severity" color="emerald" items={alerts.low} />
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, bg, iconColor }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-white/20 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`${bg} p-3 rounded-xl`}>
          <Icon className={iconColor} size={22} />
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

function AlertColumn({ title, color, items }) {
  const colorMap = {
    red: 'text-red-700 bg-red-50',
    amber: 'text-amber-700 bg-amber-50',
    emerald: 'text-emerald-700 bg-emerald-50',
  }
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      {items.length === 0 ? (
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          No alerts in this category.
        </div>
      ) : (
        items.slice(0, 4).map((a) => (
          <div
            key={a.id}
            className={`rounded-lg px-3 py-2 text-xs ${colorMap[color]}`}
          >
            <div className="font-medium">{a.message}</div>
            {a.userEmail && (
              <div className="text-[11px] text-gray-600 mt-1">
                {a.userEmail} · {a.propertyTitle || a.propertyId || ''}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}