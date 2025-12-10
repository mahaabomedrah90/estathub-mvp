import React from 'react'
import { Building2, Users, FileText, Shield } from 'lucide-react'

function StatCard({ title, value, icon: Icon, accent }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-gray-500 tracking-wide uppercase">{title}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${accent}`}>
        <Icon className="text-white" size={22} />
      </div>
    </div>
  )
}

export default function RegulatorDashboard() {
  const stats = {
    totalProperties: 42,
    totalInvestors: 18,
    issuedDeeds: 27,
    tokenMints: 164,
  }

  const events = [
    {
      id: 1,
      type: 'Property Approved',
      property: 'Riyadh Smart Villas',
      investor: 'noura@investor.local',
      timestamp: '2025-11-20 14:32',
    },
    {
      id: 2,
      type: 'High-Value Investment Review',
      property: 'Jeddah Waterfront Tower',
      investor: 'mohammed@investor.local',
      timestamp: '2025-11-20 13:18',
    },
    {
      id: 3,
      type: 'Deed Issued',
      property: 'Kaauh Corporate Park',
      investor: 'corp@estathub.local',
      timestamp: '2025-11-19 09:47',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Regulatory Oversight Dashboard</h1>
        <p className="text-gray-600 text-sm">
          High-level oversight of listed properties, investors, tokenized deeds, and mint activity.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Total Properties Listed"
          value={stats.totalProperties}
          icon={Building2}
          accent="bg-purple-600"
        />
        <StatCard
          title="Total Investors"
          value={stats.totalInvestors}
          icon={Users}
          accent="bg-indigo-600"
        />
        <StatCard
          title="Total Issued Deeds"
          value={stats.issuedDeeds}
          icon={FileText}
          accent="bg-emerald-600"
        />
        <StatCard
          title="Total Token Mint Events"
          value={stats.tokenMints}
          icon={Shield}
          accent="bg-amber-600"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Latest Regulatory Events</h2>
            <p className="text-xs text-gray-500 mt-1">
              Recent approvals, reviews, and deed issuances across the platform.
            </p>
          </div>
        </div>
        <div className="px-6 py-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="py-2 pr-4">Event Type</th>
                <th className="py-2 pr-4">Property</th>
                <th className="py-2 pr-4">Investor</th>
                <th className="py-2 pr-4">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-4 text-gray-900 font-medium">{event.type}</td>
                  <td className="py-2 pr-4 text-gray-700">{event.property}</td>
                  <td className="py-2 pr-4 text-gray-700">{event.investor}</td>
                  <td className="py-2 pr-4 text-gray-500 text-xs">{event.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}