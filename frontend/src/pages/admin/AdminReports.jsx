import React, { useState, useEffect } from 'react'
import {
  Users, TrendingUp, DollarSign, Activity,
  Calendar, BarChart3, Target, AlertCircle, CheckCircle, Clock, Info
} from 'lucide-react'
import { authHeader, fetchJson, getToken } from '../../lib/api'
import { useTranslation } from 'react-i18next'

export default function AdminReports() {
  const { t } = useTranslation('pages')
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [data, setData] = useState({
    overview: {
      totalProperties: 0,
      totalInvestors: 0,
      totalVolume: 0,
      activeProperties: 0,
      pendingApprovals: 0,
    },
    performance: {
      fundedProperties: 0,
      totalFundingRate: 0,
    },
    topInvestors: [],
    customerSegments: [],
  })

  useEffect(() => {
    loadReportsData()
  }, [timeRange])

  async function loadReportsData() {
    try {
      setLoading(true)
      if (!getToken()) return

      const [propertiesResult, usersResult, investorsResult] = await Promise.allSettled([
        fetchJson('/api/properties', { headers: { ...authHeader() } }),
        fetchJson('/api/users', { headers: { ...authHeader() } }),
        fetchJson('/api/orders/investors', { headers: { ...authHeader() } }),
      ])

      const properties =
        propertiesResult.status === 'fulfilled' && Array.isArray(propertiesResult.value)
          ? propertiesResult.value
          : []
      const users =
        usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)
          ? usersResult.value
          : []
      const investorsRaw =
        investorsResult.status === 'fulfilled'
          ? Array.isArray(investorsResult.value)
            ? investorsResult.value
            : (investorsResult.value?.investors || [])
          : []

      const approvedProperties = properties.filter(p => p.status === 'APPROVED')
      const pendingProperties = properties.filter(p => p.status === 'PENDING')
      const totalVolume = approvedProperties.reduce((sum, p) => {
        return sum + ((p.totalTokens - (p.remainingTokens || 0)) * (p.tokenPrice || 0))
      }, 0)
      const fundedProperties = approvedProperties.filter(
        p => (p.totalTokens - (p.remainingTokens || 0)) > 0
      )

      const topInvestors = investorsRaw
        .filter(inv => inv.totalInvestment > 0)
        .sort((a, b) => b.totalInvestment - a.totalInvestment)
        .slice(0, 5)
        .map(inv => ({
          name: inv.name || inv.email || '—',
          email: inv.email,
          totalInvested: inv.totalInvestment,
        }))

      setData({
        overview: {
          totalProperties: properties.length,
          totalInvestors: users.filter(
            u => u.role === 'investor' || u.role === 'INVESTOR'
          ).length,
          totalVolume,
          activeProperties: approvedProperties.length,
          pendingApprovals: pendingProperties.length,
        },
        performance: {
          fundedProperties: fundedProperties.length,
          totalFundingRate:
            approvedProperties.length > 0
              ? (fundedProperties.length / approvedProperties.length) * 100
              : 0,
        },
        topInvestors,
        customerSegments: [
          {
            name: t('admin.reports.segments.micro'),
            icon: DollarSign,
            characteristics: t('admin.reports.segments.microCharacteristics', {
              returnObjects: true,
            }),
          },
          {
            name: t('admin.reports.segments.growth'),
            icon: TrendingUp,
            characteristics: t('admin.reports.segments.growthCharacteristics', {
              returnObjects: true,
            }),
          },
          {
            name: t('admin.reports.segments.whale'),
            icon: Target,
            characteristics: t('admin.reports.segments.whaleCharacteristics', {
              returnObjects: true,
            }),
          },
        ],
      })
    } catch (err) {
      console.error('Failed to load reports data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  const na = t('admin.reports.notAvailable')

  const MetricCard = ({ title, value, icon: Icon, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-[#1E1958] text-white',
      green: 'bg-[#41EAD4] text-white',
      purple: 'bg-[#986F9A] text-white',
      orange: 'bg-[#ED9072] text-white',
      coral: 'bg-gradient-to-br from-[#ED9072] to-[#EC8B5C] text-white',
    }
    const bgClasses = {
      blue: 'bg-[#1E1958]/5 border-[#1E1958]/20',
      green: 'bg-[#41EAD4]/5 border-[#41EAD4]/20',
      purple: 'bg-[#986F9A]/5 border-[#986F9A]/20',
      orange: 'bg-[#ED9072]/5 border-[#ED9072]/20',
      coral: 'bg-[#ED9072]/5 border-[#ED9072]/20',
    }
    return (
      <div
        className={`bg-white rounded-2xl border-2 ${bgClasses[color]} shadow-sm hover:shadow-md transition-all p-8`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
            <p className="text-3xl font-bold text-[#1E1958] mb-3">{value}</p>
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
      {/* Analytics availability notice */}
      <div className="mb-8 flex items-start gap-3 p-4 bg-[#1E1958]/5 border border-[#1E1958]/20 rounded-xl">
        <Info className="text-[#1E1958] mt-0.5 shrink-0" size={18} />
        <p className="text-sm text-[#1E1958]">{t('admin.reports.analyticsNotice')}</p>
      </div>

      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[#1E1958] mb-3">
              {t('admin.reports.headerTitle')}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl">
              {t('admin.reports.headerSubtitle')}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
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
            <p className="text-xs text-gray-400">{t('admin.reports.timeRangeNote')}</p>
          </div>
        </div>
      </div>

      {/* Platform Overview — all real */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-[#1E1958] mb-6">
          {t('admin.reports.sections.platformOverview')}
        </h2>
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
            icon={Users}
            color="blue"
          />
          <MetricCard
            title={t('admin.reports.overview.totalVolume')}
            value={formatCurrency(data.overview.totalVolume)}
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

      {/* Growth Metrics — no real time-ranged data yet */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-[#1E1958] mb-6">
          {t('admin.reports.sections.growthMetrics')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title={t('admin.reports.growth.newInvestors')}
            value={na}
            icon={TrendingUp}
            color="purple"
          />
          <MetricCard
            title={t('admin.reports.growth.monthlyRevenue')}
            value={na}
            icon={DollarSign}
            color="coral"
          />
          <MetricCard
            title={t('admin.reports.growth.newListings')}
            value={na}
            icon={BarChart3}
            color="blue"
          />
        </div>
      </div>

      {/* Customer Segmentation — structure and characteristics real; counts not available */}
      <div className="mb-12">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-[#1E1958] mb-6">
              {t('admin.reports.sections.customerSegmentation')}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {data.customerSegments.map((segment, index) => {
                const SegmentIcon = segment.icon
                const segmentColors = {
                  0: 'bg-[#41EAD4]/10 border-[#41EAD4]/30',
                  1: 'bg-[#986F9A]/10 border-[#986F9A]/30',
                  2: 'bg-[#ED9072]/10 border-[#ED9072]/30',
                }
                const iconColors = {
                  0: 'text-[#41EAD4]',
                  1: 'text-[#986F9A]',
                  2: 'text-[#ED9072]',
                }
                return (
                  <div
                    key={index}
                    className={`border-2 rounded-2xl p-6 hover:shadow-md transition-all ${segmentColors[index]}`}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-[#1E1958]">{segment.name}</h3>
                      <div className="p-3 rounded-xl bg-white shadow-sm">
                        <SegmentIcon className={iconColors[index]} size={24} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 font-medium">
                          {t('admin.reports.segments.customers')}
                        </span>
                        <span className="text-lg font-semibold text-gray-400">{na}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 font-medium">
                          {t('admin.reports.segments.avgInvestment')}
                        </span>
                        <span className="text-lg font-semibold text-gray-400">{na}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 font-medium">
                          {t('admin.reports.segments.totalValue')}
                        </span>
                        <span className="text-lg font-semibold text-gray-400">{na}</span>
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-3">
                        {t('admin.reports.segments.characteristics')}
                      </p>
                      <ul className="text-sm text-gray-600 space-y-2">
                        {Array.isArray(segment.characteristics) &&
                          segment.characteristics.map((char, idx) => (
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

      {/* Customer Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Investment Behavior — no real data */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-8">
            <h3 className="text-2xl font-bold text-[#1E1958] mb-6">
              {t('admin.reports.sections.investmentBehavior')}
            </h3>
            <div className="space-y-6">
              {[
                { label: t('admin.reports.behavior.oneTime'), color: 'text-[#ED9072]', bg: 'bg-[#ED9072]/5' },
                { label: t('admin.reports.behavior.repeat'), color: 'text-[#41EAD4]', bg: 'bg-[#41EAD4]/5' },
                { label: t('admin.reports.behavior.highFrequency'), color: 'text-[#1E1958]', bg: 'bg-[#1E1958]/5' },
                { label: t('admin.reports.behavior.longTerm'), color: 'text-[#986F9A]', bg: 'bg-[#986F9A]/5' },
              ].map(({ label, color, bg }) => (
                <div key={label} className={`flex justify-between items-center p-4 ${bg} rounded-xl`}>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <span className={`text-xl font-bold ${color}`}>{na}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Investors — real data from /api/orders/investors */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-8">
            <h3 className="text-2xl font-bold text-[#1E1958] mb-6">
              {t('admin.reports.sections.topInvestorsBySegment')}
            </h3>
            {data.topInvestors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Users size={40} className="mb-3" />
                <p className="text-sm">{na}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.topInvestors.map((investor, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-xl border-2 bg-gray-50 border-gray-200"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-lg text-[#1E1958] mb-1">{investor.name}</p>
                      <p className="text-sm text-gray-500">{investor.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#1E1958]">
                        {formatCurrency(investor.totalInvested)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('admin.reports.topInvestors.totalInvested')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-8">
          <h3 className="text-2xl font-bold text-[#1E1958] mb-6">
            {t('admin.reports.sections.platformPerformance')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#41EAD4]/10 rounded-2xl mb-4">
                <Target className="text-[#41EAD4]" size={40} />
              </div>
              <p className="text-3xl font-bold text-[#1E1958] mb-2">
                {data.performance.fundedProperties}
              </p>
              <p className="text-sm font-medium text-gray-600">
                {t('admin.reports.performance.fundedProperties')}
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#986F9A]/10 rounded-2xl mb-4">
                <CheckCircle className="text-[#986F9A]" size={40} />
              </div>
              <p className="text-3xl font-bold text-[#1E1958] mb-2">
                {data.performance.totalFundingRate.toFixed(1)}%
              </p>
              <p className="text-sm font-medium text-gray-600">
                {t('admin.reports.performance.successRate')}
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#ED9072]/10 rounded-2xl mb-4">
                <Clock className="text-[#ED9072]" size={40} />
              </div>
              <p className="text-3xl font-bold text-gray-400 mb-2">{na}</p>
              <p className="text-sm font-medium text-gray-600">
                {t('admin.reports.performance.avgApprovalTime')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
