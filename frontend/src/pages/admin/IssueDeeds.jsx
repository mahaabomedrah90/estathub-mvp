import { useState, useEffect } from 'react'
import { FileText, Send, CheckCircle, AlertCircle, Users, TrendingUp, PieChart, Eye, X, ExternalLink, Download } from 'lucide-react'
import { fetchJson, authHeader } from '../../lib/api'

export default function IssueDeeds() {
  // ✅ NEW VERSION LOADED - Authentication and caching fixed!
  console.log('✅ IssueDeeds FIXED VERSION loaded!')
  
  const [properties, setProperties] = useState([])
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [investors, setInvestors] = useState([])
  const [issuedDeeds, setIssuedDeeds] = useState([])
  const [issuing, setIssuing] = useState(false)
  const [results, setResults] = useState([])
  const [existingDeeds, setExistingDeeds] = useState(new Map()) // Changed to Map to store deed details
  const [viewingProperty, setViewingProperty] = useState(null) // For property details modal
  const [viewingInvestor, setViewingInvestor] = useState(null) // For investor details modal

  // Calculate token status for a property
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
    console.log('🚀 IssueDeeds component mounted, forcing cache clear...')
    // Clear any potential caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          console.log('🗑️ Deleting cache:', name)
          caches.delete(name)
        })
      })
    }
    // Force reload after a short delay to ensure cache is cleared
    setTimeout(() => {
      console.log('⏰ Loading properties after cache clear...')
      loadProperties()
    }, 100)
  }, [])

  async function loadProperties() {
    try {
      console.log('🔍 Loading properties for deed issuance...')
      
      // Check authentication
      const token = localStorage.getItem('estathub_token')
      console.log('🔐 Auth token exists:', !!token)
      if (!token) {
        console.error('❌ No authentication token found')
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
      console.log('📡 Making API call to:', `${apiBase}/api/properties`)
      const response = await fetch(`${apiBase}/api/properties?t=${Date.now()}`, { headers })
      console.log('📡 Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('✅ Properties loaded:', data?.length || 0, 'properties')
      if (data && data.length > 0) {
        console.log('📊 Sample property:', data[0])
      }
      setProperties(data || [])
      
      // Load issued deeds for token status calculation
      try {
        const deedsResponse = await fetch(`${apiBase}/api/deeds?t=${Date.now()}`, { headers })
        if (deedsResponse.ok) {
        const deedsData = await deedsResponse.json()
        setIssuedDeeds(deedsData || [])
        console.log('✅ Issued deeds loaded:', deedsData?.length || 0, 'deeds')
        }
      } catch (deedErr) {
       console.warn('⚠️ Failed to load issued deeds:', deedErr)
 setIssuedDeeds([])
      }
    } catch (err) {
      console.error('❌ Failed to load properties:', err)
    }
  }

  async function loadInvestors(propertyId) {
    try {
          // Get all holdings for this property
      const holdings = await fetchJson(`/api/properties/${propertyId}/holdings?t=${Date.now()}`, { headers: { ...authHeader() } })
      console.log('✅ Investors loaded:', holdings?.length || 0, 'investors')
      setInvestors(holdings || [])
      
      // Get existing deeds for this property
      const deeds = await fetchJson(`/api/deeds?propertyId=${propertyId}&t=${Date.now()}`, { headers: { ...authHeader() } })
      // Store deed details including token count - group by userId to handle multiple deeds
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
          status: deed.status
        })
        userDeeds.totalIssuedTokens += deed.ownedTokens
      })
      setExistingDeeds(deedMap)
      console.log('✅ Existing deeds loaded:', deedMap.size, 'users with deeds')
       } catch (err) {
      console.error('❌ Failed to load investors:', err)
      setInvestors([])
      setExistingDeeds(new Map())
    }
  }

  async function issueDeed(userId, propertyId) {
    try {
      console.log(`📨 Issuing deed for user ${userId} and property ${propertyId}...`)
      const result = await fetchJson('/api/deeds/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ userId, propertyId })
      })
      // API already returns success: true, so just return the result
      return result
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async function issueSingleDeed(userId, propertyId, userName) {
    setIssuing(true)
    const result = await issueDeed(userId, propertyId)
    setResults([{
      investorName: userName,
      ...result
    }])
    // Refresh investors list to update deed status
 if (selectedProperty) {
 await loadInvestors(selectedProperty.id)
 }

    setIssuing(false)
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
 // Refresh issued deeds to update token status
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
    
    // Refresh investors list to update deed status
    if (selectedProperty) {
      await loadInvestors(selectedProperty.id)
    }
    
    setIssuing(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Issue Digital Deeds</h1>
        <p className="mt-2 text-gray-600">
          إصدار صكوك الملكية الرقمية للمستثمرين
        </p>
      </div>
{/* Token Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
 <div className="bg-white rounded-lg shadow p-6">
 <div className="flex items-center">
 <div className="p-3 bg-blue-100 rounded-lg">
 <PieChart className="h-6 w-6 text-blue-600" />
 </div>
 <div className="ml-4">
 <p className="text-sm font-medium text-gray-600">Total Properties</p>
 <p className="text-2xl font-bold text-gray-900">{properties.length}</p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-lg shadow p-6">
 <div className="flex items-center">
 <div className="p-3 bg-orange-100 rounded-lg">
 <TrendingUp className="h-6 w-6 text-orange-600" />
 </div>
 <div className="ml-4">
 <p className="text-sm font-medium text-gray-600">Pending Issuance</p>
 <p className="text-2xl font-bold text-orange-600">
 {properties.reduce((sum, p) => {
 const status = getTokenStatus(p)
 return sum + status.pending
 }, 0)}
 </p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-lg shadow p-6">
 <div className="flex items-center">
 <div className="p-3 bg-green-100 rounded-lg">
 <CheckCircle className="h-6 w-6 text-green-600" />
 </div>
 <div className="ml-4">
 <p className="text-sm font-medium text-gray-600">Already Issued</p>
 <p className="text-2xl font-bold text-green-600">
 {properties.reduce((sum, p) => {
 const status = getTokenStatus(p)
 return sum + status.issued
 }, 0)}
 </p>
 </div>
 </div>
 </div>
 </div>
      {/* Property Selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Property</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          className={`p-4 border-2 rounded-lg transition-all ${
          isSelected
          ? 'border-blue-500 bg-blue-50'
          : property.status === 'APPROVED'
          ? 'border-gray-200 hover:border-blue-300 cursor-pointer'
          : 'border-gray-200 opacity-50 cursor-not-allowed'
          }`}
          title={property.status !== 'APPROVED' ? 'Only approved properties can issue deeds' : ''}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{property.title || property.name}</h3>
              <p className="text-sm text-gray-600">{property.location}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setViewingProperty(property)
                }}
                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                title="View property details"
              >
                <Eye className="w-4 h-4 text-blue-600" />
              </button>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                property.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                property.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {property.status}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {property.totalTokens - property.remainingTokens} / {property.totalTokens} tokens sold
          </p>
        </div>

)
          })}
       </div>

      {/* Investors List */}
      {selectedProperty && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Investors ({investors.length})
            </h2>
            <button
              onClick={issueAllDeeds}
              disabled={issuing || investors.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Issue All Deeds
            </button>
          </div>

          {investors.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No investors found for this property
            </p>
          ) : (
            <div className="space-y-2">
              {investors.map((investor, idx) => {
                const userDeedInfo = existingDeeds.get(investor.userId)
                const totalIssuedTokens = userDeedInfo?.totalIssuedTokens || 0
                const pendingTokens = investor.tokens - totalIssuedTokens
                const needsIssuance = pendingTokens > 0
                const fullyIssued = pendingTokens === 0
                
                return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    needsIssuance ? 'border-orange-300 bg-orange-50' :
                    fullyIssued ? 'border-green-300 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{investor.userName}</p>
                      {fullyIssued && (
                        <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                          ✓ Fully Issued
                        </span>
                      )}
                      {needsIssuance && (
                        <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded-full">
                          ⚠ {pendingTokens} New Token{pendingTokens > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {investor.tokens} tokens ({((investor.tokens / selectedProperty.totalTokens) * 100).toFixed(2)}%)
                      {userDeedInfo && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({totalIssuedTokens} issued in {userDeedInfo.deeds.length} deed{userDeedInfo.deeds.length > 1 ? 's' : ''}
                          {needsIssuance && `, ${pendingTokens} pending`})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingInvestor({ ...investor, userDeedInfo, selectedProperty })}
                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                      title="View investor details"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => issueSingleDeed(investor.userId, selectedProperty.id, investor.userName)}
                      disabled={issuing || fullyIssued}
                      className={`px-4 py-2 text-sm rounded-lg ${
                        fullyIssued
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : needsIssuance
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400'
                      }`}
                    >
                      {fullyIssued ? 'Fully Issued' : needsIssuance ? `Issue ${pendingTokens} Token${pendingTokens > 1 ? 's' : ''}` : 'Issue Deed'}
                    </button>
                  </div>
                </div>
              )
              })}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Issuance Results
          </h2>
          <div className="space-y-2">
            {results.map((result, idx) => {
              const alreadyExists = result.alreadyExists || result.message?.includes('already exists')
              const bgColor = result.success ? (alreadyExists ? 'bg-yellow-50' : 'bg-green-50') : 'bg-red-50'
              const iconColor = result.success ? (alreadyExists ? 'text-yellow-600' : 'text-green-600') : 'text-red-600'
              const textColor = result.success ? (alreadyExists ? 'text-yellow-700' : 'text-green-700') : 'text-red-700'
              
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg ${bgColor}`}
                >
                  {result.success ? (
                    <CheckCircle className={`w-5 h-5 ${iconColor}`} />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{result.investorName}</p>
                    {result.success ? (
                      <p className={`text-sm ${textColor}`}>
                        {alreadyExists ? (
                          <>
                            Deed already exists: {result.deed?.deedNumber}
                            <span className="ml-2 text-xs">(Skipped)</span>
                          </>
                        ) : (
                          <>Deed issued: {result.deed?.deedNumber}</>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-red-700">
                        Error: {result.error}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Property Details Modal */}
      {viewingProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Property Details</h2>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Property Name</p>
                    <p className="font-medium">{viewingProperty.title || viewingProperty.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium">{viewingProperty.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">City</p>
                    <p className="font-medium">{viewingProperty.city || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">District</p>
                    <p className="font-medium">{viewingProperty.district || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      viewingProperty.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      viewingProperty.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {viewingProperty.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Property Type</p>
                    <p className="font-medium">{viewingProperty.propertyTypeDetailed || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Specification</h3>
                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Land Area</p>
                    <p className="font-medium">{viewingProperty.landArea ? `${viewingProperty.landArea} m²` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Built Area</p>
                    <p className="font-medium">{viewingProperty.builtArea ? `${viewingProperty.builtArea} m²` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Building Age</p>
                    <p className="font-medium">{viewingProperty.buildingAge ? `${viewingProperty.buildingAge} years` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Floors</p>
                    <p className="font-medium">{viewingProperty.floorsCount || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Units</p>
                    <p className="font-medium">{viewingProperty.unitsCount || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Condition</p>
                    <p className="font-medium">{viewingProperty.propertyCondition || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Financial & Tokenization</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Market Value</p>
                    <p className="font-medium text-lg">{viewingProperty.marketValue ? `${viewingProperty.marketValue.toLocaleString()} SAR` : `${viewingProperty.totalValue?.toLocaleString()} SAR`}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expected ROI</p>
                    <p className="font-medium text-lg">{viewingProperty.expectedROI}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Tokens</p>
                    <p className="font-medium">{viewingProperty.totalTokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Token Price</p>
                    <p className="font-medium">{viewingProperty.tokenPrice} SAR</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tokens Sold</p>
                    <p className="font-medium">{(viewingProperty.totalTokens - viewingProperty.remainingTokens).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Owner Retained</p>
                    <p className="font-medium">{viewingProperty.ownerRetainedPercentage || 0}%</p>
                  </div>
                </div>
              </div>

              {/* Owner Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Owner Information</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Owner Name</p>
                    <p className="font-medium">{viewingProperty.ownerName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Owner Type</p>
                    <p className="font-medium">{viewingProperty.ownerType || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">National ID / CR</p>
                    <p className="font-medium">{viewingProperty.nationalIdOrCR || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{viewingProperty.ownerPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{viewingProperty.ownerEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">IBAN</p>
                    <p className="font-medium font-mono text-sm">{viewingProperty.ownerIban || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Legal Documents */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Legal Documents</h3>
                <div className="grid grid-cols-2 gap-3">
                  {viewingProperty.deedDocumentUrl && (
                    <a
                      href={`${import.meta.env.VITE_API_BASE}${viewingProperty.deedDocumentUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Property Deed</span>
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
                      <span className="text-sm font-medium text-blue-900">Site Plan</span>
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
                      <span className="text-sm font-medium text-blue-900">Building Permit</span>
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
                      <span className="text-sm font-medium text-blue-900">Valuation Report</span>
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
                      <span className="text-sm font-medium text-blue-900">Owner ID</span>
                      <ExternalLink className="w-4 h-4 text-blue-600 ml-auto" />
                    </a>
                  )}
                </div>
              </div>

              {/* Property Images */}
              {viewingProperty.mainImagesUrls && viewingProperty.mainImagesUrls.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Property Images</h3>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
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
                Close
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
              <h2 className="text-2xl font-bold text-gray-900">Investor Details</h2>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Investor Information</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{viewingInvestor.userName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{viewingInvestor.userEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">User ID</p>
                    <p className="font-medium font-mono text-sm">{viewingInvestor.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Investment Date</p>
                    <p className="font-medium">{viewingInvestor.purchasedAt ? new Date(viewingInvestor.purchasedAt).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Property Investment Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Investment in: {viewingInvestor.selectedProperty?.title || viewingInvestor.selectedProperty?.name}</h3>
                <div className="grid grid-cols-3 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div>
                    <p className="text-sm text-gray-600">Tokens Owned</p>
                    <p className="font-bold text-2xl text-blue-900">{viewingInvestor.tokens}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ownership %</p>
                    <p className="font-bold text-2xl text-blue-900">
                      {((viewingInvestor.tokens / viewingInvestor.selectedProperty.totalTokens) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Investment Value</p>
                    <p className="font-bold text-2xl text-blue-900">
                      {(viewingInvestor.tokens * viewingInvestor.selectedProperty.tokenPrice).toLocaleString()} SAR
                    </p>
                  </div>
                </div>
              </div>

              {/* Deed Issuance Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Deed Issuance Status</h3>
                {viewingInvestor.userDeedInfo && viewingInvestor.userDeedInfo.deeds.length > 0 ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-green-900">
                          {viewingInvestor.userDeedInfo.totalIssuedTokens} tokens issued in {viewingInvestor.userDeedInfo.deeds.length} deed{viewingInvestor.userDeedInfo.deeds.length > 1 ? 's' : ''}
                        </p>
                        {viewingInvestor.tokens > viewingInvestor.userDeedInfo.totalIssuedTokens && (
                          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                            {viewingInvestor.tokens - viewingInvestor.userDeedInfo.totalIssuedTokens} Pending
                          </span>
                        )}
                      </div>
                      {/* List of issued deeds */}
                      <div className="space-y-2">
                        {viewingInvestor.userDeedInfo.deeds.map((deed, index) => (
                          <div key={index} className="bg-white p-3 rounded border border-green-300">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-mono text-sm font-semibold text-gray-900">{deed.deedNumber}</p>
                                <p className="text-xs text-gray-600">{deed.ownedTokens} token{deed.ownedTokens > 1 ? 's' : ''}</p>
                              </div>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                deed.status === 'ISSUED' ? 'bg-green-100 text-green-800' :
                                deed.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {deed.status}
                              </span>
                            </div>
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
                        <p className="font-medium text-orange-900">No deeds issued yet</p>
                        <p className="text-sm text-orange-700">
                          {viewingInvestor.tokens} token{viewingInvestor.tokens > 1 ? 's' : ''} pending deed issuance
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Transaction Summary */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Transaction Summary</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Token Price:</span>
                    <span className="font-semibold">{viewingInvestor.selectedProperty.tokenPrice} SAR</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tokens Purchased:</span>
                    <span className="font-semibold">{viewingInvestor.tokens}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                    <span className="text-gray-900 font-medium">Total Investment:</span>
                    <span className="font-bold text-lg">
                      {(viewingInvestor.tokens * viewingInvestor.selectedProperty.tokenPrice).toLocaleString()} SAR
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Expected Annual ROI:</span>
                    <span className="font-semibold text-green-600">
                      {viewingInvestor.selectedProperty.expectedROI}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Estimated Annual Return:</span>
                    <span className="font-semibold text-green-600">
                      {((viewingInvestor.tokens * viewingInvestor.selectedProperty.tokenPrice * viewingInvestor.selectedProperty.expectedROI) / 100).toLocaleString()} SAR
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
                Close
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
                  Issue Deed for Pending Tokens
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}