import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Shield,
  Building2,
  Users,
  FileText,
  Coins,
  Activity,
  Clock,
  FileCheck,
  History,
  ListTree,
  Database,
  Eye,
  EyeOff,
  Info
} from 'lucide-react'
import { authHeader, fetchJson, getToken } from '../lib/api'
import KpiCard from '../components/KpiCard'
import TimelineEvent from '../components/TimelineEvent'
import RegulatorToggle from '../components/RegulatorToggle'


// --------- Tab Components ---------
const PropertiesTab = ({ properties, regulatorMode }) => {
  const { t } = useTranslation('pages')
  
  if (!properties.length) {
    return (
      <div className="p-12 text-center text-gray-500 text-base">
        {t('blockchainExplorer.noProperties')}
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {properties.map((property) => (
        <div key={property.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#1E1958] mb-2">{property.name || 'Unnamed Property'}</h3>
              <p className="text-sm text-gray-600 mb-1">ID: {maskPropertyId(property.id)}</p>
              {property.ownerName && (
                <p className="text-sm text-gray-700">
                  {t('blockchainExplorer.owner')}: {property.ownerName}
                </p>
              )}
            </div>
            {regulatorMode && property.ownerId && (
              <span className="text-sm bg-[#41EAD4]/10 text-[#41EAD4] px-4 py-2 rounded-xl border border-[#41EAD4]/20">
                {t('blockchainExplanner.ownerId')}: {maskNationalId(property.ownerId)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const CertificatesTab = ({ certificates, regulatorMode }) => {
  const { t } = useTranslation('pages')
  
  if (!certificates.length) {
    return (
      <div className="p-12 text-center text-gray-500 text-base">
        {t('blockchainExplorer.noCertificates')}
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {certificates.map((cert) => (
        <div key={cert.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#1E1958] mb-2">{cert.type || 'Certificate'}</h3>
              <p className="text-sm text-gray-600 mb-1">ID: {maskPropertyId(cert.id)}</p>
              {cert.propertyId && (
                <p className="text-sm text-gray-700 mb-1">
                  {t('blockchainExplorer.property')}: {maskPropertyId(cert.propertyId)}
                </p>
              )}
              {cert.issuer && (
                <p className="text-sm text-gray-700">
                  {t('blockchainExplorer.issuer')}: {cert.issuer}
                </p>
              )}
            </div>
            {regulatorMode && cert.ownerId && (
              <span className="text-sm bg-[#986F9A]/10 text-[#986F9A] px-4 py-2 rounded-xl border border-[#986F9A]/20">
                {t('blockchainExplorer.ownerId')}: {maskNationalId(cert.ownerId)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const TransactionsTab = ({ transactions, regulatorMode }) => {
  const { t } = useTranslation('pages')
  
  if (!transactions.length) {
    return (
      <div className="p-12 text-center text-gray-500 text-base">
        {t('blockchainExplorer.noTransactions')}
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {transactions.map((tx) => (
        <div key={tx.txId} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#1E1958] mb-2">
                {humanizeEventType(tx.type) || 'Transaction'}
              </h3>
              <p className="text-sm text-gray-600 mb-1">
                {t('blockchainExplorer.txId')}: {maskPropertyId(tx.txId)}
              </p>
              <p className="text-sm text-gray-700">
                {formatRelativeTime(tx.timestamp, t)}
              </p>
            </div>
            <div className="ml-4">
              {eventIconForType(tx.type)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Mask property ID for public view
const maskPropertyId = (id) => {
  if (!id || typeof id !== 'string') return id
  if (id.length <= 8) return id
  return id.substring(0, 4) + '••••••' + id.substring(id.length - 4)
}

const maskNationalId = (value) => {
  if (!value) return ''
  const str = String(value)
  if (str.length <= 4) return '***' + str
  return '***-***-' + str.slice(-4)
}



const cleanFabricJson = (input) => {
  if (!input) return null

  let obj = input
  if (typeof input === 'string') {
    try {
      obj = JSON.parse(input)
    } catch {
      // fall back to raw string
      return input
    }
  }

  const forbiddenKeys = [
    'txId',
    'transactionId',
    'channel',
    'chaincode',
    'blockNumber',
    'creator',
    'mspId',
    'timestamp',
    'nonce',
    'version',
    'eventName',
    'eventPayload'
  ]

  const clean = (val) => {
    if (Array.isArray(val)) return val.map(clean)
    if (val && typeof val === 'object') {
      const out = {}
      for (const [k, v] of Object.entries(val)) {
        if (forbiddenKeys.includes(k)) continue
        out[k] = clean(v)
      }
      return out
    }
    return val
  }

  return clean(obj)
}

const prettyJson = (value) => {
  const cleaned = cleanFabricJson(value)
  if (typeof cleaned === 'string') return cleaned
  try {
    return JSON.stringify(cleaned, null, 2)
  } catch {
    return String(value)
  }
}

// Parse event.details / event.payload and normalize a few fields
const parseEventDetails = (event) => {
  let details = event?.details || event?.payload || null

  if (typeof details === 'string') {
    try {
      details = JSON.parse(details)
    } catch {
      details = { raw: details }
    }
  }

  if (!details || typeof details !== 'object') return { details: null }

  const propertyName =
    details.propertyTitle ||
    details.propertyName ||
    details.title ||
    details.name ||
    null

  const ownerName =
    details.ownerName ||
    details.owner ||
    details.sellerName ||
    details.landlordName ||
    null

  const investorName =
    details.investorName ||
    details.investor ||
    details.buyerName ||
    null

  const userName =
    details.userName ||
    details.userFullName ||
    ownerName ||
    investorName ||
    null

  const userEmail = details.userEmail || details.investorEmail || null
  const nationalId =
    details.nationalId || details.nin || details.idNumber || null
  const legalDeedNumber =
    details.deedNumber || details.legalDeedNumber || details.deedId || null
  const location =
    details.location ||
    details.city ||
    details.address ||
    details.propertyLocation ||
    null

  return {
    details,
    propertyName,
    ownerName,
    investorName,
    userName,
    userEmail,
    nationalId,
    legalDeedNumber,
    location
  }
}

const humanizeEventType = (type) => {
  if (!type) return 'Blockchain Event'
  switch (type) {
    case 'PROPERTY_CREATED':
    case 'PROPERTY_REGISTERED':
      return 'Property Added'
    case 'PROPERTY_UPDATED':
      return 'Property Updated'
    case 'TOKEN_MINT':
    case 'TOKENS_MINTED':
      return 'Tokens Minted'
    case 'CERTIFICATE_ISSUED':
    case 'DEED_ISSUED':
      return 'Digital Certificate Issued'
    case 'TRANSFER':
    case 'OWNERSHIP_TRANSFER':
      return 'Ownership Transferred'
    default:
      return type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
  }
}

const eventIconForType = (type) => {
  switch (type) {
    case 'PROPERTY_CREATED':
    case 'PROPERTY_REGISTERED':
      return Building2
    case 'TOKEN_MINT':
    case 'TOKENS_MINTED':
      return Coins
    case 'CERTIFICATE_ISSUED':
    case 'DEED_ISSUED':
      return FileText
    case 'TRANSFER':
    case 'OWNERSHIP_TRANSFER':
      return Users
    default:
      return Activity
  }
}

// --------- Main Component ---------

export default function BlockchainExplorer() {
  const { t, i18n } = useTranslation('pages')
  const isArabic = i18n.language === 'ar'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('timeline')
  const [regulatorMode, setRegulatorMode] = useState(false)

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
      const results = await Promise.allSettled([
        fetchJson('/api/blockchain/events', { headers: { ...authHeader() } }),
        fetchJson('/api/blockchain/properties', { headers: { ...authHeader() } }),
        fetchJson('/api/blockchain/certificates', { headers: { ...authHeader() } }),
        fetchJson('/api/blockchain/transactions', { headers: { ...authHeader() } })
      ])

      const eventsRes =
        results[0].status === 'fulfilled' ? results[0].value : { events: [] }
      const propsRes =
        results[1].status === 'fulfilled' ? results[1].value : { properties: [] }
      const certsRes =
        results[2].status === 'fulfilled' ? results[2].value : { certificates: [] }
      const txnsRes =
        results[3].status === 'fulfilled' ? results[3].value : { transactions: [] }

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(
            `❌ Failed to load ${['events', 'properties', 'certificates', 'transactions'][index]}:`,
            result.reason
          )
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
      setCertificates(
        Array.isArray(certsRes.certificates) ? certsRes.certificates : []
      )
      setTransactions(
        Array.isArray(txnsRes.transactions) ? txnsRes.transactions : []
      )
    } catch (e) {
      console.error('❌ Unexpected error loading blockchain data:', e)
      setError('Failed to load blockchain data: ' + (e.message || 'Unknown error'))
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

  // Derived data for KPIs and views
  const blockchainProperties = useMemo(
    () => properties.filter((p) => p && p.blockchainTxId),
    [properties]
  )

  const blockchainCertificates = useMemo(
    () => certificates.filter((c) => c && c.blockchainTxId),
    [certificates]
  )

  const blockchainTransactions = useMemo(
    () => transactions.filter((t) => t && t.blockchainTxId),
    [transactions]
  )

  const mintTransactions = useMemo(
    () =>
      blockchainTransactions.filter(
        (t) => t.type === 'TOKEN_MINT' || t.type === 'TOKENS_MINTED'
      ),
    [blockchainTransactions]
  )

  const uniqueOwners = useMemo(() => {
    const set = new Set()
    properties.forEach((p) => {
      if (p?.ownerName) set.add(p.ownerName)
      if (p?.ownerEmail) set.add(p.ownerEmail)
    })
    return set.size
  }, [properties])

  const uniqueInvestors = useMemo(() => {
    const set = new Set()
    certificates.forEach((c) => {
      if (c?.userEmail) set.add(c.userEmail)
      if (c?.investorEmail) set.add(c.investorEmail)
    })
    transactions.forEach((t) => {
      if (t?.userEmail) set.add(t.userEmail)
      if (t?.investorEmail) set.add(t.investorEmail)
    })
    return set.size
  }, [certificates, transactions])

  const sortedEvents = useMemo(
    () =>
      [...onChainEvents].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      ),
    [onChainEvents]
  )

  if (!getToken()) {
    return (
      <div className="p-8 text-center text-text-muted">
        <Database className="w-12 h-12 mx-auto text-border-soft" />
        <p className="mt-2 text-sm">
          {error || (isArabic
            ? 'لا توجد أحداث مسجلة على سلسلة الكتل حتى الآن'
            : 'No blockchain events have been recorded yet.')}
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent" />
        <p className="mt-4 text-text-muted text-sm">
          {isArabic
            ? 'جاري تحميل أحداث البلوكشين...'
            : 'Loading blockchain events...'}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-red-800 text-sm">{error}</p>
        <button
          onClick={loadBlockchainData}
          className="mt-3 text-sm text-red-700 hover:text-red-900 underline"
        >
          {t('blockchainExplorer.actions.tryAgain')}
        </button>
      </div>
    )
  }

  const tabs = [
    {
      id: 'timeline',
      label: isArabic ? 'الخط الزمني' : 'Timeline',
      icon: History
    },
    {
      id: 'properties',
      label: isArabic ? 'العقارات' : 'Properties',
      icon: Building2
    },
    {
      id: 'certificates',
      label: isArabic ? 'الصكوك' : 'Certificates',
      icon: FileText
    },
    {
      id: 'transactions',
      label: isArabic ? 'المعاملات' : 'Transactions',
      icon: Activity
    }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'timeline':
        return (
          <div className="p-8 lg:p-8 space-y-6">
            {sortedEvents.length === 0 ? (
              <div className="text-center text-gray-500 text-base py-12">
                {isArabic
                  ? 'لا توجد أحداث مسجلة على سلسلة الكتل حتى الآن'
                  : 'No blockchain events have been recorded yet.'}
              </div>
            ) : (
              <div className="space-y-6">
                {sortedEvents.map((event) => {
                  const parsed = parseEventDetails(event)
                  const humanType = humanizeEventType(event.type)
                  const icon = eventIconForType(event.type)

                  const descriptionLines = []

                  if (
                    event.type === 'PROPERTY_CREATED' ||
                    event.type === 'PROPERTY_REGISTERED'
                  ) {
                    descriptionLines.push(
                      `Property "${parsed.propertyName || maskPropertyId(event.propertyId) || 'Unknown Property'}" was submitted and added to blockchain.`
                    )
                  } else if (
                    event.type === 'TOKEN_MINT' ||
                    event.type === 'TOKENS_MINTED'
                  ) {
                    descriptionLines.push(
                      `Tokens were minted on property "${parsed.propertyName || maskPropertyId(event.propertyId) || 'Unknown Property'}".`
                    )
                  } else if (
                    event.type === 'CERTIFICATE_ISSUED' ||
                    event.type === 'DEED_ISSUED'
                  ) {
                    descriptionLines.push(
                      `A digital ownership certificate was issued for "${parsed.propertyName || 'Unknown Property'}".`
                    )
                  } else {
                    descriptionLines.push(
                      `Blockchain event recorded for "${parsed.propertyName || 'Unknown Property'}".`
                    )
                  }

                  if (parsed.userName || parsed.ownerName || parsed.investorName) {
                    descriptionLines.push(
                      `By: ${
                        parsed.userName ||
                        parsed.ownerName ||
                        parsed.investorName
                      }`
                    )
                  } else if (event.userId) {
                    descriptionLines.push(`User: ${event.userId}`)
                  }

                  const when = new Date(event.createdAt).toLocaleString()

                  return (
                    <TimelineEvent
                      key={event.id}
                      icon={icon}
                      title={humanType}
                      eventType={event.type}
                      timestamp={when}
                      relativeTime={formatRelativeTime(event.createdAt, t)}
                      description={descriptionLines.join(' ')}
                      regulatorMode={regulatorMode}
                      regulatorDetails={{
                        propertyName:
                          parsed.propertyName ||
                          event.propertyTitle ||
                          maskPropertyId(event.propertyId),
                        ownerName: parsed.ownerName,
                        investorName: parsed.investorName,
                        userName: parsed.userName,
                        userEmail: parsed.userEmail,
                        nationalId: parsed.nationalId,
                        legalDeedNumber: parsed.legalDeedNumber,
                        location: parsed.location,
                        badges: [
                          'Verified on Blockchain (Immutable)',
                          'Property Audit Trail Available'
                        ]
                      }}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )

      case 'properties':
        return (
          <PropertiesTab
            properties={blockchainProperties}
            regulatorMode={regulatorMode}
          />
        )

      case 'certificates':
        return (
          <CertificatesTab
            certificates={blockchainCertificates}
            regulatorMode={regulatorMode}
          />
        )

      case 'transactions':
        return (
          <TransactionsTab
            transactions={blockchainTransactions}
            regulatorMode={regulatorMode}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#1E1958] mb-3">
            ⛓️ {isArabic ? 'مستكشف البلوكشين' : 'Blockchain Explorer'}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            {isArabic
              ? 'عرض تفاعلي لجميع الأحداث والعمليات المسجلة على سلسلة الكتل.'
              : 'Interactive view of all blockchain events and transactions.'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={loadBlockchainData}
            className="inline-flex items-center gap-3 px-8 py-4 border-2 border-[#41EAD4] bg-gradient-to-r from-[#41EAD4] to-[#2DD4BF] text-white font-semibold rounded-xl hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#41EAD4] focus:ring-offset-2 transition-all"
          >
            <Clock className="w-5 h-5" />
            {isArabic ? 'تحديث البيانات' : 'Refresh data'}
          </button>
        </div>
      </div>

      {/* Regulator View (Beta) */}
      <div className="bg-gradient-to-r from-[#1E1958] to-[#2D2563] text-white rounded-2xl p-8 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shadow-lg border border-white/10">
        <div className="flex items-start gap-4">
          <div className="mt-1">
            <div className="p-3 bg-[#41EAD4]/10 rounded-xl">
              <Shield className="w-6 h-6 text-[#41EAD4]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold">
                🛡️ {isArabic ? 'واجهة المنظّم (تجريبية)' : 'Regulator view (beta)'}
              </h2>
              <span className="inline-flex items-center rounded-full bg-[#41EAD4]/20 px-3 py-1 text-sm font-medium text-[#41EAD4] border border-[#41EAD4]/30">
                {isArabic
                  ? 'عرض مفصّل للأحداث والمعاملات مع بيانات إضافية للجهات التنظيمية.'
                  : 'Detailed blockchain view with extra insights for regulators.'}
              </span>
            </div>
            <p className="mt-2 text-gray-300 max-w-xl">
              {isArabic
                ? 'يمكنك تفعيل وضع المنظّم لرؤية تفاصيل أعمق مع الحفاظ على إخفاء هوية الأطراف.'
                : 'Enable regulator mode to see deeper details while preserving user privacy.'}
            </p>
            {regulatorMode && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#41EAD4]/20 px-3 py-1.5 text-white/90 border border-[#41EAD4]/40">
                  <FileCheck className="w-4 h-4" />
                  {isArabic ? 'موثّق على البلوكشين' : 'Verified on blockchain'}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-white/80 border border-white/20">
                  <History className="w-4 h-4" />
                  {isArabic ? 'سجل تدقيق العقار' : 'Property audit trail'}
                </span>
              </div>
            )}
          </div>
        </div>
        <RegulatorToggle
          enabled={regulatorMode}
          onChange={setRegulatorMode}
          className="self-start sm:self-end"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
        <KpiCard
          title={isArabic ? 'إجمالي الأحداث' : 'Total events'}
          value={onChainEvents.length}
          icon={ListTree}
          tone="deep-twilight"
          tooltip={isArabic
            ? 'عدد جميع الأحداث المسجلة على البلوكشين.'
            : 'Total number of recorded blockchain events.'}
        />
        <KpiCard
          title={isArabic ? 'العقارات على البلوكشين' : 'Properties on-chain'}
          value={blockchainProperties.length}
          icon={Building2}
          tone="teal"
          tooltip={isArabic
            ? 'عدد العقارات المرتبطة بمعاملات على البلوكشين.'
            : 'Number of properties linked to blockchain transactions.'}
        />
        <KpiCard
          title={isArabic ? 'الصكوك الرقمية' : 'Digital certificates'}
          value={blockchainCertificates.length}
          icon={FileText}
          tone="purple"
          tooltip={isArabic
            ? 'عدد الصكوك أو الشهادات الرقمية الموثّقة.'
            : 'Number of digital ownership certificates on-chain.'}
        />
        <KpiCard
          title={isArabic ? 'إجمالي المعاملات' : 'Total transactions'}
          value={blockchainTransactions.length}
          icon={Activity}
          tone="coral"
          tooltip={isArabic
            ? 'إجمالي المعاملات المرتبطة بالبلوكشين.'
            : 'Total blockchain-linked transactions.'}
        />
        <KpiCard
          title={isArabic ? 'عدد المالكين' : 'Unique owners'}
          value={uniqueOwners}
          icon={Users}
          tone="sand"
          tooltip={isArabic
            ? 'عدد المالكين الفريدين الذين لديهم عقارات على البلوكشين.'
            : 'Distinct owners with properties on-chain.'}
        />
        <KpiCard
          title={isArabic ? 'عدد المستثمرين' : 'Unique investors'}
          value={uniqueInvestors}
          icon={Users}
          tone="teal"
          tooltip={isArabic
            ? 'عدد المستثمرين الفريدين الذين ظهرت لهم معاملات.'
            : 'Distinct investors seen in blockchain events.'}
        />
        <KpiCard
          title={isArabic
            ? 'إجمالي السجلات المرتبطة بالبلوكشين'
            : 'Total blockchain-linked records'}
          value={
            onChainEvents.length +
            blockchainProperties.length +
            blockchainCertificates.length +
            blockchainTransactions.length
          }
          icon={Database}
          tone="deep-twilight"
          tooltip={isArabic
            ? 'مجموع جميع السجلات المرتبطة بسلسلة الكتل (أحداث + عقارات + صكوك + معاملات).'
            : 'Sum of all records linked to blockchain (events, properties, certificates, transactions).'}
        />
      </div>

      {/* Tabs */}
      <div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-4 px-6 border-b-2 font-semibold text-base flex items-center gap-3 transition-all ${
                    isActive
                      ? 'border-[#41EAD4] text-[#41EAD4]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}