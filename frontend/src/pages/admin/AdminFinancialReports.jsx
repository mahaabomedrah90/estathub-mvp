import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BookMarked, Download, RefreshCw, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2
} from 'lucide-react'
import { authHeader, fetchJson } from '../../lib/api'
import { useTranslation } from 'react-i18next'

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_DISPLAY = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' }
const STATUS_BADGE = {
  PENDING:  'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

const fmtAmount = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDateIso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')

const fmtDateDisplay = (d, isRtl) =>
  d
    ? new Date(d).toLocaleDateString(isRtl ? 'ar-SA' : 'en-GB', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : '—'

const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '')

function toRow(req) {
  return {
    id:            req.id,
    date:          req.createdAt,
    customerName:  req.user?.fullName   || '—',
    customerEmail: req.user?.email      || '',
    customerPhone: req.user?.phoneNumber || '',
    type:          'DEPOSIT',
    amount:        req.amount || 0,
    status:        req.status,
    bankName:      req.bankName      || '',
    bankReference: req.bankReference || '',
    receiptUrl:    req.receiptUrl    || '',
    approvedBy:    req.reviewedBy    || '',
    approvedAt:    req.reviewedAt    || '',
    notes:         req.adminNote     || '',
  }
}

function escapeCsv(val) {
  const s = String(val ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const CSV_HEADERS = [
  'Transaction ID', 'Transaction Date', 'Customer Name', 'Customer Email',
  'Customer Phone', 'Transaction Type', 'Amount SAR', 'Status',
  'Bank Name', 'Bank Reference', 'Receipt URL', 'Approved By',
  'Approved At', 'Accounting Status', 'External Accounting Ref', 'Notes',
]

function rowValues(r) {
  return [
    r.id,
    fmtDateIso(r.date),
    r.customerName,
    r.customerEmail,
    r.customerPhone,
    STATUS_DISPLAY[r.type] || 'Deposit',
    r.amount.toFixed(2),
    STATUS_DISPLAY[r.status] || r.status,
    r.bankName,
    r.bankReference,
    r.receiptUrl,
    r.approvedBy,
    fmtDateIso(r.approvedAt),
    'Not Exported',
    '',
    r.notes,
  ]
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminFinancialReports() {
  const { t, i18n } = useTranslation('pages')
  const isRtl = i18n.dir() === 'rtl'

  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [toast, setToast]     = useState(null)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate]     = useState('')
  const [txType, setTxType]     = useState('all')
  const [status, setStatus]     = useState('all')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchJson('/api/admin/deposit-requests', { headers: authHeader() })
      setRows(Array.isArray(data) ? data.map(toRow) : [])
    } catch {
      setError(t('admin.financialReports.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { loadData() }, [loadData])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (fromDate && new Date(r.date) < new Date(fromDate)) return false
      if (toDate && new Date(r.date) > new Date(toDate + 'T23:59:59')) return false
      if (txType !== 'all' && r.type.toLowerCase() !== txType.toLowerCase()) return false
      if (status !== 'all' && r.status !== status) return false
      return true
    })
  }, [rows, fromDate, toDate, txType, status])

  const previewRows = useMemo(() => filtered.slice(0, 20), [filtered])

  const exportCSV = () => {
    const content = [
      CSV_HEADERS.join(','),
      ...filtered.map(r => rowValues(r).map(escapeCsv).join(',')),
    ].join('\n')
    const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `financial_transactions_${today()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(t('admin.financialReports.exportedCSV'))
  }

  const exportExcel = () => {
    const xmlRows = [
      `<Row>${CSV_HEADERS.map(h => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}</Row>`,
      ...filtered.map(r => {
        const vals = rowValues(r)
        return `<Row>${vals.map(v => `<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`).join('')}</Row>`
      }),
    ].join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Financial Transactions">
  <Table>
   ${xmlRows}
  </Table>
 </Worksheet>
</Workbook>`

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `financial_transactions_${today()}.xls`
    a.click()
    URL.revokeObjectURL(url)
    showToast(t('admin.financialReports.exportedExcel'))
  }

  const TYPE_OPTIONS = [
    { value: 'all',        label: t('admin.financialReports.typeAll') },
    { value: 'deposit',    label: t('admin.financialReports.typeDeposit') },
    { value: 'withdrawal', label: t('admin.financialReports.typeWithdrawal') },
    { value: 'investment', label: t('admin.financialReports.typeInvestment') },
    { value: 'refund',     label: t('admin.financialReports.typeRefund') },
    { value: 'profit',     label: t('admin.financialReports.typeProfitDistribution') },
  ]

  const STATUS_OPTIONS = [
    { value: 'all',      label: t('admin.financialReports.statusAll') },
    { value: 'PENDING',  label: t('admin.financialReports.statusPending') },
    { value: 'APPROVED', label: t('admin.financialReports.statusApproved') },
    { value: 'REJECTED', label: t('admin.financialReports.statusRejected') },
  ]

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary bg-white'

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 ${isRtl ? 'left-4' : 'right-4'} z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold bg-green-500 text-white`}>
          <CheckCircle2 size={16} />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-brand-primary text-white rounded-2xl p-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
            <BookMarked size={24} className="text-brand-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('admin.financialReports.title')}</h1>
            <p className="text-white/70 text-sm mt-1">{t('admin.financialReports.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Filter + Action Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('admin.financialReports.fromDate')}
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('admin.financialReports.toDate')}
            </label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('admin.financialReports.transactionType')}
            </label>
            <select value={txType} onChange={e => setTxType(e.target.value)} className={inputCls}>
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('admin.financialReports.status')}
            </label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`flex items-center gap-3 mt-5 pt-5 border-t border-gray-100 flex-wrap ${isRtl ? '' : 'justify-end'}`}>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            {t('admin.financialReports.refresh')}
          </button>
          <button
            onClick={exportExcel}
            disabled={loading || filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-brand-primary/30 rounded-xl text-sm font-semibold text-brand-primary hover:bg-brand-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet size={15} />
            {t('admin.financialReports.exportExcel')}
          </button>
          <button
            onClick={exportCSV}
            disabled={loading || filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={15} />
            {t('admin.financialReports.exportCSV')}
          </button>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">{t('admin.financialReports.preview')}</h2>
          {!loading && !error && (
            <span className="text-xs text-gray-400">
              {filtered.length > 20
                ? t('admin.financialReports.showingRows', { shown: 20, total: filtered.length })
                : t('admin.financialReports.rowCount', { count: filtered.length })}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-brand-accent" size={28} />
            <span className="text-gray-500 text-sm">{t('admin.financialReports.loading')}</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle className="text-red-400" size={32} />
            <p className="text-red-600 text-sm font-medium">{error}</p>
            <button onClick={loadData} className="text-sm text-brand-accent hover:underline font-medium">
              {t('admin.financialReports.retry')}
            </button>
          </div>
        ) : previewRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <BookMarked size={32} className="text-gray-300" />
            <p className="text-gray-500 text-sm">{t('admin.financialReports.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {[
                    t('admin.financialReports.colId'),
                    t('admin.financialReports.colDate'),
                    t('admin.financialReports.colCustomer'),
                    t('admin.financialReports.colType'),
                    t('admin.financialReports.colAmount'),
                    t('admin.financialReports.colStatus'),
                  ].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-400" title={r.id}>
                        {r.id.slice(0, 8)}…
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-700">{fmtDateDisplay(r.date, isRtl)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{r.customerName}</p>
                      <p className="text-xs text-gray-400">{r.customerEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-gray-700">
                        {t('admin.financialReports.typeDeposit')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-gray-900">{fmtAmount(r.amount)}</span>
                      <span className="text-xs text-gray-400 ms-1">SAR</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_DISPLAY[r.status] || r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
