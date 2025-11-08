import React, { useState } from 'react'
import { Users, Building2, DollarSign, Mail, Phone } from 'lucide-react'

export default function OwnerInvestors() {
  const [investors] = useState([
    {
      id: 1,
      name: 'Ahmed Al-Rashid',
      email: 'ahmed@example.com',
      phone: '+966 50 123 4567',
      property: 'Luxury Villa - Al Malqa',
      tokensOwned: 50,
      investment: 10000,
      returns: 920
    },
    {
      id: 2,
      name: 'Fatima Al-Harbi',
      email: 'fatima@example.com',
      phone: '+966 55 234 5678',
      property: 'Commercial Tower - King Fahd',
      tokensOwned: 100,
      investment: 20000,
      returns: 1560
    },
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Investor Insights</h1>
        <p className="text-gray-600 mt-1">View investors who have funded your properties</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border shadow-lg">
          <Users className="text-blue-600 mb-2" size={32} />
          <p className="text-sm text-gray-600">Total Investors</p>
          <h3 className="text-3xl font-bold text-gray-900">{investors.length}</h3>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border shadow-lg">
          <DollarSign className="text-emerald-600 mb-2" size={32} />
          <p className="text-sm text-gray-600">Total Investment</p>
          <h3 className="text-3xl font-bold text-gray-900">
            SAR {investors.reduce((sum, inv) => sum + inv.investment, 0).toLocaleString()}
          </h3>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border shadow-lg">
          <Building2 className="text-amber-600 mb-2" size={32} />
          <p className="text-sm text-gray-600">Avg Investment</p>
          <h3 className="text-3xl font-bold text-gray-900">
            SAR {(investors.reduce((sum, inv) => sum + inv.investment, 0) / investors.length).toLocaleString()}
          </h3>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-xl border shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Investor</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Property</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Investment</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Tokens</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Returns</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {investors.map((investor) => (
              <tr key={investor.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-semibold text-gray-900">{investor.name}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail size={12} />
                      {investor.email}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{investor.property}</td>
                <td className="px-6 py-4 font-semibold text-emerald-600">
                  SAR {investor.investment.toLocaleString()}
                </td>
                <td className="px-6 py-4 font-semibold text-blue-600">{investor.tokensOwned}</td>
                <td className="px-6 py-4 font-semibold text-purple-600">
                  SAR {investor.returns.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}