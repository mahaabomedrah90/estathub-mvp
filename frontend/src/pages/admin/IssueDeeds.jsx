import { useState, useEffect } from 'react'
import { FileText, Send, CheckCircle, AlertCircle, Users, TrendingUp, PieChart } from 'lucide-react'
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
            <div>
              <h3 className="font-semibold text-gray-900">{property.name}</h3>
              <p className="text-sm text-gray-600">{property.location}</p>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
              property.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
              property.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {property.status}
            </span>
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
                  <div>
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
      </div>
    </div>
  )
}