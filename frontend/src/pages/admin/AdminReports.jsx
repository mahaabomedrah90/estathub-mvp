import React, { useState, useEffect } from 'react'
import { 
  Users, TrendingUp, DollarSign, Activity, ArrowUp, ArrowDown, 
  Calendar, BarChart3, PieChart, Target, AlertCircle, CheckCircle, Clock 
} from 'lucide-react'
import { authHeader, fetchJson, getToken } from '../../lib/api'
import { useTranslation } from 'react-i18next'

export default function AdminReports()  {
  const { t } = useTranslation('pages')
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
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      purple: 'bg-purple-50 text-purple-600',
      orange: 'bg-orange-50 text-orange-600',
      red: 'bg-red-50 text-red-600'
    }

    return (
      <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
            {change !== undefined && (
              <div className="flex items-center mt-2">
                {isPositive ? (
                  <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(change)}%
                </span>
              </div>
            )}
          </div>
          <div className={`${colorClasses[color]} p-3 rounded-lg`}>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('admin.reports.headerTitle')}</h1>
            <p className="mt-2 text-gray-600">
              {t('admin.reports.headerSubtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">{t('admin.reports.timeRange.7d')}</option>
              <option value="30d">{t('admin.reports.timeRange.30d')}</option>
              <option value="90d">{t('admin.reports.timeRange.90d')}</option>
              <option value="1y">{t('admin.reports.timeRange.1y')}</option>
            </select>
            <Calendar className="text-gray-400" size={20} />
          </div>
        </div>
      </div>

      {/* Key Overview Metrics */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('admin.reports.sections.platformOverview')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard
            title={t('admin.reports.overview.totalProperties')}
            value={data.overview.totalProperties}
            icon={BarChart3}
            color="blue"
          />
          <MetricCard
            title={t('admin.reports.overview.totalInvestors')}
            value={data.overview.totalInvestors}
            change={data.growth.investorGrowthRate}
            icon={Users}
            color="purple"
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
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('admin.reports.sections.growthMetrics')}</h2>
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
            color="green"
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
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('admin.reports.sections.customerSegmentation')}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {data.customerSegments.map((segment, index) => {
  const SegmentIcon = segment.icon
  return (
    <div key={index} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">{segment.name}</h3>
        <div className={`${segment.bgColor} p-2 rounded-lg`}>
          <SegmentIcon className={segment.iconColor} size={20} />
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{t('admin.reports.segments.customers')}</span>
          <span className="font-semibold text-gray-900">{segment.count}</span>
        </div>
        {/* ... other segment details ... */}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600 mb-2">{t('admin.reports.segments.characteristics')}</p>
        <ul className="text-xs text-gray-500 space-y-1">
          {segment.characteristics.map((char, idx) => (
            <li key={idx} className="flex items-start gap-1">
              <span className="text-gray-400 mt-0.5">•</span>
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

      {/* Detailed Customer Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('admin.reports.sections.investmentBehavior')}</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('admin.reports.behavior.oneTime')}</span>
              <span className="font-semibold text-orange-600">{data.behaviorAnalysis.oneTimeInvestors}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('admin.reports.behavior.repeat')}</span>
              <span className="font-semibold text-green-600">{data.behaviorAnalysis.repeatInvestors}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('admin.reports.behavior.highFrequency')}</span>
              <span className="font-semibold text-blue-600">{data.behaviorAnalysis.highFrequencyInvestors}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('admin.reports.behavior.longTerm')}</span>
              <span className="font-semibold text-purple-600">{data.behaviorAnalysis.longTermHolders}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('admin.reports.sections.topInvestorsBySegment')}</h3>
          <div className="space-y-3">
            {data.customerInsights.topInvestors.slice(0, 5).map((investor, index) => {
              const segment = data.customerSegments.find(seg => 
                investor.totalInvested >= seg.minInvestment && investor.totalInvested <= seg.maxInvestment
              )
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{investor.name}</p>
                    <p className="text-sm text-gray-500">
                      {investor.properties} {t('admin.reports.topInvestors.properties')} • {segment?.name || 'Unknown'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(investor.totalInvested)}</p>
                    <p className="text-xs text-gray-500">{t('admin.reports.topInvestors.totalInvested')}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('admin.reports.sections.platformPerformance')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-3">
              <Target className="text-blue-600" size={32} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{data.performance.fundedProperties}</p>
            <p className="text-sm text-gray-600">{t('admin.reports.performance.fundedProperties')}</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{data.performance.totalFundingRate.toFixed(1)}%</p>
            <p className="text-sm text-gray-600">{t('admin.reports.performance.successRate')}</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-3">
              <Clock className="text-purple-600" size={32} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{data.performance.averageTimeToApprove}d</p>
            <p className="text-sm text-gray-600">{t('admin.reports.performance.avgApprovalTime')}</p>
          </div>
        </div>
      </div>

      {/* Actionable Insights */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
<h3 className="text-lg font-bold text-blue-900 mb-3">
  {t('admin.reports.sections.segmentationInsights')}
</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <DollarSign className="text-blue-600 mt-1" size={20} />
 <div>
 <p className="font-medium text-blue-900">{t('admin.reports.insights.microTitle')}</p>
 <p className="text-sm text-blue-700">
 {t('admin.reports.insights.microBody', { count: data.customerSegments[0]?.count || 0, percent: data.customerSegments[0]?.percentage || 0 })}
 </p>
 </div>
 </div>
 <div className="flex items-start gap-3">
            <TrendingUp className="text-blue-600 mt-1" size={20} />
            <div>
                
             <p className="font-medium text-blue-900">{t('admin.reports.insights.growthTitle')}</p>
 <p className="text-sm text-blue-700">
 {t('admin.reports.insights.growthBody', { count: data.customerSegments[1]?.count || 0, percent: data.customerSegments[1]?.percentage || 0 })}
 </p>
 </div>
 </div>
 <div className="flex items-start gap-3">
            <Target className="text-blue-600 mt-1" size={20} />
            <div>
             <p className="font-medium text-blue-900">{t('admin.reports.insights.whaleTitle')}</p>
 <p className="text-sm text-blue-700">
 {t('admin.reports.insights.whaleBody', { count: data.customerSegments[2]?.count || 0, percent: data.customerSegments[2]?.percentage || 0 })}
 </p>
 </div>
 </div>
 <div className="flex items-start gap-3">
            <Target className="text-blue-600 mt-1" size={20} />
            <div>
             <p className="font-medium text-blue-900">{t('admin.reports.insights.whaleTitle')}</p>
 <p className="text-sm text-blue-700">
 {t('admin.reports.insights.whaleBody', { count: data.customerSegments[2]?.count || 0, percent: data.customerSegments[2]?.percentage || 0 })}
 </p>
 </div>
 </div>
        </div>
      </div>
    </div>
  )
}