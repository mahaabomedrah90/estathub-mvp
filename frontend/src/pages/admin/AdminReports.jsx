import React, { useState, useEffect } from 'react'
import { 
  Users, TrendingUp, DollarSign, Activity, ArrowUp, ArrowDown, 
  Calendar, BarChart3, PieChart, Target, AlertCircle, CheckCircle, Clock 
} from 'lucide-react'
import { authHeader, fetchJson, getToken } from '../../lib/api'
import { useTranslation } from 'react-i18next'

export default function AdminReports()  {
  const { t, i18n } = useTranslation('pages')
  const isArabic = i18n.language === 'ar'
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [data, setData] = useState({
    overview: {
      totalProperties: 0,
      totalInvestors: 0,
      totalVolume: 0,
      activeProperties: 0,
      pendingApprovals: 0
    },
    growth: {
      newInvestors: 0,
      investorGrowthRate: 0,
      monthlyRevenue: 0,
      revenueGrowth: 0,
      propertyListings: 0,
      listingGrowth: 0
    },
    customerInsights: {
      topInvestors: [],
      averageInvestment: 0,
      retentionRate: 0,
      churnRate: 0
    },
    performance: {
      approvalRate: 0,
      averageTimeToApprove: 0,
      fundedProperties: 0,
      totalFundingRate: 0
    },
    // Customer segments data
    customerSegments: [
    
  {
    name: t('admin.reports.segments.micro'),
    icon: DollarSign,
    count: 0,
    percentage: 0,
    avgInvestment: 0,
    totalValue: 0,
    minInvestment: 0,
    maxInvestment: 10000,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    // Get all characteristics as an array
    characteristics: t('admin.reports.segments.microCharacteristics', { returnObjects: true })
  },
  {
    name: t('admin.reports.segments.growth'),
    icon: TrendingUp,
    count: 0,
    percentage: 0,
    avgInvestment: 0,
    totalValue: 0,
    minInvestment: 10001,
    maxInvestment: 100000,
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600',
    characteristics: t('admin.reports.segments.growthCharacteristics', { returnObjects: true })
  },
  {
    name: t('admin.reports.segments.whale'),
    icon: Target,
    count: 0,
    percentage: 0,
    avgInvestment: 0,
    totalValue: 0,
    minInvestment: 100001,
    maxInvestment: 1000000,
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
    characteristics: t('admin.reports.segments.whaleCharacteristics', { returnObjects: true })
  }
  ]
    
  ,
    behaviorAnalysis: {
      oneTimeInvestors: 35,
      repeatInvestors: 45,
      highFrequencyInvestors: 12,
      longTermHolders: 8
    }
  })

  useEffect(() => {
    loadReportsData()
  }, [timeRange])

  async function loadReportsData() {
    try {
      setLoading(true)
      
      if (!getToken()) {
        return
      }

      // Fetch properties and users data
      const [propertiesData, usersData] = await Promise.all([
        fetchJson('/api/properties', { headers: { ...authHeader() } }),
        fetchJson('/api/users', { headers: { ...authHeader() } }).catch(() => [])
      ])
      
      const properties = Array.isArray(propertiesData) ? propertiesData : []
      const users = Array.isArray(usersData) ? usersData : []
      
      // Calculate overview metrics
      const approvedProperties = properties.filter(p => p.status === 'APPROVED')
      const pendingProperties = properties.filter(p => p.status === 'PENDING')
      const totalVolume = approvedProperties.reduce((sum, p) => {
        const raised = (p.totalTokens - (p.remainingTokens || 0)) * (p.tokenPrice || 0)
        return sum + raised
      }, 0)

      // Calculate growth metrics (mock data for demo)
      const newInvestorsThisMonth = Math.floor(users.length * 0.15)
      const investorGrowthRate = 12.5
      const monthlyRevenue = totalVolume * 0.05 // 5% platform fee
      
      // Calculate customer insights
      const investorsWithInvestments = users
 .slice(0, 8)
       
        .map(user => ({
          name: user.name || 'Investor',
          email: user.email,
          totalInvested: Math.floor(Math.random() * 500000) + 10000,
          properties: Math.floor(Math.random() * 8) + 1,
          investmentFrequency: Math.random() > 0.5 ? 'repeat' : 'one-time'
        }))
        .sort((a, b) => b.totalInvested - a.totalInvested)

      // Calculate customer segments
      const segmentData = data.customerSegments

      setData({
        overview: {
          totalProperties: properties.length,
          totalInvestors: users.length,
          totalVolume: totalVolume,
          activeProperties: approvedProperties.length,
          pendingApprovals: pendingProperties.length
        },
        growth: {
          newInvestors: newInvestorsThisMonth,
          investorGrowthRate: investorGrowthRate,
          monthlyRevenue: monthlyRevenue,
          revenueGrowth: 18.3,
          propertyListings: properties.length,
          listingGrowth: 8.7
        },
        customerInsights: {
          topInvestors: investorsWithInvestments.slice(0, 5),
          averageInvestment: users.length > 0 ? Math.floor(totalVolume / users.length) : 0,
          retentionRate: 85.6,
          churnRate: 4.2
        },
        performance: {
          approvalRate: properties.length > 0 ? (approvedProperties.length / properties.length) * 100 : 0,
          averageTimeToApprove: 2.4, // days
          fundedProperties: approvedProperties.filter(p => (p.totalTokens - (p.remainingTokens || 0)) > 0).length,
          totalFundingRate: approvedProperties.length > 0 ? 
            (approvedProperties.filter(p => (p.totalTokens - (p.remainingTokens || 0)) > 0).length / approvedProperties.length) * 100 : 0
        },
        customerSegments: segmentData,
        behaviorAnalysis: {
          oneTimeInvestors: 35,
          repeatInvestors: 45,
          highFrequencyInvestors: 12,
          longTermHolders: 8
        }
      })
    } catch (err) {
      console.error('Failed to load reports data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const MetricCard = ({ title, value, change, icon: Icon, color = 'blue' }) => {
    const isPositive = change > 0
    const colorClasses = {
      blue: 'bg-[#1E1958] text-white',
      green: 'bg-[#41EAD4] text-white',
      purple: 'bg-[#986F9A] text-white',
      orange: 'bg-[#ED9072] text-white',
      coral: 'bg-gradient-to-br from-[#ED9072] to-[#EC8B5C] text-white'
    }

    const bgClasses = {
      blue: 'bg-[#1E1958]/5 border-[#1E1958]/20',
      green: 'bg-[#41EAD4]/5 border-[#41EAD4]/20',
      purple: 'bg-[#986F9A]/5 border-[#986F9A]/20',
      orange: 'bg-[#ED9072]/5 border-[#ED9072]/20',
      coral: 'bg-[#ED9072]/5 border-[#ED9072]/20'
    }

    return (
      <div className={`bg-white rounded-2xl border-2 ${bgClasses[color]} shadow-sm hover:shadow-md transition-all p-8`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
            <p className="text-3xl font-bold text-[#1E1958] mb-3">{value}</p>
            {change !== undefined && (
              <div className="flex items-center">
                {isPositive ? (
                  <ArrowUp className="w-4 h-4 text-[#41EAD4] mr-1" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-[#ED9072] mr-1" />
                )}
                <span className={`text-sm font-medium ${isPositive ? 'text-[#41EAD4]' : 'text-[#ED9072]'}`}>
                  {Math.abs(change)}%
                </span>
              </div>
            )}
          </div>
          <div className={`${colorClasses[color]} p-4 rounded-2xl shadow-lg`}>
            <Icon size={24} />
          </div>
        </div>
      </div>
    )
  }

  if (!getToken()) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <AlertCircle className="mx-auto text-gray-400" size={64} />
          <div className="text-gray-600">{t('admin.reports.loginRequired')}</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Activity className="animate-spin text-blue-600 mx-auto" size={40} />
          <div className="text-gray-600">{t('admin.reports.loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[#1E1958] mb-3">{t('admin.reports.headerTitle')}</h1>
            <p className="text-lg text-gray-600 max-w-2xl">
              {t('admin.reports.headerSubtitle')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-6 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#41EAD4] focus:border-[#41EAD4] bg-white text-gray-900 font-medium transition-all"
            >
              <option value="7d">{t('admin.reports.timeRange.7d')}</option>
              <option value="30d">{t('admin.reports.timeRange.30d')}</option>
              <option value="90d">{t('admin.reports.timeRange.90d')}</option>
              <option value="1y">{t('admin.reports.timeRange.1y')}</option>
            </select>
            <div className="p-3 bg-[#1E1958]/10 rounded-xl">
              <Calendar className="text-[#1E1958]" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Key Overview Metrics */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-[#1E1958] mb-6">{t('admin.reports.sections.platformOverview')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard
            title={t('admin.reports.overview.totalProperties')}
            value={data.overview.totalProperties}
            icon={BarChart3}
            color="purple"
          />
          <MetricCard
            title={t('admin.reports.overview.totalInvestors')}
            value={data.overview.totalInvestors}
            change={data.growth.investorGrowthRate}
            icon={Users}
            color="blue"
          />
          <MetricCard
            title={t('admin.reports.overview.totalVolume')}
            value={formatCurrency(data.overview.totalVolume)}
            change={data.growth.revenueGrowth}
            icon={DollarSign}
            color="green"
          />
          <MetricCard
            title={t('admin.reports.overview.activeProperties')}
            value={data.overview.activeProperties}
            icon={CheckCircle}
            color="green"
          />
          <MetricCard
            title={t('admin.reports.overview.pendingApprovals')}
            value={data.overview.pendingApprovals}
            icon={AlertCircle}
            color="orange"
          />
        </div>
      </div>

      {/* Growth Metrics */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-[#1E1958] mb-6">{t('admin.reports.sections.growthMetrics')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title={t('admin.reports.growth.newInvestors')}
            value={data.growth.newInvestors}
            change={data.growth.investorGrowthRate}
            icon={TrendingUp}
            color="purple"
          />
          <MetricCard
            title={t('admin.reports.growth.monthlyRevenue')}
            value={formatCurrency(data.growth.monthlyRevenue)}
            change={data.growth.revenueGrowth}
            icon={DollarSign}
            color="coral"
          />
          <MetricCard
            title={t('admin.reports.growth.newListings')}
            value={data.growth.propertyListings}
            change={data.growth.listingGrowth}
            icon={BarChart3}
            color="blue"
          />
        </div>
      </div>

      {/* Customer Segmentation */}
      <div className="mb-12">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-[#1E1958] mb-6">{t('admin.reports.sections.customerSegmentation')}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {data.customerSegments.map((segment, index) => {
                const SegmentIcon = segment.icon
                const segmentColors = {
                  0: 'bg-[#41EAD4]/10 border-[#41EAD4]/30',
                  1: 'bg-[#986F9A]/10 border-[#986F9A]/30', 
                  2: 'bg-[#ED9072]/10 border-[#ED9072]/30'
                }
                const iconColors = {
                  0: 'text-[#41EAD4]',
                  1: 'text-[#986F9A]',
                  2: 'text-[#ED9072]'
                }
                
                return (
                  <div key={index} className={`border-2 rounded-2xl p-6 hover:shadow-md transition-all ${segmentColors[index]}`}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-[#1E1958]">{segment.name}</h3>
                      <div className={`p-3 rounded-xl bg-white shadow-sm`}>
                        <SegmentIcon className={iconColors[index]} size={24} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 font-medium">{t('admin.reports.segments.customers')}</span>
                        <span className="text-2xl font-bold text-[#1E1958]">{segment.count}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 font-medium">{t('admin.reports.segments.avgInvestment')}</span>
                        <span className="text-lg font-semibold text-gray-900">{formatCurrency(segment.avgInvestment)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 font-medium">{t('admin.reports.segments.totalValue')}</span>
                        <span className="text-lg font-semibold text-gray-900">{formatCurrency(segment.totalValue)}</span>
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-3">{t('admin.reports.segments.characteristics')}</p>
                      <ul className="text-sm text-gray-600 space-y-2">
                        {segment.characteristics.map((char, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-gray-400 mt-1">•</span>
                            <span>{char}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Customer Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-8">
            <h3 className="text-2xl font-bold text-[#1E1958] mb-6">{t('admin.reports.sections.investmentBehavior')}</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center p-4 bg-[#ED9072]/5 rounded-xl">
                <span className="text-sm font-medium text-gray-700">{t('admin.reports.behavior.oneTime')}</span>
                <span className="text-xl font-bold text-[#ED9072]">{data.behaviorAnalysis.oneTimeInvestors}%</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-[#41EAD4]/5 rounded-xl">
                <span className="text-sm font-medium text-gray-700">{t('admin.reports.behavior.repeat')}</span>
                <span className="text-xl font-bold text-[#41EAD4]">{data.behaviorAnalysis.repeatInvestors}%</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-[#1E1958]/5 rounded-xl">
                <span className="text-sm font-medium text-gray-700">{t('admin.reports.behavior.highFrequency')}</span>
                <span className="text-xl font-bold text-[#1E1958]">{data.behaviorAnalysis.highFrequencyInvestors}%</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-[#986F9A]/5 rounded-xl">
                <span className="text-sm font-medium text-gray-700">{t('admin.reports.behavior.longTerm')}</span>
                <span className="text-xl font-bold text-[#986F9A]">{data.behaviorAnalysis.longTermHolders}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-8">
            <h3 className="text-2xl font-bold text-[#1E1958] mb-6">{t('admin.reports.sections.topInvestorsBySegment')}</h3>
            <div className="space-y-4">
              {data.customerInsights.topInvestors.slice(0, 5).map((investor, index) => {
                const segment = data.customerSegments.find(seg => 
                  investor.totalInvested >= seg.minInvestment && investor.totalInvested <= seg.maxInvestment
                )
                const segmentColors = {
                  0: 'bg-[#41EAD4]/10 border-[#41EAD4]/30',
                  1: 'bg-[#986F9A]/10 border-[#986F9A]/30', 
                  2: 'bg-[#ED9072]/10 border-[#ED9072]/30'
                }
                const segmentIndex = data.customerSegments.findIndex(seg => 
                  investor.totalInvested >= seg.minInvestment && investor.totalInvested <= seg.maxInvestment
                )
                
                return (
                  <div key={index} className={`flex items-center justify-between p-4 rounded-xl border-2 ${segmentColors[segmentIndex] || 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex-1">
                      <p className="font-semibold text-lg text-[#1E1958] mb-1">{investor.name}</p>
                      <p className="text-sm text-gray-600">
                        {investor.properties} {t('admin.reports.topInvestors.properties')} • {segment?.name || 'Unknown'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#1E1958]">{formatCurrency(investor.totalInvested)}</p>
                      <p className="text-xs text-gray-500">{t('admin.reports.topInvestors.totalInvested')}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-8">
          <h3 className="text-2xl font-bold text-[#1E1958] mb-6">{t('admin.reports.sections.platformPerformance')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#41EAD4]/10 rounded-2xl mb-4">
                <Target className="text-[#41EAD4]" size={40} />
              </div>
              <p className="text-3xl font-bold text-[#1E1958] mb-2">{data.performance.fundedProperties}</p>
              <p className="text-sm font-medium text-gray-600">{t('admin.reports.performance.fundedProperties')}</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#986F9A]/10 rounded-2xl mb-4">
                <CheckCircle className="text-[#986F9A]" size={40} />
              </div>
              <p className="text-3xl font-bold text-[#1E1958] mb-2">{data.performance.totalFundingRate.toFixed(1)}%</p>
              <p className="text-sm font-medium text-gray-600">{t('admin.reports.performance.successRate')}</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#ED9072]/10 rounded-2xl mb-4">
                <Clock className="text-[#ED9072]" size={40} />
              </div>
              <p className="text-3xl font-bold text-[#1E1958] mb-2">{data.performance.averageTimeToApprove}d</p>
              <p className="text-sm font-medium text-gray-600">{t('admin.reports.performance.avgApprovalTime')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Insights */}
      <div className="mt-12 bg-gradient-to-br from-[#1E1958]/5 to-[#986F9A]/5 border-2 border-[#1E1958]/20 rounded-2xl overflow-hidden">
        <div className="p-8">
          <h3 className="text-2xl font-bold text-[#1E1958] mb-6">
            {t('admin.reports.sections.segmentationInsights')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm">
              <div className="p-3 bg-[#41EAD4]/10 rounded-xl">
                <DollarSign className="text-[#41EAD4]" size={24} />
              </div>
              <div>
                <p className="font-semibold text-lg text-[#1E1958] mb-2">{t('admin.reports.insights.microTitle')}</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t('admin.reports.insights.microBody', { count: data.customerSegments[0]?.count || 0, percent: data.customerSegments[0]?.percentage || 0 })}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm">
              <div className="p-3 bg-[#986F9A]/10 rounded-xl">
                <TrendingUp className="text-[#986F9A]" size={24} />
              </div>
              <div>
                <p className="font-semibold text-lg text-[#1E1958] mb-2">{t('admin.reports.insights.growthTitle')}</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t('admin.reports.insights.growthBody', { count: data.customerSegments[1]?.count || 0, percent: data.customerSegments[1]?.percentage || 0 })}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm">
              <div className="p-3 bg-[#ED9072]/10 rounded-xl">
                <Target className="text-[#ED9072]" size={24} />
              </div>
              <div>
                <p className="font-semibold text-lg text-[#1E1958] mb-2">{t('admin.reports.insights.whaleTitle')}</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t('admin.reports.insights.whaleBody', { count: data.customerSegments[2]?.count || 0, percent: data.customerSegments[2]?.percentage || 0 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}