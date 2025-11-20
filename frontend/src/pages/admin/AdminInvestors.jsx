import React, { useState, useEffect } from 'react'
import { 
  Users, Building2, DollarSign, Mail, Phone, TrendingUp, TrendingDown, 
  Activity, Target, Calendar, Award, AlertCircle, CheckCircle, Eye
} from 'lucide-react'
import { authHeader, fetchJson, getToken } from '../../lib/api'

export default function OwnerInvestors() {
  const [loading, setLoading] = useState(true)
  const [investors, setInvestors] = useState([])
  const [selectedInvestor, setSelectedInvestor] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [analytics, setAnalytics] = useState({
    totalInvestors: 0,
    totalInvestment: 0,
    totalReturns: 0,
    avgInvestment: 0,
    profitableInvestors: 0,
    avgROI: 0
  })

  useEffect(() => {
    loadInvestorData()
  }, [])

  const loadInvestorData = async () => {
    try {
      setLoading(true)
      
     // Fetch investors directly from the dedicated endpoint
 const investorsData = await fetchJson('/api/orders/investors', { headers: authHeader() })
 const investors = Array.isArray(investorsData) ? investorsData : []
 console.log('✅ Loaded investor data:', investors.length, 'investors')
 setInvestors(investors)
      
      // Calculate analytics
      calculateAnalytics(investors)
    } catch (error) {
      console.error('Failed to load investor data:', error)
      // Set empty state for real data
      setInvestors([])
      calculateAnalytics([])
    } finally {
      setLoading(false)
    }
  }

  const processInvestorData = async (users, properties, investments) => {
    // In a real implementation, this would integrate with blockchain
    // to get token holdings, returns, and transaction history
    
    // Group investments by user
 const investmentsByUser = {}
 investments.forEach(inv => {
 if (!investmentsByUser[inv.userId]) {
 investmentsByUser[inv.userId] = []
 }
 investmentsByUser[inv.userId].push(inv)
 })
 return Object.keys(investmentsByUser).map(userId => {
 const userInvestments = investmentsByUser[userId]
 const firstInvestment = userInvestments[0]
 const user = firstInvestment?.user || {}
      const totalInvestment = userInvestments.reduce((sum, inv) => sum + inv.amount, 0)
      const totalReturns = userInvestments.reduce((sum, inv) => sum + (inv.returns || 0), 0)
      const totalTokens = userInvestments.reduce((sum, inv) => sum + (inv.tokens || 0), 0)
      const propertiesCount = userInvestments.length
      const roi = totalInvestment > 0 ? ((totalReturns / totalInvestment) * 100) : 0
      
      return {
        id: user.id || userId,
        name: user.name || 'Unknown Investor',
        email: user.email,
        phone: user.phone || '+966 XX XXX XXXX',
        avatar: user.avatar,
        joinDate: user.createdAt || new Date().toISOString(),
        status: user.status || 'active',
        verificationStatus: user.verified || false,
        
        // Investment metrics
        totalInvestment,
        totalReturns,
        totalTokens,
        propertiesCount,
        roi,
        profitMargin: totalInvestment > 0 ? ((totalReturns - totalInvestment) / totalInvestment * 100) : 0,
        
        // Portfolio details
        portfolio: userInvestments.map(inv => {
const property = inv.property || {}
          return {
            propertyId: inv.propertyId,
            propertyName: property?.title || 'Unknown Property',
            propertyType: property?.type || 'Residential',
            location: property?.location || 'Riyadh, Saudi Arabia',
            investment: inv.amount,
            tokens: inv.tokens || Math.floor(inv.amount / 200),
            returns: inv.returns || Math.floor(inv.amount * 0.092),
            investmentDate: inv.createdAt || new Date().toISOString(),
            expectedReturns: inv.expectedReturns || Math.floor(inv.amount * 0.12),
            performance: calculatePropertyPerformance(inv)
          }
        }),
        
        // Risk and performance metrics
        riskLevel: calculateRiskLevel(userInvestments),
        performanceScore: calculatePerformanceScore(userInvestments),
        lastActive: user.lastActive || new Date().toISOString(),
        
        // Blockchain data (mock for demo)
        walletAddress: user.walletAddress || `0x${Math.random().toString(16).substr(2, 40)}`,
        transactionCount: userInvestments.length * 2,
        smartContractInteractions: userInvestments.length
      }
    }).filter(investor => investor.totalInvestment > 0)
  }

  const calculatePropertyPerformance = (investment) => {
    const returns = investment.returns || Math.floor(investment.amount * 0.092)
    const expectedReturns = investment.expectedReturns || Math.floor(investment.amount * 0.12)
    const performance = (returns / expectedReturns) * 100
    
    if (performance >= 100) return 'excellent'
    if (performance >= 80) return 'good'
    if (performance >= 60) return 'average'
    return 'poor'
  }

  const calculateRiskLevel = (investments) => {
    if (investments.length === 0) return 'low'
    if (investments.length === 1) return 'medium'
    if (investments.length <= 3) return 'medium'
    return 'low' // Diversified portfolio
  }

  const calculatePerformanceScore = (investments) => {
    if (investments.length === 0) return 0
    
    const totalROI = investments.reduce((sum, inv) => {
      const returns = inv.returns || Math.floor(inv.amount * 0.092)
      return sum + (returns / inv.amount) * 100
    }, 0)
    
    return Math.round(totalROI / investments.length)
  }

  const calculateAnalytics = (investorData) => {
    const totalInvestors = investorData.length
    const totalInvestment = investorData.reduce((sum, inv) => sum + inv.totalInvestment, 0)
    const totalReturns = investorData.reduce((sum, inv) => sum + inv.totalReturns, 0)
    const avgInvestment = totalInvestors > 0 ? totalInvestment / totalInvestors : 0
    const profitableInvestors = investorData.filter(inv => inv.totalReturns > inv.totalInvestment).length
    const avgROI = totalInvestment > 0 ? (totalReturns / totalInvestment) * 100 : 0
    
    setAnalytics({
      totalInvestors,
      totalInvestment,
      totalReturns,
      avgInvestment,
      profitableInvestors,
      avgROI
    })
  }

  const generateMockInvestorData = () => {
    return [
      {
        id: 1,
        name: 'Ahmed Al-Rashid',
        email: 'ahmed@example.com',
        phone: '+966 50 123 4567',
        avatar: null,
        joinDate: '2024-01-15T10:30:00Z',
        status: 'active',
        verificationStatus: true,
        totalInvestment: 10000,
        totalReturns: 11500,
        totalTokens: 50,
        propertiesCount: 1,
        roi: 15.0,
        profitMargin: 15.0,
        portfolio: [
          {
            propertyId: 1,
            propertyName: 'Luxury Villa - Al Malqa',
            propertyType: 'Residential',
            location: 'Riyadh, Saudi Arabia',
            investment: 10000,
            tokens: 50,
            returns: 11500,
            investmentDate: '2024-01-20T14:00:00Z',
            expectedReturns: 12000,
            performance: 'good'
          }
        ],
        riskLevel: 'medium',
        performanceScore: 85,
        lastActive: '2024-11-18T09:15:00Z',
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b',
        transactionCount: 2,
        smartContractInteractions: 1
      },
      {
        id: 2,
        name: 'Fatima Al-Harbi',
        email: 'fatima@example.com',
        phone: '+966 55 234 5678',
        avatar: null,
        joinDate: '2024-02-10T16:45:00Z',
        status: 'active',
        verificationStatus: true,
        totalInvestment: 35000,
        totalReturns: 42000,
        totalTokens: 175,
        propertiesCount: 2,
        roi: 20.0,
        profitMargin: 20.0,
        portfolio: [
          {
            propertyId: 2,
            propertyName: 'Commercial Tower - King Fahd',
            propertyType: 'Commercial',
            location: 'Riyadh, Saudi Arabia',
            investment: 20000,
            tokens: 100,
            returns: 24000,
            investmentDate: '2024-02-15T11:30:00Z',
            expectedReturns: 24000,
            performance: 'excellent'
          },
          {
            propertyId: 3,
            propertyName: 'Apartments Complex - Olaya',
            propertyType: 'Residential',
            location: 'Riyadh, Saudi Arabia',
            investment: 15000,
            tokens: 75,
            returns: 18000,
            investmentDate: '2024-03-10T09:00:00Z',
            expectedReturns: 18000,
            performance: 'excellent'
          }
        ],
        riskLevel: 'low',
        performanceScore: 90,
        lastActive: '2024-11-17T14:20:00Z',
        walletAddress: '0x8ba1f109551bD432803012645Hac136c',
        transactionCount: 4,
        smartContractInteractions: 2
      },
      {
        id: 3,
        name: 'Khalid Al-Omar',
        email: 'khalid@example.com',
        phone: '+966 51 345 6789',
        avatar: null,
        joinDate: '2024-03-05T12:00:00Z',
        status: 'active',
        verificationStatus: false,
        totalInvestment: 25000,
        totalReturns: 26500,
        totalTokens: 125,
        propertiesCount: 1,
        roi: 6.0,
        profitMargin: 6.0,
        portfolio: [
          {
            propertyId: 4,
            propertyName: 'Retail Center - Granada',
            propertyType: 'Commercial',
            location: 'Riyadh, Saudi Arabia',
            investment: 25000,
            tokens: 125,
            returns: 26500,
            investmentDate: '2024-03-10T15:45:00Z',
            expectedReturns: 30000,
            performance: 'average'
          }
        ],
        riskLevel: 'medium',
        performanceScore: 65,
        lastActive: '2024-11-16T10:30:00Z',
        walletAddress: '0x9d1f2E3D4a5B6c7D8e9F0a1B2c3D4e5F6a7B8c9',
        transactionCount: 2,
        smartContractInteractions: 1
      }
    ]
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getProfitabilityStatus = (roi) => {
    if (roi >= 15) return { status: 'excellent', color: 'text-emerald-600', icon: TrendingUp }
    if (roi >= 10) return { status: 'good', color: 'text-green-600', icon: TrendingUp }
    if (roi >= 5) return { status: 'average', color: 'text-yellow-600', icon: Activity }
    return { status: 'poor', color: 'text-red-600', icon: TrendingDown }
  }

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'high': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (!getToken()) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <AlertCircle className="mx-auto text-gray-400" size={64} />
          <div className="text-gray-600">Please login as admin to view investor insights.</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Activity className="animate-spin text-blue-600 mx-auto" size={40} />
          <div className="text-gray-600">Loading investor data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Investor Insights</h1>
        <p className="text-gray-600 mt-1">Comprehensive analysis of investor performance and portfolio health</p>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg p-4 border shadow">
          <Users className="text-blue-600 mb-2" size={20} />
          <p className="text-xs text-gray-600">Total Investors</p>
          <h3 className="text-xl font-bold text-gray-900">{analytics.totalInvestors}</h3>
        </div>
        <div className="bg-white rounded-lg p-4 border shadow">
          <DollarSign className="text-emerald-600 mb-2" size={20} />
          <p className="text-xs text-gray-600">Total Investment</p>
          <h3 className="text-xl font-bold text-gray-900">{formatCurrency(analytics.totalInvestment)}</h3>
        </div>
        <div className="bg-white rounded-lg p-4 border shadow">
          <TrendingUp className="text-purple-600 mb-2" size={20} />
          <p className="text-xs text-gray-600">Total Returns</p>
          <h3 className="text-xl font-bold text-gray-900">{formatCurrency(analytics.totalReturns)}</h3>
        </div>
        <div className="bg-white rounded-lg p-4 border shadow">
          <Activity className="text-amber-600 mb-2" size={20} />
          <p className="text-xs text-gray-600">Avg Investment</p>
          <h3 className="text-xl font-bold text-gray-900">{formatCurrency(analytics.avgInvestment)}</h3>
        </div>
        <div className="bg-white rounded-lg p-4 border shadow">
          <Target className="text-green-600 mb-2" size={20} />
          <p className="text-xs text-gray-600">Profitable Investors</p>
          <h3 className="text-xl font-bold text-gray-900">{analytics.profitableInvestors}</h3>
        </div>
        <div className="bg-white rounded-lg p-4 border shadow">
          <Award className="text-indigo-600 mb-2" size={20} />
          <p className="text-xs text-gray-600">Avg ROI</p>
          <h3 className="text-xl font-bold text-gray-900">{analytics.avgROI.toFixed(1)}%</h3>
        </div>
      </div>

      {/* Investors Table */}
      <div className="bg-white rounded-lg border shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Investor Portfolio Analysis</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Investor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Properties</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total Investment</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total Returns</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ROI</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Risk Level</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Performance</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {investors.map((investor) => {
                const profitability = getProfitabilityStatus(investor.roi)
                const ProfitIcon = profitability.icon
                
                return (
                  <tr key={investor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                          <span className="text-emerald-600 font-semibold text-sm">
                            {investor.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <div className="font-semibold text-gray-900">{investor.name}</div>
                            {investor.verificationStatus && (
                              <CheckCircle className="text-blue-500" size={14} />
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail size={12} />
                            {investor.email}
                          </div>
                          <div className="text-xs text-gray-400">
                            Joined {formatDate(investor.joinDate)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {investor.propertiesCount} Properties
                        </div>
                        <div className="text-xs text-gray-500">
                          {investor.totalTokens} Tokens
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-emerald-600">
                        {formatCurrency(investor.totalInvestment)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-purple-600">
                        {formatCurrency(investor.totalReturns)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        <ProfitIcon size={16} className={profitability.color} />
                        <span className={`font-medium ${profitability.color}`}>
                          {investor.roi.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {profitability.status}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(investor.riskLevel)}`}>
                        {investor.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1">
                          <div className="text-sm font-medium text-gray-900">
                            {investor.performanceScore}/100
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              investor.performanceScore >= 80 ? 'bg-emerald-600' :
                              investor.performanceScore >= 60 ? 'bg-blue-600' :
                              investor.performanceScore >= 40 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${investor.performanceScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedInvestor(investor)
                          setShowDetails(true)
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                      >
                        <Eye size={14} />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Investor Details Modal */}
      {showDetails && selectedInvestor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <span className="text-emerald-600 font-semibold text-lg">
                      {selectedInvestor.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedInvestor.name}</h3>
                    <p className="text-sm text-gray-500">{selectedInvestor.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600">Total Investment</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(selectedInvestor.totalInvestment)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600">Total Returns</p>
                  <p className="text-lg font-semibold text-purple-600">
                    {formatCurrency(selectedInvestor.totalReturns)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600">ROI</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {selectedInvestor.roi.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600">Properties</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {selectedInvestor.propertiesCount}
                  </p>
                </div>
              </div>

              {/* Portfolio Details */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Portfolio Details</h4>
                <div className="space-y-3">
                  {selectedInvestor.portfolio.map((property, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div>
                            <h5 className="font-medium text-gray-900">{property.propertyName}</h5>
                            <p className="text-sm text-gray-500">{property.location}</p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Investment</p>
                              <p className="font-medium text-emerald-600">
                                {formatCurrency(property.investment)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Returns</p>
                              <p className="font-medium text-purple-600">
                                {formatCurrency(property.returns)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Tokens</p>
                              <p className="font-medium text-blue-600">{property.tokens}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Performance</p>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                property.performance === 'excellent' ? 'bg-emerald-50 text-emerald-600' :
                                property.performance === 'good' ? 'bg-green-50 text-green-600' :
                                property.performance === 'average' ? 'bg-yellow-50 text-yellow-600' :
                                'bg-red-50 text-red-600'
                              }`}>
                                {property.performance}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blockchain Info */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Blockchain Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Wallet Address:</span>
                    <span className="font-mono text-gray-900">{selectedInvestor.walletAddress}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Transaction Count:</span>
                    <span className="font-medium text-gray-900">{selectedInvestor.transactionCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Smart Contract Interactions:</span>
                    <span className="font-medium text-gray-900">{selectedInvestor.smartContractInteractions}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}