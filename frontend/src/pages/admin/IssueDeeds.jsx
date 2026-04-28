import { useState, useEffect } from 'react'
import { FileText, Send, CheckCircle, AlertCircle, Users, TrendingUp, PieChart, Eye, X, ExternalLink, Download } from 'lucide-react'
import { fetchJson, authHeader } from '../../lib/api'
import { useTranslation } from 'react-i18next'

export default function IssueDeeds() {
  const { t, i18n } = useTranslation('pages')
  const isArabic = i18n.language === 'ar'
  // NEW VERSION LOADED - Authentication and caching fixed!
  console.log(' IssueDeeds FIXED VERSION loaded!')

  const [properties, setProperties] = useState([])
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [investors, setInvestors] = useState([])
  const [issuedDeeds, setIssuedDeeds] = useState([])
  const [issuing, setIssuing] = useState(false)
  const [results, setResults] = useState([])
  const [existingDeeds, setExistingDeeds] = useState(new Map())
  const [viewingProperty, setViewingProperty] = useState(null)
  const [viewingInvestor, setViewingInvestor] = useState(null)
  const [confirmIssue, setConfirmIssue] = useState(null)

  const getTokenStatus = (property) => {
    const soldTokens = property.totalTokens - property.remainingTokens
    const issuedTokens = issuedDeeds.filter(deed => deed.propertyId === property.id).length
    const pendingTokens = soldTokens - issuedTokens

    return {
      total: property.totalTokens,
      sold: soldTokens,
      issued: issuedTokens,
      pending: Math.max(0, pendingTokens),
      percentageSold: (soldTokens / property.totalTokens) * 100,
      percentageIssued: soldTokens > 0 ? (issuedTokens / soldTokens) * 100 : 0
    }
  }

  useEffect(() => {
    console.log(' IssueDeeds component mounted, forcing cache clear...')
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          console.log(' Deleting cache:', name)
          caches.delete(name)
        })
      })
    }
    setTimeout(() => {
      console.log(' Loading properties after cache clear...')
      loadProperties()
    }, 100)
  }, [])

  async function loadProperties() {
    try {
      console.log(' Loading properties for deed issuance...')

      const token = localStorage.getItem('estathub_token')
      console.log(' Auth token exists:', !!token)
      if (!token) {
        console.error(' No authentication token found')
        return
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }

      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:5001'
      console.log(' Making API call to:', `${apiBase}/api/properties`)
      const response = await fetch(`${apiBase}/api/properties?t=${Date.now()}`, { headers })
      console.log(' Response status:', response.status)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(' Properties loaded:', data?.length || 0, 'properties')
      if (data && data.length > 0) {
        console.log(' Sample property:', data[0])
      }
      setProperties(data || [])

      try {
        const deedsResponse = await fetch(`${apiBase}/api/deeds?t=${Date.now()}`, { headers })
        if (deedsResponse.ok) {
          const deedsData = await deedsResponse.json()
          setIssuedDeeds(deedsData || [])
          console.log(' Issued deeds loaded:', deedsData?.length || 0, 'deeds')
        }
      } catch (deedErr) {
        console.warn(' Failed to load issued deeds:', deedErr)
        setIssuedDeeds([])
      }
    } catch (err) {
      console.error(' Failed to load properties:', err)
    }
  }

  async function loadInvestors(propertyId) {
    try {
      const holdings = await fetchJson(`/api/properties/${propertyId}/holdings?t=${Date.now()}`, { headers: { ...authHeader() } })
      console.log(' Investors loaded:', holdings?.length || 0, 'investors')
      setInvestors(holdings || [])

      const deeds = await fetchJson(`/api/deeds?propertyId=${propertyId}&t=${Date.now()}`, { headers: { ...authHeader() } })
      const deedMap = new Map()
      deeds?.forEach(deed => {
        if (!deedMap.has(deed.userId)) {
          deedMap.set(deed.userId, {
            deeds: [],
            totalIssuedTokens: 0
          })
        }
        const userDeeds = deedMap.get(deed.userId)
        userDeeds.deeds.push({
          deedNumber: deed.deedNumber,
          ownedTokens: deed.ownedTokens,
          status: deed.status,
          events: deed.events || [],
          issuedAt: deed.issuedAt,
        })
        userDeeds.totalIssuedTokens += deed.ownedTokens
      })
      setExistingDeeds(deedMap)
      console.log(' Existing deeds loaded:', deedMap.size, 'users with deeds')
    } catch (err) {
      console.error(' Failed to load investors:', err)
      setInvestors([])
      setExistingDeeds(new Map())
    }
  }

  async function issueDeed(userId, propertyId) {
    try {
      console.log(` Issuing deed for user ${userId} and property ${propertyId}...`)
      const result = await fetchJson('/api/deeds/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ userId, propertyId })
      })
      return result
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async function issueSingleDeed(userId, propertyId, userName) {
    setConfirmIssue({ userId, propertyId, userName })
  }

  async function handleConfirmIssue() {
    if (!confirmIssue) return
    const { userId, propertyId, userName } = confirmIssue

    setIssuing(true)
    const result = await issueDeed(userId, propertyId)
    setResults([{ investorName: userName, ...result }])

    if (selectedProperty) {
      await loadInvestors(selectedProperty.id)
    }

    setIssuing(false)
    setConfirmIssue(null)
  }

  async function issueAllDeeds() {
    if (!selectedProperty) return

    setIssuing(true)
    setResults([])

    const newResults = []
    for (const investor of investors) {
      const result = await issueDeed(investor.userId, selectedProperty.id)
      newResults.push({
        investorName: investor.userName,
        ...result
      })
      setResults([...newResults])
    }

    try {
      const token = localStorage.getItem('estathub_token')
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:5001'
      const deedsResponse = await fetch(`${apiBase}/api/deeds?t=${Date.now()}`, { headers })
      if (deedsResponse.ok) {
        const deedsData = await deedsResponse.json()
        setIssuedDeeds(deedsData || [])
        console.log('✅ Refreshed issued deeds after issuance')
      }
    } catch (err) {
      console.warn('⚠️ Failed to refresh issued deeds:', err)
    }

    if (selectedProperty) {
      await loadInvestors(selectedProperty.id)
    }

    setIssuing(false)
  }

  const totalPendingTokens = properties.reduce((sum, p) => {
    const status = getTokenStatus(p)
    return sum + status.pending
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1E1958]">{t('admin.issueDeeds.headerTitle')}</h1>
        <p className="text-gray-600 mt-2">
          {t('admin.issueDeeds.headerSubtitle')}
        </p>
      </div>

      {/* Token Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Properties Card */}
        <div className="bg-gradient-to-br from-[#1E1958] to-[#2a2458] rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <FileText className="text-white" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded">
              <PieChart size={14} />
              <span>{isArabic ? 'إجمالي' : 'Total'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{properties.length}</div>
          <div className="text-white/80 text-sm">
            {t('admin.issueDeeds.stats.totalProperties')}
          </div>
        </div>

        {/* Pending Issuance Card */}
        <div className="bg-[#ED9072]/10 border border-[#ED9072]/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#ED9072]/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-[#ED9072]" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-[#ED9072]">
              <TrendingUp size={14} />
              <span>{isArabic ? 'معلق' : 'Pending'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1E1958] mb-1">{totalPendingTokens}</div>
          <div className="text-sm text-gray-600">
            {t('admin.issueDeeds.stats.pendingIssuance')}
          </div>
        </div>

        {/* Already Issued Card */}
        <div className="bg-[#41EAD4]/10 border border-[#41EAD4]/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#41EAD4]/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-[#41EAD4]" size={24} />
            </div>
            <div className="flex items-center gap-1 text-sm text-[#41EAD4]">
              <CheckCircle size={14} />
              <span>{isArabic ? 'مصدر' : 'Issued'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1E1958] mb-1">
            {properties.reduce((sum, p) => {
              const status = getTokenStatus(p)
              return sum + status.issued
            }, 0)}
          </div>
          <div className="text-sm text-gray-600">
            {t('admin.issueDeeds.stats.alreadyIssued')}
          </div>
        </div>

      </div>

      {/* Property Selection — full-width below KPI cards */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#1E1958]">{t('admin.issueDeeds.selectProperty.title')}</h2>
            <div className="text-sm text-gray-600">
              {selectedProperty
                ? `${t('admin.issueDeeds.selectProperty.selected')} ${selectedProperty.title || selectedProperty.name}`
                : t('admin.issueDeeds.selectProperty.noSelection')
              }
            </div>
          </div>
            {!selectedProperty && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[#41EAD4]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="text-[#41EAD4]" size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('admin.issueDeeds.selectProperty.noSelectionTitle')}
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {t('admin.issueDeeds.selectProperty.noSelectionDescription')}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => {
                const tokenStatus = getTokenStatus(property)
                const isSelected = selectedProperty?.id === property.id
                return (
                  <div
                    key={property.id}
                    onClick={() => {
                      if (property.status === 'APPROVED') {
                        setSelectedProperty(property)
                        loadInvestors(property.id)
                      }
                    }}
                    className={`p-6 border-2 rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#1E1958] bg-[#1E1958]/5 shadow-lg'
                        : property.status === 'APPROVED'
                        ? 'border-[#41EAD4]/30 bg-[#41EAD4]/5 hover:border-[#41EAD4] hover:shadow-md'
                        : 'border-gray-200 opacity-50 cursor-not-allowed'
                    }`}
                    title={property.status !== 'APPROVED' ? 'Only approved properties can issue deeds' : ''}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-[#1E1958] mb-1">{property.title || property.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{property.location}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <FileText size={12} />
                          <span>{t('admin.issueDeeds.selectProperty.tokensSold', {
                            sold: tokenStatus.sold,
                            total: tokenStatus.total,
                          })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <CheckCircle size={12} />
                          <span>{t('admin.issueDeeds.selectProperty.tokensIssued', {
                            issued: tokenStatus.issued,
                            sold: tokenStatus.sold,
                          })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setViewingProperty(property)
                          }}
                          className="p-2 hover:bg-[#41EAD4]/10 rounded-lg transition-colors"
                          title="View property details"
                        >
                          <Eye className="w-4 h-4 text-[#41EAD4]" />
                        </button>
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            property.status === 'APPROVED'
                              ? 'bg-[#41EAD4]/10 text-[#41EAD4]'
                              : property.status === 'PENDING'
                              ? 'bg-[#ED9072]/10 text-[#ED9072]'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {property.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {t('admin.issueDeeds.selectProperty.tokensSold', {
                        sold: tokenStatus.sold,
                        total: tokenStatus.total,
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t('admin.issueDeeds.selectProperty.tokensIssued', {
                        issued: tokenStatus.issued,
                        sold: tokenStatus.sold,
                      })}
                    </p>

                    {/* Inline investors list for selected property */}
                    {isSelected && (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-semibold text-[#1E1958] mb-4">
                          {t('admin.issueDeeds.investors.title', { count: investors.length })}
                        </h3>
                        {investors.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 bg-[#ED9072]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Users className="text-[#ED9072]" size={24} />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">
                              {t('admin.issueDeeds.investors.empty')}
                            </h4>
                            <p className="text-gray-600 max-w-md mx-auto">
                              {t('admin.issueDeeds.investors.noInvestors')}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {investors.map((investor, idx) => {
                              const userDeedInfo = existingDeeds.get(investor.userId)
                              const totalIssuedTokens = userDeedInfo?.totalIssuedTokens || 0
                              const pendingTokens = investor.tokens - totalIssuedTokens
                              const needsIssuance = pendingTokens > 0
                              const fullyIssued = pendingTokens === 0

                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center justify-between p-4 border rounded-xl ${
                                    needsIssuance
                                      ? 'border-[#ED9072]/30 bg-[#ED9072]/5'
                                      : fullyIssued
                                      ? 'border-[#41EAD4]/30 bg-[#41EAD4]/5'
                                      : 'border-gray-200 bg-gray-50'
                                  }`}
                                >
                                  <div>
                                    <p className="font-medium text-gray-900">{investor.userName}</p>
                                    <p className="text-xs text-gray-600">
                                      {t('admin.issueDeeds.investors.holdings', {
                                        tokens: investor.tokens,
                                        percent: ((investor.tokens / property.totalTokens) * 100).toFixed(2),
                                      })}
                                      {userDeedInfo && (
                                        <span className="ml-2 text-[11px] text-gray-500">
                                          {needsIssuance
                                            ? t('admin.issueDeeds.investors.issuedSummaryWithPending', {
                                                issued: totalIssuedTokens,
                                                deedCount: userDeedInfo.deeds.length,
                                                pending: pendingTokens,
                                              })
                                            : t('admin.issueDeeds.investors.issuedSummary', {
                                                issued: totalIssuedTokens,
                                                deedCount: userDeedInfo.deeds.length,
                                              })}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setViewingInvestor({ ...investor, userDeedInfo, selectedProperty: property })
                                      }}
                                      className="p-2 hover:bg-[#41EAD4]/10 rounded-lg transition-colors"
                                    >
                                      <Eye className="w-4 h-4 text-[#41EAD4]" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        issueSingleDeed(investor.userId, property.id, investor.userName)
                                      }}
                                      disabled={!needsIssuance || issuing}
                                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                                        needsIssuance
                                          ? 'bg-[#ED9072] text-white hover:bg-[#ED9072]/90'
                                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      }`}
                                    >
                                      {needsIssuance
                                        ? t('admin.issueDeeds.investors.buttonIssueTokens', {
                                            count: pendingTokens,
                                          })
                                        : t('admin.issueDeeds.investors.buttonIssueDeed')}
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-[#1E1958] mb-6">{t('admin.issueDeeds.results.title')}</h2>
            <div className="space-y-3">
              {results.map((result, idx) => {
                const alreadyExists = result.alreadyExists || result.message?.includes('already exists')
                const bgColor = result.success ? (alreadyExists ? 'bg-[#F59E0B]/10' : 'bg-[#41EAD4]/10') : 'bg-red-50'
                const iconColor = result.success ? (alreadyExists ? 'text-[#F59E0B]' : 'text-[#41EAD4]') : 'text-red-600'
                const textColor = result.success ? (alreadyExists ? 'text-[#F59E0B]' : 'text-[#41EAD4]') : 'text-red-700'

                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-4 p-4 rounded-xl border ${bgColor}`}
                  >
                    {result.success ? (
                      <CheckCircle className={`w-6 h-6 ${iconColor}`} />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{result.investorName}</p>
                      <p className={`text-sm ${textColor}`}>
                        {result.success ? (
                          alreadyExists ? (
                            <>
                              {t('admin.issueDeeds.results.deedAlreadyExists', { deedNumber: result.deed?.deedNumber })}
                              <span className="ml-2 text-xs opacity-75">({t('admin.issueDeeds.results.skipped')})</span>
                            </>
                          ) : (
                            <>{t('admin.issueDeeds.results.deedIssued', { deedNumber: result.deed?.deedNumber })}</>
                          )
                        ) : (
                          <>{t('admin.issueDeeds.results.errorPrefix', { message: result.error })}</>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Issue Modal */}
      {confirmIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            dir="rtl"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('admin.issueDeeds.confirmTitle')}
            </h3>
            <p className="text-sm text-gray-700 mb-6">
              {t('admin.issueDeeds.confirmIssueForInvestor', {
                name: confirmIssue.userName,
              })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => setConfirmIssue(null)}
                disabled={issuing}
              >
                {t('admin.issueDeeds.confirmCancel')}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60"
                onClick={handleConfirmIssue}
                disabled={issuing}
              >
                {issuing
                  ? t('admin.issueDeeds.confirmProcessing')
                  : t('admin.issueDeeds.confirmOk')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Details Modal */}
      {viewingProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t('admin.issueDeeds.propertyModal.title')}</h2>
              <button
                onClick={() => setViewingProperty(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('admin.issueDeeds.propertyModal.basicInfo')}</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.propertyName')}</p>
                    <p className="font-medium">{viewingProperty.title || viewingProperty.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.location')}</p>
                    <p className="font-medium">{viewingProperty.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.city')}</p>
                    <p className="font-medium">{viewingProperty.city || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.district')}</p>
                    <p className="font-medium">{viewingProperty.district || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.status')}</p>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      viewingProperty.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      viewingProperty.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {viewingProperty.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.propertyType')}</p>
                    <p className="font-medium">{viewingProperty.propertyTypeDetailed || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('admin.issueDeeds.propertyModal.technical')}</h3>
                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.landArea')}</p>
                    <p className="font-medium">{viewingProperty.landArea ? `${viewingProperty.landArea} m²` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.builtArea')}</p>
                    <p className="font-medium">{viewingProperty.builtArea ? `${viewingProperty.builtArea} m²` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.buildingAge')}</p>
                    <p className="font-medium">{viewingProperty.buildingAge ? `${viewingProperty.buildingAge} years` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.floors')}</p>
                    <p className="font-medium">{viewingProperty.floorsCount || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.units')}</p>
                    <p className="font-medium">{viewingProperty.unitsCount || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.condition')}</p>
                    <p className="font-medium">{viewingProperty.propertyCondition || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('admin.issueDeeds.propertyModal.financial')}</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.marketValue')}</p>
                    <p className="font-medium text-lg">{viewingProperty.marketValue ? `${viewingProperty.marketValue.toLocaleString()} SAR` : `${viewingProperty.totalValue?.toLocaleString()} SAR`}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.expectedRoi')}</p>
                    <p className="font-medium text-lg">{viewingProperty.expectedROI}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.totalTokens')}</p>
                    <p className="font-medium">{viewingProperty.totalTokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.tokenPrice')}</p>
                    <p className="font-medium">{viewingProperty.tokenPrice} {t('currency.sar', { ns: 'common' })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.tokensSold')}</p>
                    <p className="font-medium">{(viewingProperty.totalTokens - viewingProperty.remainingTokens).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.ownerRetained')}</p>
                    <p className="font-medium">{viewingProperty.ownerRetainedPercentage || 0}%</p>
                  </div>
                </div>
              </div>

              {/* Owner Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('admin.issueDeeds.propertyModal.ownerInfo')}</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.ownerName')}</p>
                    <p className="font-medium">{viewingProperty.ownerName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.ownerType')}</p>
                    <p className="font-medium">{viewingProperty.ownerType || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.nationalIdCr')}</p>
                    <p className="font-medium">{viewingProperty.nationalIdOrCR || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.phone')}</p>
                    <p className="font-medium">{viewingProperty.ownerPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.email')}</p>
                    <p className="font-medium">{viewingProperty.ownerEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.propertyModal.labels.iban')}</p>
                    <p className="font-medium font-mono text-sm">{viewingProperty.ownerIban || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Legal Documents */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('admin.issueDeeds.propertyModal.legalDocs')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {viewingProperty.deedDocumentUrl && (
                    <a
                      href={`${import.meta.env.VITE_API_BASE}${viewingProperty.deedDocumentUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">{t('admin.issueDeeds.propertyModal.docs.deed')}</span>
                      <ExternalLink className="w-4 h-4 text-blue-600 ml-auto" />
                    </a>
                  )}
                  {viewingProperty.sitePlanDocumentUrl && (
                    <a
                      href={`${import.meta.env.VITE_API_BASE}${viewingProperty.sitePlanDocumentUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">{t('admin.issueDeeds.propertyModal.docs.sitePlan')}</span>
                      <ExternalLink className="w-4 h-4 text-blue-600 ml-auto" />
                    </a>
                  )}
                  {viewingProperty.buildingPermitUrl && (
                    <a
                      href={`${import.meta.env.VITE_API_BASE}${viewingProperty.buildingPermitUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">{t('admin.issueDeeds.propertyModal.docs.buildingPermit')}</span>
                      <ExternalLink className="w-4 h-4 text-blue-600 ml-auto" />
                    </a>
                  )}
                  {viewingProperty.valuationReportUrl && (
                    <a
                      href={`${import.meta.env.VITE_API_BASE}${viewingProperty.valuationReportUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">{t('admin.issueDeeds.propertyModal.docs.valuationReport')}</span>
                      <ExternalLink className="w-4 h-4 text-blue-600 ml-auto" />
                    </a>
                  )}
                  {viewingProperty.ownerIdDocumentUrl && (
                    <a
                      href={`${import.meta.env.VITE_API_BASE}${viewingProperty.ownerIdDocumentUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">{t('admin.issueDeeds.propertyModal.docs.ownerId')}</span>
                      <ExternalLink className="w-4 h-4 text-blue-600 ml-auto" />
                    </a>
                  )}
                </div>
              </div>

              {/* Property Images */}
              {viewingProperty.mainImagesUrls && viewingProperty.mainImagesUrls.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('admin.issueDeeds.propertyModal.images')}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {viewingProperty.mainImagesUrls.map((url, index) => (
                      <img
                        key={index}
                        src={`${import.meta.env.VITE_API_BASE}${url}`}
                        alt={`Property ${index + 1}`}
                        className="w-full h-40 object-cover rounded-lg border border-gray-200"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {viewingProperty.propertyDescription && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('admin.issueDeeds.propertyModal.description')}</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {viewingProperty.propertyDescription || viewingProperty.description}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setViewingProperty(null)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                {t('admin.issueDeeds.propertyModal.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Investor Details Modal */}
      {viewingInvestor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t('admin.issueDeeds.investorModal.title')}</h2>
              <button
                onClick={() => setViewingInvestor(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Investor Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('admin.issueDeeds.investorModal.info')}</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.investorModal.labels.name')}</p>
                    <p className="font-medium">{viewingInvestor.userName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.investorModal.labels.email')}</p>
                    <p className="font-medium">{viewingInvestor.userEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.investorModal.labels.userId')}</p>
                    <p className="font-medium font-mono text-sm">{viewingInvestor.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.investorModal.investmentDate')}</p>
                    <p className="font-medium">
                      {(() => {
                        const rawDate = viewingInvestor.investmentDate || viewingInvestor.purchasedAt || viewingInvestor.createdAt
                        if (!rawDate) return 'N/A'
                        const d = new Date(rawDate)
                        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString()
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Property Investment Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('admin.issueDeeds.investorModal.investmentIn')}: {viewingInvestor.selectedProperty?.title || viewingInvestor.selectedProperty?.name}</h3>
                <div className="grid grid-cols-3 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.investorModal.ownedTokens')}</p>
                    <p className="font-bold text-2xl text-blue-900">{viewingInvestor.tokens}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.investorModal.ownershipPercentage')}</p>
                    <p className="font-bold text-2xl text-blue-900">
                      {((viewingInvestor.tokens / viewingInvestor.selectedProperty.totalTokens) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('admin.issueDeeds.investorModal.investmentValue')}</p>
                    <p className="font-bold text-2xl text-blue-900">
                      {(viewingInvestor.tokens * viewingInvestor.selectedProperty.tokenPrice).toLocaleString()}   {t('currency.sar', { ns: 'common' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Deed Issuance Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('admin.issueDeeds.investorModal.deedIssuanceStatus')}</h3>
                {viewingInvestor.userDeedInfo && viewingInvestor.userDeedInfo.deeds.length > 0 ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-green-900">
                          {t('admin.issueDeeds.investorModal.totalTokensIssued', { count: viewingInvestor.userDeedInfo.totalIssuedTokens })} {t('admin.issueDeeds.investorModal.tokensIssued', { count: viewingInvestor.userDeedInfo.deeds.length })} {t('admin.issueDeeds.investorModal.deedsForThisInvestor')}
                        </p>
                        {viewingInvestor.tokens > viewingInvestor.userDeedInfo.totalIssuedTokens && (
                          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                            {t('admin.issueDeeds.investorModal.pendingTokens', { count: viewingInvestor.tokens - viewingInvestor.userDeedInfo.totalIssuedTokens })}
                          </span>
                        )}
                      </div>
                      {/* List of issued deeds with issuance history */}
                      <div className="space-y-2">
                        {viewingInvestor.userDeedInfo.deeds.map((deed, index) => (
                          <div key={index} className="bg-white p-3 rounded border border-green-300">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-mono text-sm font-semibold text-gray-900">{deed.deedNumber}</p>
                                <p className="text-xs text-gray-600">
                                  {t('admin.issueDeeds.investorModal.ownedTokensCount', { count: deed.ownedTokens })}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  deed.status === 'ISSUED'
                                    ? 'bg-green-100 text-green-800'
                                    : deed.status === 'PENDING'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {deed.status}
                              </span>
                            </div>

                            {deed.events && deed.events.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-[11px] font-semibold text-gray-700 mb-1">
                                  سجل الإصدارات
                                </p>
                                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                  {deed.events.map((event) => (
                                    <div
                                      key={event.id || `${deed.deedNumber}-${event.createdAt}-${event.deltaTokens}`}
                                      className="flex justify-between text-[11px] text-gray-600"
                                    >
                                      <span>+{event.deltaTokens} توكن</span>
                                      <span>
                                        {new Date(event.createdAt).toLocaleString('en-SA')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-6 h-6 text-orange-600" />
                      <div>
                        <p className="font-medium text-orange-900">{t('admin.issueDeeds.investorModal.noDeedsIssuedYet')}</p>
                        <p className="text-sm text-orange-700">
                          {t('admin.issueDeeds.investorModal.pendingDeedIssuance', { count: viewingInvestor.tokens })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Transaction Summary */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('admin.issueDeeds.investorModal.transactionSummary')}</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('admin.issueDeeds.investorModal.tokenPrice')}:</span>
                    <span className="font-semibold">{viewingInvestor.selectedProperty.tokenPrice} {t('currency.sar', { ns: 'common' })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('admin.issueDeeds.investorModal.tokensPurchased')}:</span>
                    <span className="font-semibold">{viewingInvestor.tokens}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                    <span className="text-gray-900 font-medium">{t('admin.issueDeeds.investorModal.totalInvestment')}:</span>
                    <span className="font-bold text-lg">
                      {(viewingInvestor.tokens * viewingInvestor.selectedProperty.tokenPrice).toLocaleString()} {t('currency.sar', { ns: 'common' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('admin.issueDeeds.investorModal.expectedAnnualROI')}:</span>
                    <span className="font-semibold text-green-600">
                      {viewingInvestor.selectedProperty.expectedROI}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('admin.issueDeeds.investorModal.estimatedAnnualReturn')}:</span>
                    <span className="font-semibold text-green-600">
                      {((viewingInvestor.tokens * viewingInvestor.selectedProperty.tokenPrice * viewingInvestor.selectedProperty.expectedROI) / 100).toLocaleString()} {t('currency.sar', { ns: 'common' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
              <button
                onClick={() => setViewingInvestor(null)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                {t('admin.issueDeeds.investorModal.close')}
              </button>
              {viewingInvestor.tokens > (viewingInvestor.userDeedInfo?.totalIssuedTokens || 0) && (
                <button
                  onClick={() => {
                    issueSingleDeed(viewingInvestor.userId, viewingInvestor.selectedProperty.id, viewingInvestor.userName)
                    setViewingInvestor(null)
                  }}
                  disabled={issuing}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
                >
                  {t('admin.issueDeeds.investorModal.issueDeedForPendingTokens')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
