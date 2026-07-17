import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchJson } from '../../lib/api'
import { PieChart, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

export default function AdminDistributions() {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'

  const [properties, setProperties] = useState([])
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form state
  const [propertyId, setPropertyId] = useState('')
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [totalAmount, setTotalAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  // Expanded payout rows
  const [expanded, setExpanded] = useState(new Set())

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [propsRes, payoutsRes] = await Promise.all([
        fetchJson('/api/properties?status=APPROVED'),
        fetchJson('/api/admin/distributions'),
      ])
      // Without limit param → plain array; with limit → { data: [...] }
      const propsArr = Array.isArray(propsRes) ? propsRes : (Array.isArray(propsRes?.data) ? propsRes.data : [])
      setProperties(propsArr)
      setPayouts(Array.isArray(payoutsRes?.payouts) ? payoutsRes.payouts : [])
    } catch (e) {
      setError(isAr ? 'فشل تحميل البيانات' : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [isAr])

  useEffect(() => { loadData() }, [loadData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!propertyId || !month || !totalAmount) return
    const confirmed = window.confirm(
      isAr
        ? `تأكيد توزيع ${Number(totalAmount).toLocaleString('ar-SA')} ر.س على مستثمري العقار للشهر ${month}؟`
        : `Confirm distributing SAR ${Number(totalAmount).toLocaleString()} to property investors for ${month}?`
    )
    if (!confirmed) return

    setSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')
    try {
      const result = await fetchJson('/api/admin/distributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, month, totalAmount: Number(totalAmount) }),
      })
      setSubmitSuccess(
        isAr
          ? `تم توزيع الأرباح بنجاح على ${result.payout?.investorCount ?? '—'} مستثمر`
          : `Distribution executed for ${result.payout?.investorCount ?? '—'} investors`
      )
      setTotalAmount('')
      loadData()
    } catch (e) {
      const msg = e?.body?.message || e?.message || ''
      if (msg.includes('ALREADY_DISTRIBUTED') || msg.includes('already')) {
        setSubmitError(isAr ? 'تم توزيع الأرباح لهذا الشهر مسبقاً' : 'Distribution for this month already executed')
      } else {
        setSubmitError(isAr ? `فشل التوزيع: ${msg}` : `Distribution failed: ${msg}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const dir = isAr ? 'rtl' : 'ltr'

  return (
    <div dir={dir} className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center">
          <PieChart className="text-brand-accent" size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isAr ? 'توزيع الأرباح' : 'Rental Distribution'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isAr ? 'توزيع عوائد الإيجار على المستثمرين بناءً على حصصهم' : 'Distribute rental income to investors by token share'}
          </p>
        </div>
      </div>

      {/* Distribution Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-5">
          {isAr ? 'تنفيذ توزيع جديد' : 'Execute New Distribution'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Property selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isAr ? 'العقار' : 'Property'}
              </label>
              <select
                value={propertyId}
                onChange={e => setPropertyId(e.target.value)}
                required
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-accent focus:border-transparent"
              >
                <option value="">{isAr ? '— اختر عقاراً —' : '— Select a property —'}</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isAr ? 'الشهر (YYYY-MM)' : 'Month (YYYY-MM)'}
              </label>
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                required
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-accent focus:border-transparent"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isAr ? 'مبلغ التوزيع (ر.س)' : 'Distribution Amount (SAR)'}
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={totalAmount}
                onChange={e => setTotalAmount(e.target.value)}
                placeholder={isAr ? 'أدخل المبلغ' : 'Enter amount'}
                required
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-accent focus:border-transparent"
              />
            </div>
          </div>

          {submitSuccess && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg px-4 py-3 text-sm">
              <CheckCircle size={16} /> {submitSuccess}
            </div>
          )}
          {submitError && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
              <AlertCircle size={16} /> {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !propertyId || !month || !totalAmount}
            className="flex items-center gap-2 bg-brand-accent text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {isAr ? 'تنفيذ التوزيع' : 'Execute Distribution'}
          </button>
        </form>
      </div>

      {/* Payouts History */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-5">
          {isAr ? 'سجل التوزيعات' : 'Distribution History'}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            {isAr ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm py-4 text-center">{error}</div>
        ) : payouts.length === 0 ? (
          <div className="text-gray-400 text-sm py-8 text-center">
            {isAr ? 'لا توجد توزيعات بعد' : 'No distributions yet'}
          </div>
        ) : (
          <div className="space-y-3">
            {payouts.map(payout => {
              const isOpen = expanded.has(payout.id)
              return (
                <div key={payout.id} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleExpand(payout.id)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
                  >
                    <div className="flex items-center gap-6 text-sm">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {payout.property?.title || payout.propertyId}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">{payout.month}</span>
                      <span className="font-medium text-brand-accent">
                        {Number(payout.totalAmount).toLocaleString(isAr ? 'ar-SA' : 'en-US')} {isAr ? 'ر.س' : 'SAR'}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">
                        {payout.distributions?.length ?? 0} {isAr ? 'مستثمر' : 'investors'}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">
                        {new Date(payout.createdAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
                      </span>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>

                  {isOpen && (
                    <div className="px-5 py-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700">
                            <th className="pb-2 text-start font-medium">{isAr ? 'المستثمر' : 'Investor'}</th>
                            <th className="pb-2 text-start font-medium">{isAr ? 'البريد' : 'Email'}</th>
                            <th className="pb-2 text-end font-medium">{isAr ? 'المبلغ' : 'Amount'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                          {(payout.distributions || []).map(d => (
                            <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                              <td className="py-2.5 text-gray-900 dark:text-white font-medium">
                                {d.user?.fullName || d.userId}
                              </td>
                              <td className="py-2.5 text-gray-500 dark:text-gray-400">
                                {d.user?.email || '—'}
                              </td>
                              <td className="py-2.5 text-end font-semibold text-brand-accent">
                                {Number(d.amount).toLocaleString(isAr ? 'ar-SA' : 'en-US')} {isAr ? 'ر.س' : 'SAR'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
