import React, { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'
import { authHeader, fetchJson, getToken } from '../lib/api'

// Mask property ID for public view
const maskPropertyId = (id) => {
  if (!id || typeof id !== 'string') return id
  if (id.length <= 8) return id
  return id.substring(0, 8) + '**********' + id.substring(id.length - 8)
}

export default function BlockchainExplorer() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('events')
  
  // Data states
  const [onChainEvents, setOnChainEvents] = useState([])
  const [properties, setProperties] = useState([])
  const [certificates, setCertificates] = useState([])
  const [transactions, setTransactions] = useState([])

  async function loadBlockchainData() {
    try {
      setError('')
      setLoading(true)

      console.log('🔗 Loading blockchain data...')
 // Fetch all blockchain-related data with individual error handling
 const results = await Promise.allSettled([
        fetchJson('/api/blockchain/events', { headers: { ...authHeader() } }),
        fetchJson('/api/blockchain/properties', { headers: { ...authHeader() } }),
        fetchJson('/api/blockchain/certificates', { headers: { ...authHeader() } }),
        fetchJson('/api/blockchain/transactions', { headers: { ...authHeader() } }),
      ])

      // Extract results with fallbacks
 const eventsRes = results[0].status === 'fulfilled' ? results[0].value : { events: [] }
 const propsRes = results[1].status === 'fulfilled' ? results[1].value : { properties: [] }
 const certsRes = results[2].status === 'fulfilled' ? results[2].value : { certificates: [] }
 const txnsRes = results[3].status === 'fulfilled' ? results[3].value : { transactions: [] }
 // Log any failures
 results.forEach((result, index) => {
 if (result.status === 'rejected') {
 console.error(`❌ Failed to load ${['events', 'properties', 'certificates', 'transactions'][index]}:`, result.reason)
 }
 })
 console.log('✅ Blockchain data loaded:', {
 events: eventsRes.events?.length || 0,
 properties: propsRes.properties?.length || 0,
 certificates: certsRes.certificates?.length || 0,
 transactions: txnsRes.transactions?.length || 0
 })
 setOnChainEvents(Array.isArray(eventsRes.events) ? eventsRes.events : [])
 setProperties(Array.isArray(propsRes.properties) ? propsRes.properties : [])
 setCertificates(Array.isArray(certsRes.certificates) ? certsRes.certificates : [])
 setTransactions(Array.isArray(txnsRes.transactions) ? txnsRes.transactions : [])
    } catch (e) {
      console.error('❌ Unexpected error loading blockchain data:', e)
      setError('Failed to load blockchain data: ' + (e.message || 'Unknown error'))
      // Set empty arrays to prevent crashes
      setOnChainEvents([])
      setProperties([])
      setCertificates([])
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (getToken()) loadBlockchainData()
  }, [])

  if (!getToken()) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please login to view blockchain transactions.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading blockchain data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadBlockchainData}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try Again
        </button>
      </div>
    )
  }

  const tabs = [
    { id: 'events', label: 'On-Chain Events', count: onChainEvents.length },
    { id: 'properties', label: 'Properties', count: properties.length },
    { id: 'certificates', label: 'Certificates', count: certificates.length },
    { id: 'transactions', label: 'Transactions', count: transactions.length },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">⛓️ Blockchain Explorer</h1>
          <p className="mt-1 text-sm text-gray-600">
            View all blockchain transactions and on-chain events
          </p>
        </div>
        <button
          onClick={loadBlockchainData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6">
          <div className="text-sm opacity-90">On-Chain Events</div>
          <div className="text-3xl font-bold mt-2">{onChainEvents.length}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6">
          <div className="text-sm opacity-90">Blockchain Properties</div>
          <div className="text-3xl font-bold mt-2">
            {properties.filter(p => p.blockchainTxId).length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6">
          <div className="text-sm opacity-90">Blockchain Certificates</div>
          <div className="text-3xl font-bold mt-2">
            {certificates.filter(c => c.blockchainTxId).length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6">
          <div className="text-sm opacity-90">Token Mints</div>
          <div className="text-3xl font-bold mt-2">
            {transactions.filter(t => t.blockchainTxId && t.type === 'TOKEN_MINT').length}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'events' && <OnChainEventsTab events={onChainEvents} />}
        {activeTab === 'properties' && <PropertiesTab properties={properties} />}
        {activeTab === 'certificates' && <CertificatesTab certificates={certificates} />}
        {activeTab === 'transactions' && <TransactionsTab transactions={transactions} />}
      </div>
    </div>
  )
}

// On-Chain Events Tab
function OnChainEventsTab({ events }) {
  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No on-chain events recorded yet. Create a property or mint tokens to see events here.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {events.map(event => (
            <tr key={event.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <div className="flex items-center gap-1">
                  <Shield size={12} />
                  <span>{maskPropertyId(event.id)}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {event.type}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">
                  {event.txId}
                </code>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {event.userId && <div>User: {event.userId}</div>}
{event.propertyId && (
 <div className="flex items-center gap-1">
 <Shield size={12} />
 <span>Property: {maskPropertyId(event.propertyId)}</span>
 </div>
 )}                {event.orderId && <div>Order: {event.orderId}</div>}
                {event.payload && (
                  <div className="text-xs mt-1">
                    {JSON.stringify(event.payload)}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(event.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Properties Tab
function PropertiesTab({ properties }) {
const blockchainProps = properties.filter(p => p && p.blockchainTxId)
  if (blockchainProps.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No properties on blockchain yet. Create a property with Fabric enabled to see it here.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Tokens</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blockchain TxID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {blockchainProps.map(prop => (
            <tr key={prop.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <div className="flex items-center gap-1">
                <Shield size={12} />
                <span>{maskPropertyId(prop.id)}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">{prop.title}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {prop.totalTokens.toLocaleString()}
              </td>
              <td className="px-6 py-4 text-sm">
                <code className="bg-green-50 text-green-800 px-2 py-1 rounded text-xs break-all">
                  {prop.blockchainTxId}
                </code>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(prop.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Certificates Tab
function CertificatesTab({ certificates }) {
const blockchainCerts = certificates.filter(c => c && c.blockchainTxId)

  if (blockchainCerts.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No blockchain certificates yet. Complete an order with Fabric enabled to see certificates here.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certificate Code</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blockchain TxID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {blockchainCerts.map(cert => (
            <tr key={cert.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-mono text-gray-900">
                {cert.code.substring(0, 8)}...
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">{cert.userEmail}</td>
              <td className="px-6 py-4 text-sm text-gray-900">{cert.propertyTitle}</td>
              <td className="px-6 py-4 text-sm">
                <code className="bg-purple-50 text-purple-800 px-2 py-1 rounded text-xs break-all">
                  {cert.blockchainTxId}
                </code>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(cert.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Transactions Tab
function TransactionsTab({ transactions }) {
  // Filter to show only blockchain transactions
const blockchainTxns = transactions.filter(t => t && t.blockchainTxId)
  if (blockchainTxns.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No blockchain transactions yet. Mint tokens or register properties to see on-chain transactions here.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blockchain TxID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {blockchainTxns.map(txn => (
            <tr key={txn.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                #{txn.id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  txn.type === 'TOKEN_MINT' ? 'bg-green-100 text-green-800' :
                  txn.type === 'DEPOSIT' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {txn.type}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">{txn.userEmail}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {txn.tokens ? `${txn.tokens} tokens` : `${(txn.amount || 0).toLocaleString()} SAR`}
              </td>
              <td className="px-6 py-4 text-sm">
                {txn.blockchainTxId ? (
                  <code className="bg-orange-50 text-orange-800 px-2 py-1 rounded text-xs break-all">
                    {txn.blockchainTxId}
                  </code>
                ) : (
                  <span className="text-gray-400 text-xs">Database only</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">{txn.note || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(txn.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
