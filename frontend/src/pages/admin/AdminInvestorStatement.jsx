import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  FileText, Download, FileSpreadsheet, Loader2, AlertCircle,
  CheckCircle2, User, Wallet, Building2, TrendingUp, Coins, ArrowUpCircle,
  ArrowDownCircle, ShieldCheck, AlertTriangle, ChevronDown, Printer,
  BarChart3, Search, DollarSign, PieChart, Star,
} from 'lucide-react'
import { authHeader, fetchJson } from '../../lib/api'
import { useTranslation } from 'react-i18next'

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtSAR = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtPct = (n, decimals = 2) => Number(n || 0).toFixed(decimals) + '%'

const fmtDate = (d, lang = 'ar') =>
  d ? new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', {
    year: 'numeric', month: 'short', day: 'numeric',
  }) : '—'

const fmtDateIso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')

const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '')

function escapeCsv(val) {
  const s = String(val ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s
}

function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ─── Transaction type config ──────────────────────────────────────────────────

const TX_CONFIG = {
  DEPOSIT:             { ar: 'إيداع',        en: 'Deposit',             badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200', row: '' },
  WITHDRAWAL:          { ar: 'سحب',          en: 'Withdrawal',          badge: 'bg-rose-100 text-rose-800 border border-rose-200',       row: 'bg-rose-50/20' },
  INVESTMENT_PURCHASE: { ar: 'شراء حصص',    en: 'Investment Purchase', badge: 'bg-blue-100 text-blue-800 border border-blue-200',       row: 'bg-blue-50/20' },
  PROFIT_DISTRIBUTION: { ar: 'توزيع أرباح', en: 'Profit Distribution', badge: 'bg-amber-100 text-amber-800 border border-amber-200',   row: 'bg-amber-50/20' },
  REFUND:              { ar: 'استرداد',      en: 'Refund',              badge: 'bg-purple-100 text-purple-800 border border-purple-200', row: 'bg-purple-50/20' },
  ADJUSTMENT:          { ar: 'تعديل',        en: 'Adjustment',          badge: 'bg-gray-100 text-gray-600 border border-gray-200',       row: '' },
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, labelSub, value, sub, accent = false, highlight = false, positive = false, warning = false }) {
  const bg = accent
    ? 'bg-brand-primary text-white border-brand-primary'
    : positive
    ? 'bg-emerald-50 border-emerald-200'
    : warning
    ? 'bg-amber-50 border-amber-200'
    : highlight
    ? 'bg-blue-50 border-blue-200'
    : 'bg-white border-gray-200'

  const iconBg = accent
    ? 'bg-white/15'
    : positive ? 'bg-emerald-100' : warning ? 'bg-amber-100' : highlight ? 'bg-blue-100' : 'bg-brand-primary/8'

  const iconColor = accent
    ? 'text-white'
    : positive ? 'text-emerald-600' : warning ? 'text-amber-600' : highlight ? 'text-blue-600' : 'text-brand-primary'

  const labelColor = accent ? 'text-white/70' : positive ? 'text-emerald-600' : warning ? 'text-amber-600' : highlight ? 'text-blue-600' : 'text-gray-500'
  const valueColor = accent ? 'text-white' : 'text-gray-900'
  const subColor   = accent ? 'text-white/60' : 'text-gray-400'

  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-3 ${bg}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon size={20} className={iconColor} />
      </div>
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wide leading-tight ${labelColor}`}>
          {label}
        </p>
        {labelSub && (
          <p className={`text-xs ${accent ? 'text-white/50' : 'text-gray-400'} mb-1`}>{labelSub}</p>
        )}
        <p className={`text-xl font-bold leading-tight mt-1 ${valueColor}`}>{value}</p>
        {sub && <p className={`text-xs mt-0.5 ${subColor}`}>{sub}</p>}
      </div>
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle, badge, children }) {
  return (
    <div className="flex items-center justify-between mb-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-brand-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary">
            {badge}
          </span>
        )}
        {children}
      </div>
    </div>
  )
}

// ─── Deed Status Badge ────────────────────────────────────────────────────────

function DeedBadge({ status, lang }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>
  const cfg = {
    ISSUED:           { cls: 'bg-green-100 text-green-800',  ar: 'مُصدر',     en: 'Issued' },
    DRAFT:            { cls: 'bg-yellow-100 text-yellow-800',ar: 'مسودة',     en: 'Draft' },
    REVOKED:          { cls: 'bg-red-100 text-red-800',      ar: 'ملغي',      en: 'Revoked' },
    PENDING_APPROVAL: { cls: 'bg-blue-100 text-blue-800',    ar: 'قيد المراجعة', en: 'Pending' },
    TRANSFERRED:      { cls: 'bg-purple-100 text-purple-800',ar: 'محوّل',     en: 'Transferred' },
  }
  const c = cfg[status] ?? { cls: 'bg-gray-100 text-gray-600', ar: status, en: status }
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${c.cls}`}>
      {lang === 'ar' ? c.ar : c.en}
    </span>
  )
}

// ─── Summary PDF Generator ────────────────────────────────────────────────────

function generateSummaryPDF(statement, lang) {
  const s = statement
  const inv = s.investor
  const sum = s.summary
  const isRtl = lang === 'ar'

  const holdingsRows = s.holdings.map(h => `
    <tr>
      <td>${h.propertyTitle}</td>
      <td>${h.tokens.toLocaleString()}</td>
      <td>${Number(h.tokenPrice).toFixed(2)}</td>
      <td><strong>${Number(h.purchaseCost).toFixed(2)}</strong></td>
      <td>${Number(h.ownershipPct).toFixed(2)}%</td>
      <td>${h.deedNumber ?? '—'}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
<meta charset="UTF-8">
<title>${isRtl ? 'كشف حساب المستثمر' : 'Investor Statement'} — ${inv.fullName}</title>
<style>
  @page { size: A4; margin: 15mm 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 11px; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 3px solid #1B4332; margin-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 900; color: #1B4332; letter-spacing: -0.5px; }
  .brand-sub { font-size: 10px; color: #6b7280; margin-top: 2px; }
  .report-title { text-align: ${isRtl ? 'left' : 'right'}; }
  .report-title h1 { font-size: 16px; font-weight: 800; color: #1B4332; }
  .report-title p { font-size: 9px; color: #6b7280; margin-top: 2px; }

  .investor-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; }
  .inv-field label { font-size: 8px; text-transform: uppercase; color: #9ca3af; font-weight: 700; letter-spacing: 0.5px; }
  .inv-field p { font-size: 11px; font-weight: 600; color: #111827; margin-top: 1px; }

  .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1B4332; letter-spacing: 0.5px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #d1fae5; }

  .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 16px; }
  .kpi { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 10px; }
  .kpi label { font-size: 8px; text-transform: uppercase; color: #6b7280; font-weight: 700; display: block; margin-bottom: 3px; }
  .kpi .val { font-size: 13px; font-weight: 800; color: #111827; }
  .kpi .val.green { color: #059669; }
  .kpi .val.amber { color: #d97706; }
  .kpi .val.primary { color: #1B4332; }
  .kpi .unit { font-size: 8px; color: #9ca3af; margin-top: 1px; }
  .kpi-wide { grid-column: span 2; background: #1B4332; color: white; }
  .kpi-wide label { color: rgba(255,255,255,0.7); }
  .kpi-wide .val { color: white; font-size: 16px; }

  table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 16px; }
  thead tr { background: #1B4332; color: white; }
  thead th { padding: 6px 8px; text-align: ${isRtl ? 'right' : 'left'}; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
  tbody tr:nth-child(even) { background: #f9fafb; }
  td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }

  .profit-summary { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .profit-summary .total-label { font-size: 11px; font-weight: 700; color: #92400e; }
  .profit-summary .total-val { font-size: 18px; font-weight: 900; color: #d97706; }

  .roi-badge { display: inline-flex; align-items: center; gap: 6px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 14px; margin-bottom: 16px; }
  .roi-badge .roi-label { font-size: 10px; font-weight: 700; color: #166534; }
  .roi-badge .roi-val { font-size: 20px; font-weight: 900; color: #16a34a; }

  .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 8px; color: #9ca3af; }
  .disclaimer { font-size: 8px; color: #9ca3af; margin-top: 6px; font-style: italic; }
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <div>
    <div class="brand">الوسم | ALWSM</div>
    <div class="brand-sub">${isRtl ? 'منصة التملك العقاري الجزئي' : 'Fractional Real Estate Platform'}</div>
  </div>
  <div class="report-title">
    <h1>${isRtl ? 'كشف حساب المستثمر' : 'Investor Statement'}</h1>
    <p>${isRtl ? 'تاريخ الإصدار:' : 'Generated:'} ${fmtDate(s.generatedAt, lang)}</p>
  </div>
</div>

<!-- Investor Info -->
<div class="investor-card">
  <div class="inv-field"><label>${isRtl ? 'الاسم' : 'Name'}</label><p>${inv.fullName}</p></div>
  <div class="inv-field"><label>${isRtl ? 'البريد الإلكتروني' : 'Email'}</label><p>${inv.email}</p></div>
  <div class="inv-field"><label>${isRtl ? 'رقم الهوية' : 'National ID'}</label><p>${inv.nationalId ?? '—'}</p></div>
  <div class="inv-field"><label>${isRtl ? 'عضو منذ' : 'Member Since'}</label><p>${fmtDate(inv.memberSince, lang)}</p></div>
</div>

<!-- Account Summary KPIs -->
<div class="section-title">${isRtl ? 'ملخص الحساب' : 'Account Summary'}</div>
<div class="kpi-grid">
  <div class="kpi"><label>${isRtl ? 'إجمالي الإيداعات' : 'Total Deposits'}</label><div class="val green">${fmtSAR(sum.totalDeposits)}</div><div class="unit">SAR</div></div>
  <div class="kpi"><label>${isRtl ? 'إجمالي السحوبات' : 'Total Withdrawals'}</label><div class="val">${fmtSAR(sum.totalWithdrawals)}</div><div class="unit">SAR</div></div>
  <div class="kpi"><label>${isRtl ? 'الرصيد النقدي' : 'Cash Balance'}</label><div class="val primary">${fmtSAR(sum.cashBalance)}</div><div class="unit">SAR</div></div>
  <div class="kpi"><label>${isRtl ? 'إجمالي الاستثمارات' : 'Total Invested'}</label><div class="val">${fmtSAR(sum.totalInvested)}</div><div class="unit">SAR</div></div>
  <div class="kpi"><label>${isRtl ? 'إجمالي الأرباح' : 'Total Profits'}</label><div class="val green">${fmtSAR(sum.totalProfitDistributions)}</div><div class="unit">SAR</div></div>
  <div class="kpi kpi-wide"><label>${isRtl ? 'صافي الثروة داخل المنصة' : 'Net Platform Wealth'}</label><div class="val">${fmtSAR(sum.netPlatformWealth)}</div><div class="unit">SAR</div></div>
  <div class="kpi"><label>${isRtl ? 'العقارات المملوكة' : 'Properties'}</label><div class="val primary">${sum.ownedPropertiesCount}</div><div class="unit">${isRtl ? 'عقار' : 'properties'}</div></div>
  <div class="kpi"><label>${isRtl ? 'الحصص المملوكة' : 'Tokens'}</label><div class="val">${sum.ownedTokensCount.toLocaleString()}</div><div class="unit">${isRtl ? 'حصة' : 'tokens'}</div></div>
</div>

<!-- ROI -->
<div class="roi-badge">
  <span class="roi-label">${isRtl ? 'العائد على الاستثمار (ROI)' : 'Return on Investment (ROI)'}</span>
  <span class="roi-val">${fmtPct(sum.roi)}</span>
  <span style="font-size:9px;color:#16a34a;">${isRtl ? '(أرباح ÷ استثمارات)' : '(Profits ÷ Investments)'}</span>
</div>

<!-- Holdings -->
<div class="section-title">${isRtl ? 'محفظة الاستثمارات' : 'Investment Holdings'}</div>
${s.holdings.length > 0 ? `
<table>
  <thead>
    <tr>
      <th>${isRtl ? 'العقار' : 'Property'}</th>
      <th>${isRtl ? 'الحصص' : 'Tokens'}</th>
      <th>${isRtl ? 'سعر الحصة' : 'Price/Token'}</th>
      <th>${isRtl ? 'القيمة الدفترية' : 'Book Value'}</th>
      <th>${isRtl ? 'نسبة التملك' : 'Ownership'}</th>
      <th>${isRtl ? 'رقم الصك' : 'Deed #'}</th>
    </tr>
  </thead>
  <tbody>${holdingsRows}</tbody>
</table>
` : `<p style="color:#9ca3af;font-size:10px;margin-bottom:16px;">${isRtl ? 'لا توجد استثمارات حالية' : 'No current holdings'}</p>`}

<!-- Profit Summary -->
<div class="section-title">${isRtl ? 'ملخص الأرباح' : 'Profit Summary'}</div>
<div class="profit-summary">
  <div class="total-label">${isRtl ? 'إجمالي الأرباح المستلمة' : 'Total Profit Distributions Received'}</div>
  <div class="total-val">${fmtSAR(sum.totalProfitDistributions)} SAR</div>
</div>

<!-- Disclaimer -->
<div class="disclaimer">
  ${isRtl
    ? 'القيم الدفترية تعتمد على سعر شراء الحصة ولا تعكس القيمة السوقية الحالية للعقار. هذا التقرير للأغراض المعلوماتية فقط.'
    : 'Book values are based on token purchase price and do not reflect current market value of the property. This report is for informational purposes only.'}
</div>

<!-- Footer -->
<div class="footer">
  <span>${isRtl ? 'منصة الوسم — كشف حساب رسمي' : 'ALWSM Platform — Official Investor Statement'}</span>
  <span>${isRtl ? 'تاريخ الإصدار:' : 'Generated:'} ${fmtDate(s.generatedAt, lang)} | ${inv.email}</span>
</div>

<script>window.onload = function() { window.print(); }</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminInvestorStatement() {
  const { i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en'

  const printRef = useRef(null)

  // Investor selector
  const [investors, setInvestors] = useState([])
  const [investorsLoading, setInvestorsLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [investorSearch, setInvestorSearch] = useState('')

  // Statement data
  const [statement, setStatement] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  // Ledger filters
  const [filterType, setFilterType] = useState('ALL')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterProperty, setFilterProperty] = useState('ALL')
  const [ledgerSearch, setLedgerSearch] = useState('')

  // Section collapse
  const [showHoldings, setShowHoldings] = useState(true)
  const [showDistributions, setShowDistributions] = useState(true)
  const [showLedger, setShowLedger] = useState(true)
  const [showRecon, setShowRecon] = useState(true)

  // Full report mode
  const [fullReport, setFullReport]       = useState(null)
  const [fullLoading, setFullLoading]     = useState(false)
  const [fullError, setFullError]         = useState('')
  const [showFullReport, setShowFullReport] = useState(false)
  const [openInvestors, setOpenInvestors] = useState(new Set())

  const loadFullReport = useCallback(async () => {
    if (fullReport) { setShowFullReport(true); return }
    setFullLoading(true); setFullError('')
    try {
      const r = await fetchJson('/api/admin/investor-statement/full-report', { headers: authHeader() })
      setFullReport(r.data ?? [])
      setShowFullReport(true)
    } catch {
      setFullError(lang === 'ar' ? 'فشل تحميل التقرير' : 'Failed to load report')
    } finally {
      setFullLoading(false)
    }
  }, [fullReport, lang])

  const toggleInvestor = (id) =>
    setOpenInvestors(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  // ── Load investors list ──────────────────────────────────────────────────
  const loadInvestors = useCallback(async () => {
    setInvestorsLoading(true)
    try {
      const res = await fetchJson('/api/admin/investor-statement', { headers: authHeader() })
      setInvestors(Array.isArray(res.data) ? res.data : [])
    } catch {
      setInvestors([])
    } finally {
      setInvestorsLoading(false)
    }
  }, [])

  useEffect(() => { loadInvestors() }, [loadInvestors])

  // ── Load statement ───────────────────────────────────────────────────────
  const loadStatement = useCallback(async (uid) => {
    if (!uid) return
    setLoading(true)
    setError('')
    setStatement(null)
    try {
      const res = await fetchJson(`/api/admin/investor-statement/${uid}`, { headers: authHeader() })
      setStatement(res.data)
    } catch {
      setError(lang === 'ar' ? 'تعذّر تحميل كشف الحساب' : 'Failed to load statement')
    } finally {
      setLoading(false)
    }
  }, [lang])

  useEffect(() => {
    if (selectedUserId) loadStatement(selectedUserId)
    else setStatement(null)
  }, [selectedUserId, loadStatement])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Filtered investors dropdown ──────────────────────────────────────────
  const filteredInvestors = useMemo(() => {
    if (!investorSearch.trim()) return investors
    const q = investorSearch.toLowerCase()
    return investors.filter(
      inv => inv.fullName?.toLowerCase().includes(q) ||
             inv.email?.toLowerCase().includes(q) ||
             inv.nationalId?.includes(q)
    )
  }, [investors, investorSearch])

  // ── Property options for ledger filter ──────────────────────────────────
  const propertyOptions = useMemo(() => {
    if (!statement?.ledger) return []
    const map = new Map()
    map.set('ALL', lang === 'ar' ? 'كل العقارات' : 'All Properties')
    for (const row of statement.ledger) {
      if (row.propertyId && !map.has(row.propertyId)) {
        const h = statement.holdings?.find(h => h.propertyId === row.propertyId)
        map.set(row.propertyId, h?.propertyTitle ?? row.propertyId)
      }
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }))
  }, [statement, lang])

  // ── Filtered ledger ──────────────────────────────────────────────────────
  const filteredLedger = useMemo(() => {
    if (!statement?.ledger) return []
    const q = ledgerSearch.toLowerCase().trim()
    return statement.ledger.filter(row => {
      if (filterType !== 'ALL' && row.type !== filterType) return false
      if (filterFrom && new Date(row.date) < new Date(filterFrom)) return false
      if (filterTo && new Date(row.date) > new Date(filterTo + 'T23:59:59')) return false
      if (filterProperty !== 'ALL' && row.propertyId !== filterProperty) return false
      if (q) {
        const desc = (lang === 'ar' ? row.description : row.descriptionEn).toLowerCase()
        const ref = row.ref?.toLowerCase() ?? ''
        if (!desc.includes(q) && !ref.includes(q)) return false
      }
      return true
    })
  }, [statement, filterType, filterFrom, filterTo, filterProperty, ledgerSearch, lang])

  // ── Per-property invested amounts from ledger ────────────────────────────
  const holdingsEnriched = useMemo(() => {
    if (!statement?.holdings) return []
    return statement.holdings.map(h => ({
      ...h,
      totalInvestedInProperty: h.totalInvestedInProperty ?? h.purchaseCost,
      totalProfitsFromProperty: h.totalProfitsFromProperty ?? 0,
    }))
  }, [statement])

  // ── Export CSV ───────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!statement) return
    const headers = lang === 'ar'
      ? ['#', 'التاريخ', 'نوع العملية', 'الوصف', 'مدين (SAR)', 'دائن (SAR)', 'الرصيد (SAR)']
      : ['#', 'Date', 'Type', 'Description', 'Debit (SAR)', 'Credit (SAR)', 'Balance (SAR)']
    const rows = filteredLedger.map(r => [
      r.seq, fmtDateIso(r.date),
      lang === 'ar' ? (TX_CONFIG[r.type]?.ar ?? r.type) : (TX_CONFIG[r.type]?.en ?? r.type),
      lang === 'ar' ? r.description : r.descriptionEn,
      r.debit.toFixed(2), r.credit.toFixed(2), r.balance.toFixed(2),
    ])
    const content = [headers, ...rows].map(r => r.map(escapeCsv).join(',')).join('\n')
    const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `investor_statement_${statement.investor.email}_${today()}.csv`; a.click()
    URL.revokeObjectURL(url)
    showToast(lang === 'ar' ? 'تم تصدير CSV' : 'CSV exported')
  }

  // ── Export Excel ─────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (!statement) return
    const headers = ['#', 'Date', 'Type', 'Description', 'Debit SAR', 'Credit SAR', 'Balance SAR']
    const xmlRows = [
      `<Row>${headers.map(h => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}</Row>`,
      ...filteredLedger.map(r => {
        const vals = [r.seq, fmtDateIso(r.date), TX_CONFIG[r.type]?.en ?? r.type,
          r.descriptionEn, r.debit.toFixed(2), r.credit.toFixed(2), r.balance.toFixed(2)]
        return `<Row>${vals.map(v => `<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`).join('')}</Row>`
      }),
    ].join('\n')
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Investor Statement"><Table>${xmlRows}</Table></Worksheet>
</Workbook>`
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `investor_statement_${statement.investor.email}_${today()}.xls`; a.click()
    URL.revokeObjectURL(url)
    showToast(lang === 'ar' ? 'تم تصدير Excel' : 'Excel exported')
  }

  const handlePrint = () => {
    window.print()
    showToast(lang === 'ar' ? 'جارٍ الطباعة…' : 'Opening print dialog…', 'info')
  }

  const handleSummaryPDF = () => {
    if (!statement) return
    generateSummaryPDF(statement, lang)
    showToast(lang === 'ar' ? 'جارٍ توليد ملخص PDF…' : 'Generating PDF Summary…', 'info')
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary bg-white'

  const TX_TYPES = [
    { value: 'ALL',                 label: lang === 'ar' ? 'كل الأنواع' : 'All Types' },
    { value: 'DEPOSIT',             label: lang === 'ar' ? 'إيداع' : 'Deposit' },
    { value: 'WITHDRAWAL',          label: lang === 'ar' ? 'سحب' : 'Withdrawal' },
    { value: 'INVESTMENT_PURCHASE', label: lang === 'ar' ? 'شراء حصص' : 'Investment Purchase' },
    { value: 'PROFIT_DISTRIBUTION', label: lang === 'ar' ? 'توزيع أرباح' : 'Profit Distribution' },
    { value: 'REFUND',              label: lang === 'ar' ? 'استرداد' : 'Refund' },
    { value: 'ADJUSTMENT',          label: lang === 'ar' ? 'تعديل' : 'Adjustment' },
  ]

  const s = statement
  const sum = s?.summary

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full { break-inside: avoid; }
          body { font-size: 11px; }
        }
      `}</style>

      <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all ${
            toast.type === 'info' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
          } ${isRtl ? 'left-4' : 'right-4'}`}>
            <CheckCircle2 size={16} />
            {toast.msg}
          </div>
        )}

        {/* ═══ PAGE HEADER ════════════════════════════════════════════════════ */}
        <div className="bg-brand-primary text-white rounded-2xl p-8 no-print">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <FileText size={24} className="text-brand-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {lang === 'ar' ? 'كشف حساب المستثمر' : 'Investor Statement'}
                </h1>
                <p className="text-white/70 text-sm mt-1">
                  {lang === 'ar'
                    ? 'المرجع المالي الرسمي — إيداعات، سحوبات، استثمارات، أرباح، مطابقة'
                    : 'Official financial reference — deposits, withdrawals, investments, profits, reconciliation'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => showFullReport ? setShowFullReport(false) : loadFullReport()}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors no-print ${showFullReport ? 'bg-white text-brand-primary' : 'bg-white/10 hover:bg-white/20 text-white'}`}
              >
                <BarChart3 size={14} />
                {showFullReport
                  ? (lang === 'ar' ? 'عرض فردي' : 'Single View')
                  : (lang === 'ar' ? 'تقرير مجمّع' : 'Full Report')}
              </button>
            </div>

            {s && !showFullReport && (
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={handleSummaryPDF}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl text-sm font-semibold transition-colors">
                  <Star size={14} />
                  {lang === 'ar' ? 'ملخص PDF' : 'Summary PDF'}
                </button>
                <button onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold text-white transition-colors">
                  <Printer size={14} />
                  {lang === 'ar' ? 'طباعة كاملة' : 'Full Print'}
                </button>
                <button onClick={exportExcel}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold text-white transition-colors">
                  <FileSpreadsheet size={14} />Excel
                </button>
                <button onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold text-white transition-colors">
                  <Download size={14} />CSV
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ═══ FULL REPORT MODE ═══════════════════════════════════════════════ */}
        {showFullReport && (
          <div className="space-y-3 no-print">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {lang === 'ar' ? 'التقرير المجمّع — جميع المستثمرين' : 'Full Portfolio Report — All Investors'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {lang === 'ar' ? 'انقر على أي مستثمر لعرض حصصه' : 'Click any investor to expand their holdings'}
                </p>
              </div>
              {fullReport && (
                <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full">
                  {fullReport.length} {lang === 'ar' ? 'مستثمر' : 'investors'}
                </span>
              )}
            </div>

            {fullLoading && (
              <div className="bg-white rounded-2xl border border-gray-200 flex items-center justify-center py-16 gap-3">
                <Loader2 className="animate-spin text-brand-accent" size={24} />
                <span className="text-gray-500 text-sm">{lang === 'ar' ? 'جارٍ التحميل…' : 'Loading…'}</span>
              </div>
            )}
            {fullError && !fullLoading && (
              <div className="bg-white rounded-2xl border border-red-200 flex flex-col items-center py-12 gap-2">
                <AlertCircle className="text-red-400" size={24} />
                <p className="text-red-500 text-sm">{fullError}</p>
                <button onClick={() => { setFullReport(null); loadFullReport() }} className="text-sm text-brand-accent hover:underline mt-1">
                  {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                </button>
              </div>
            )}
            {!fullLoading && fullReport && fullReport.map(inv => (
              <div key={inv.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleInvestor(inv.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-start"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                      <User size={15} className="text-brand-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{inv.fullName}</p>
                      <p className="text-xs text-gray-400 truncate">{inv.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 flex-shrink-0 ms-4 text-end">
                    <div className="hidden sm:block">
                      <p className="text-xs text-gray-400">{lang === 'ar' ? 'الاستثمار' : 'Invested'}</p>
                      <p className="font-bold text-gray-900 text-sm">{fmtSAR(inv.totalInvested)} SAR</p>
                    </div>
                    <div className="hidden md:block">
                      <p className="text-xs text-gray-400">{lang === 'ar' ? 'الأرباح' : 'Profit'}</p>
                      <p className="font-bold text-emerald-600 text-sm">{fmtSAR(inv.totalDistributed)} SAR</p>
                    </div>
                    <div className="hidden lg:block">
                      <p className="text-xs text-gray-400">{lang === 'ar' ? 'الرصيد' : 'Cash'}</p>
                      <p className="font-semibold text-gray-700 text-sm">{fmtSAR(inv.cashBalance)} SAR</p>
                    </div>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${openInvestors.has(inv.id) ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {openInvestors.has(inv.id) && (
                  <div className="border-t border-gray-100">
                    <div className="grid grid-cols-3 gap-px bg-gray-100">
                      {[
                        { label: lang === 'ar' ? 'الاستثمار الكلي' : 'Total Invested', val: `${fmtSAR(inv.totalInvested)} SAR`, cls: 'text-gray-900' },
                        { label: lang === 'ar' ? 'الأرباح الموزعة' : 'Distributed',    val: `${fmtSAR(inv.totalDistributed)} SAR`, cls: 'text-emerald-600' },
                        { label: lang === 'ar' ? 'الرصيد النقدي'   : 'Cash Balance',   val: `${fmtSAR(inv.cashBalance)} SAR`, cls: 'text-gray-700' },
                      ].map(f => (
                        <div key={f.label} className="bg-gray-50 px-4 py-3">
                          <p className="text-xs text-gray-400">{f.label}</p>
                          <p className={`font-bold text-sm mt-0.5 ${f.cls}`}>{f.val}</p>
                        </div>
                      ))}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 bg-white">
                            {[
                              lang === 'ar' ? 'العقار' : 'Property',
                              lang === 'ar' ? 'الحصص' : 'Tokens',
                              lang === 'ar' ? 'الاستثمار' : 'Investment',
                              lang === 'ar' ? 'الأرباح' : 'Profit',
                            ].map(h => (
                              <th key={h} className="px-4 py-2.5 text-start text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {inv.holdings.map((h, i) => (
                            <tr key={h.propertyId} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                              <td className="px-4 py-2.5 font-semibold text-gray-800">{h.propertyTitle}</td>
                              <td className="px-4 py-2.5 font-bold text-gray-900">{h.tokens.toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-gray-900">{fmtSAR(h.investmentAmount)} SAR</td>
                              <td className="px-4 py-2.5">
                                {h.profitReceived > 0
                                  ? <span className="font-semibold text-emerald-600">+{fmtSAR(h.profitReceived)} SAR</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ═══ INVESTOR SELECTOR ══════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 no-print">
          <div className="mb-4">
            <SectionHeader
              icon={Search}
              title={lang === 'ar' ? 'اختيار المستثمر' : 'Select Investor'}
              subtitle={lang === 'ar' ? 'ابحث واختر المستثمر لعرض كشف حسابه الكامل' : 'Search and select an investor to view their full statement'}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {lang === 'ar' ? 'بحث سريع' : 'Quick Search'}
              </label>
              <div className="relative">
                <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRtl ? 'right-3' : 'left-3'}`} />
                <input value={investorSearch} onChange={e => setInvestorSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'اسم، بريد إلكتروني، رقم هوية…' : 'Name, email, national ID…'}
                  className={`${inputCls} ${isRtl ? 'pr-9' : 'pl-9'}`} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {lang === 'ar' ? 'اختر المستثمر' : 'Investor'}
              </label>
              {investorsLoading ? (
                <div className="flex items-center gap-2 h-11 text-gray-400 text-sm">
                  <Loader2 size={14} className="animate-spin" />
                  {lang === 'ar' ? 'جارٍ التحميل…' : 'Loading…'}
                </div>
              ) : (
                <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className={inputCls}>
                  <option value="">{lang === 'ar' ? '— اختر المستثمر —' : '— Select Investor —'}</option>
                  {filteredInvestors.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.fullName ?? inv.email} — {inv.email}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-brand-accent" size={28} />
            <span className="text-gray-500 text-sm font-medium">
              {lang === 'ar' ? 'جارٍ بناء كشف الحساب…' : 'Building statement…'}
            </span>
          </div>
        )}
        {error && (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="text-red-400" size={32} />
            <p className="text-red-600 text-sm font-medium">{error}</p>
            <button onClick={() => loadStatement(selectedUserId)} className="text-sm text-brand-accent hover:underline font-semibold">
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        )}

        {/* ═══ STATEMENT CONTENT ══════════════════════════════════════════════ */}
        {s && !loading && (
          <div ref={printRef} className="space-y-6">

            {/* Print header */}
            <div className="hidden print:block print-full mb-6 border-b pb-4">
              <h1 className="text-2xl font-bold text-gray-900">{lang === 'ar' ? 'كشف حساب المستثمر' : 'Investor Statement'}</h1>
              <p className="text-sm text-gray-500 mt-1">{lang === 'ar' ? 'تاريخ الإصدار:' : 'Generated:'} {fmtDate(s.generatedAt, lang)}</p>
              <p className="text-sm text-gray-700 mt-2 font-semibold">{s.investor.fullName} — {s.investor.email}</p>
            </div>

            {/* Investor Banner */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 print-full">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={22} className="text-white" />
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: lang === 'ar' ? 'الاسم' : 'Name', value: s.investor.fullName },
                    { label: lang === 'ar' ? 'البريد الإلكتروني' : 'Email', value: s.investor.email },
                    { label: lang === 'ar' ? 'رقم الهوية' : 'National ID', value: s.investor.nationalId ?? '—' },
                    { label: lang === 'ar' ? 'عضو منذ' : 'Member Since', value: fmtDate(s.investor.memberSince, lang) },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">{f.label}</p>
                      <p className="text-sm font-bold text-gray-900">{f.value}</p>
                    </div>
                  ))}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {lang === 'ar' ? 'تاريخ التقرير:' : 'Report date:'} {fmtDate(s.generatedAt, lang)}
                </span>
              </div>
            </div>

            {/* ══ SECTION 1: KPI SUMMARY (10 cards) ══════════════════════════ */}
            <div className="print-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                  <BarChart3 size={18} className="text-brand-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {lang === 'ar' ? 'ملخص الحساب' : 'Account Summary'}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {lang === 'ar' ? 'نظرة شاملة على الوضع المالي للمستثمر' : 'Comprehensive financial position overview'}
                  </p>
                </div>
              </div>

              {/* Row 1: 4 cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <KpiCard icon={ArrowUpCircle} positive
                  label={lang === 'ar' ? 'إجمالي الإيداعات' : 'Total Deposits'}
                  labelSub={lang === 'ar' ? 'مجموع الإيداعات المعتمدة' : 'Approved deposits total'}
                  value={`${fmtSAR(sum.totalDeposits)} SAR`}
                />
                <KpiCard icon={ArrowDownCircle}
                  label={lang === 'ar' ? 'إجمالي السحوبات' : 'Total Withdrawals'}
                  labelSub={lang === 'ar' ? 'مجموع السحوبات المعتمدة' : 'Approved withdrawals total'}
                  value={`${fmtSAR(sum.totalWithdrawals)} SAR`}
                />
                <KpiCard icon={Wallet} highlight
                  label={lang === 'ar' ? 'الرصيد النقدي الحالي' : 'Current Cash Balance'}
                  labelSub={lang === 'ar' ? 'رصيد المحفظة الجاهز للاستخدام' : 'Available wallet balance'}
                  value={`${fmtSAR(sum.cashBalance)} SAR`}
                />
                <KpiCard icon={DollarSign}
                  label={lang === 'ar' ? 'إجمالي الاستثمارات' : 'Total Invested Amount'}
                  labelSub={lang === 'ar' ? 'مجموع مبالغ الشراء' : 'Sum of all purchases'}
                  value={`${fmtSAR(sum.totalInvested)} SAR`}
                />
              </div>

              {/* Row 2: 3 cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <KpiCard icon={TrendingUp} positive
                  label={lang === 'ar' ? 'إجمالي الأرباح المستلمة' : 'Total Profit Distributions'}
                  labelSub={lang === 'ar' ? 'مجموع التوزيعات المستلمة' : 'Total distributions received'}
                  value={`${fmtSAR(sum.totalProfitDistributions)} SAR`}
                />
                <KpiCard icon={PieChart}
                  label={lang === 'ar' ? 'قيمة المحفظة الحالية' : 'Current Portfolio Value'}
                  labelSub={lang === 'ar' ? 'القيمة الدفترية للاستثمارات' : 'Book value of investments'}
                  value={`${fmtSAR(sum.currentInvestmentValue)} SAR`}
                  sub={lang === 'ar' ? 'بالقيمة الدفترية — بدون تقييم سوقي' : 'Book value — no market valuation'}
                />
                <KpiCard icon={TrendingUp} accent
                  label={lang === 'ar' ? 'صافي الثروة داخل المنصة' : 'Net Platform Wealth'}
                  labelSub={lang === 'ar' ? 'نقد + محفظة' : 'Cash + Portfolio'}
                  value={`${fmtSAR(sum.netPlatformWealth)} SAR`}
                />
              </div>

              {/* Row 3: 3 cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard icon={Building2}
                  label={lang === 'ar' ? 'عدد العقارات المملوكة' : 'Owned Properties'}
                  value={sum.ownedPropertiesCount}
                  sub={lang === 'ar' ? 'عقار استثماري' : 'investment properties'}
                />
                <KpiCard icon={Coins}
                  label={lang === 'ar' ? 'إجمالي الحصص المملوكة' : 'Owned Tokens'}
                  value={sum.ownedTokensCount.toLocaleString()}
                  sub={lang === 'ar' ? 'حصة ملكية' : 'ownership tokens'}
                />
                <KpiCard icon={Star} warning
                  label={lang === 'ar' ? 'العائد على الاستثمار' : 'Return on Investment (ROI)'}
                  labelSub={lang === 'ar' ? 'أرباح ÷ استثمارات × 100' : 'Profits ÷ Investments × 100'}
                  value={fmtPct(sum.roi)}
                  sub={sum.totalInvested === 0 ? (lang === 'ar' ? 'لا يوجد استثمار بعد' : 'No investment yet') : undefined}
                />
              </div>
            </div>

            {/* ══ SECTION 2: INVESTMENT HOLDINGS ══════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print-full">
              <div className="px-6 py-4 border-b border-gray-100">
                <SectionHeader
                  icon={Building2}
                  title={lang === 'ar' ? 'محفظة الاستثمارات' : 'Investment Holdings'}
                  subtitle={lang === 'ar' ? 'الحصص المملوكة مع القيمة الدفترية والأرباح لكل عقار' : 'Holdings with book value and profits per property'}
                  badge={`${holdingsEnriched.length} ${lang === 'ar' ? 'عقار' : 'properties'}`}
                >
                  <button onClick={() => setShowHoldings(v => !v)}
                    className="no-print p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <ChevronDown size={16} className={`transition-transform ${showHoldings ? '' : '-rotate-90'}`} />
                  </button>
                </SectionHeader>
                {/* Book value note */}
                <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <AlertCircle size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-snug">
                    {lang === 'ar'
                      ? 'القيمة الدفترية = تكلفة الشراء. لا يوجد تقييم سوقي حالياً، وتُعرض القيمة الدفترية لتجنب تضليل المستثمر.'
                      : 'Book Value = Purchase Cost. No market valuation available yet; book value is shown to avoid misleading the investor.'}
                  </p>
                </div>
              </div>

              {showHoldings && (
                holdingsEnriched.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Building2 size={28} className="text-gray-300" />
                    <p className="text-gray-400 text-sm">{lang === 'ar' ? 'لا توجد استثمارات حالية' : 'No current holdings'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {[
                            lang === 'ar' ? 'العقار' : 'Property',
                            lang === 'ar' ? 'الحصص' : 'Tokens',
                            lang === 'ar' ? 'سعر الحصة' : 'Price/Token',
                            lang === 'ar' ? 'إجمالي المستثمر' : 'Total Invested',
                            lang === 'ar' ? 'القيمة الدفترية' : 'Book Value',
                            lang === 'ar' ? 'الأرباح المستلمة' : 'Profits Received',
                            lang === 'ar' ? 'نسبة التملك' : 'Ownership %',
                            lang === 'ar' ? 'أول استثمار' : 'First Investment',
                            lang === 'ar' ? 'حالة الصك' : 'Deed Status',
                            lang === 'ar' ? 'رقم الصك' : 'Deed #',
                          ].map(h => (
                            <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {holdingsEnriched.map((h, i) => (
                          <tr key={h.propertyId} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-gray-900">{h.propertyTitle}</p>
                              <p className="text-xs text-gray-400 font-mono mt-0.5">{h.propertyId.slice(0, 8)}…</p>
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">{h.tokens.toLocaleString()}</td>
                            <td className="px-4 py-3 text-gray-600">{fmtSAR(h.tokenPrice)}</td>
                            <td className="px-4 py-3 font-semibold text-gray-900">{fmtSAR(h.totalInvestedInProperty)} SAR</td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-brand-primary">{fmtSAR(h.bookValue)} SAR</span>
                              <span className="block text-xs text-gray-400">{lang === 'ar' ? 'دفترية' : 'book'}</span>
                            </td>
                            <td className="px-4 py-3">
                              {h.totalProfitsFromProperty > 0 ? (
                                <span className="font-semibold text-emerald-600">+{fmtSAR(h.totalProfitsFromProperty)} SAR</span>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                {fmtPct(h.ownershipPct)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">{fmtDate(h.firstInvestmentDate, lang)}</td>
                            <td className="px-4 py-3"><DeedBadge status={h.deedStatus} lang={lang} /></td>
                            <td className="px-4 py-3 text-xs font-mono text-gray-600">{h.deedNumber ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-brand-primary/5 border-t-2 border-brand-primary/20">
                          <td colSpan={3} className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">
                            {lang === 'ar' ? 'الإجمالي' : 'Total'}
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900 text-sm">
                            {fmtSAR(holdingsEnriched.reduce((a, h) => a + h.totalInvestedInProperty, 0))} SAR
                          </td>
                          <td className="px-4 py-3 font-bold text-brand-primary text-sm">
                            {fmtSAR(holdingsEnriched.reduce((a, h) => a + h.bookValue, 0))} SAR
                          </td>
                          <td className="px-4 py-3 font-bold text-emerald-600 text-sm">
                            +{fmtSAR(holdingsEnriched.reduce((a, h) => a + h.totalProfitsFromProperty, 0))} SAR
                          </td>
                          <td colSpan={4} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )
              )}
            </div>

            {/* ══ SECTION 3: PROFIT DISTRIBUTIONS HISTORY ═════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print-full">
              <div className="px-6 py-4 border-b border-gray-100">
                <SectionHeader
                  icon={TrendingUp}
                  title={lang === 'ar' ? 'سجل توزيعات الأرباح' : 'Profit Distributions History'}
                  subtitle={lang === 'ar' ? 'جميع الأرباح الموزعة على المستثمر' : 'All profit distributions received by this investor'}
                  badge={`${s.distributionsHistory?.length ?? 0} ${lang === 'ar' ? 'توزيعة' : 'distributions'}`}
                >
                  <button onClick={() => setShowDistributions(v => !v)}
                    className="no-print p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <ChevronDown size={16} className={`transition-transform ${showDistributions ? '' : '-rotate-90'}`} />
                  </button>
                </SectionHeader>

                {/* Total profits banner */}
                <div className="mt-3 flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-amber-600" />
                    <span className="text-sm font-semibold text-amber-800">
                      {lang === 'ar' ? 'إجمالي الأرباح المستلمة' : 'Total Profits Received'}
                    </span>
                  </div>
                  <span className="text-xl font-black text-amber-700">
                    +{fmtSAR(sum.totalProfitDistributions)} SAR
                  </span>
                </div>
              </div>

              {showDistributions && (
                !s.distributionsHistory || s.distributionsHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <TrendingUp size={28} className="text-gray-300" />
                    <p className="text-gray-400 text-sm">
                      {lang === 'ar' ? 'لم يتم توزيع أرباح حتى الآن' : 'No profit distributions yet'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-amber-50 border-b border-amber-100">
                          {[
                            lang === 'ar' ? 'العقار' : 'Property',
                            lang === 'ar' ? 'الفترة' : 'Period',
                            lang === 'ar' ? 'تاريخ التوزيع' : 'Distribution Date',
                            lang === 'ar' ? 'المبلغ' : 'Amount',
                            lang === 'ar' ? 'نوع التوزيع' : 'Type',
                            lang === 'ar' ? 'رقم العملية' : 'Ref ID',
                          ].map(h => (
                            <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-amber-700 uppercase tracking-wide whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {s.distributionsHistory.map((d, i) => (
                          <tr key={d.id} className={`border-b border-gray-100 hover:bg-amber-50/30 ${i % 2 === 0 ? 'bg-white' : 'bg-amber-50/10'}`}>
                            <td className="px-4 py-3 font-semibold text-gray-900">{d.propertyTitle}</td>
                            <td className="px-4 py-3 text-gray-600 text-xs">
                              {d.period ?? (lang === 'ar' ? 'غير محدد' : 'N/A')}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700">{fmtDate(d.date, lang)}</td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-emerald-600 text-sm">+{fmtSAR(d.amount)} SAR</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                {lang === 'ar' ? 'توزيع أرباح' : 'Profit Distribution'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-mono text-gray-400" title={d.id}>{d.id.slice(0, 10)}…</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-amber-100 border-t-2 border-amber-300">
                          <td colSpan={3} className="px-4 py-3 text-xs font-bold text-amber-800 uppercase">
                            {lang === 'ar' ? 'الإجمالي' : 'Total'}
                          </td>
                          <td className="px-4 py-3 font-black text-emerald-700 text-base">
                            +{fmtSAR(s.distributionsHistory.reduce((a, d) => a + d.amount, 0))} SAR
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )
              )}
            </div>

            {/* ══ SECTION 4: FINANCIAL LEDGER ═════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print-full">
              <div className="px-6 py-4 border-b border-gray-100">
                <SectionHeader
                  icon={FileText}
                  title={lang === 'ar' ? 'دفتر الحركات المالية' : 'Financial Ledger'}
                  subtitle={lang === 'ar' ? 'جميع الحركات مرتبة زمنياً مع الرصيد التراكمي' : 'All transactions chronologically with running balance'}
                  badge={`${filteredLedger.length} ${lang === 'ar' ? 'حركة' : 'entries'}`}
                >
                  <button onClick={() => setShowLedger(v => !v)}
                    className="no-print p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <ChevronDown size={16} className={`transition-transform ${showLedger ? '' : '-rotate-90'}`} />
                  </button>
                </SectionHeader>
              </div>

              {/* Filters bar */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 no-print space-y-3">
                {/* Search box */}
                <div className="relative">
                  <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRtl ? 'right-3' : 'left-3'}`} />
                  <input
                    value={ledgerSearch}
                    onChange={e => setLedgerSearch(e.target.value)}
                    placeholder={lang === 'ar'
                      ? 'ابحث في الوصف، رقم الصفحة، رقم العملية…'
                      : 'Search description, ref, property…'}
                    className={`${inputCls} ${isRtl ? 'pr-9' : 'pl-9'}`}
                  />
                </div>
                {/* Filter dropdowns */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{lang === 'ar' ? 'نوع العملية' : 'Type'}</label>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className={inputCls}>
                      {TX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{lang === 'ar' ? 'العقار' : 'Property'}</label>
                    <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)} className={inputCls}>
                      {propertyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{lang === 'ar' ? 'من تاريخ' : 'From'}</label>
                    <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{lang === 'ar' ? 'إلى تاريخ' : 'To'}</label>
                    <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>

              {showLedger && (
                filteredLedger.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <FileText size={28} className="text-gray-300" />
                    <p className="text-gray-400 text-sm">{lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}</p>
                    {(ledgerSearch || filterType !== 'ALL' || filterFrom || filterTo || filterProperty !== 'ALL') && (
                      <button onClick={() => { setLedgerSearch(''); setFilterType('ALL'); setFilterFrom(''); setFilterTo(''); setFilterProperty('ALL') }}
                        className="text-xs text-brand-accent hover:underline font-semibold">
                        {lang === 'ar' ? 'مسح الفلاتر' : 'Clear filters'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {[
                            { label: '#', cls: 'w-10' },
                            { label: lang === 'ar' ? 'التاريخ' : 'Date', cls: 'w-32' },
                            { label: lang === 'ar' ? 'نوع العملية' : 'Type', cls: 'w-44' },
                            { label: lang === 'ar' ? 'الوصف' : 'Description', cls: '' },
                            { label: lang === 'ar' ? 'مدين' : 'Debit', cls: 'w-36 text-end' },
                            { label: lang === 'ar' ? 'دائن' : 'Credit', cls: 'w-36 text-end' },
                            { label: lang === 'ar' ? 'الرصيد' : 'Balance', cls: 'w-36 text-end' },
                          ].map(h => (
                            <th key={h.label} className={`px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${h.cls}`}>
                              {h.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLedger.map((row, i) => {
                          const cfg = TX_CONFIG[row.type] ?? TX_CONFIG.ADJUSTMENT
                          return (
                            <tr key={`${row.ref}-${i}`} className={`border-b border-gray-100 hover:brightness-95 transition-colors ${cfg.row || (i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40')}`}>
                              <td className="px-4 py-3">
                                <span className="text-xs font-mono text-gray-400">{row.seq}</span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{fmtDate(row.date, lang)}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cfg.badge}`}>
                                  {lang === 'ar' ? cfg.ar : cfg.en}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-800 max-w-xs truncate">
                                {lang === 'ar' ? row.description : row.descriptionEn}
                              </td>
                              <td className="px-4 py-3 text-end whitespace-nowrap">
                                {row.debit > 0
                                  ? <span className="text-rose-600 font-semibold text-sm">({fmtSAR(row.debit)})</span>
                                  : <span className="text-gray-200">—</span>}
                              </td>
                              <td className="px-4 py-3 text-end whitespace-nowrap">
                                {row.credit > 0
                                  ? <span className="text-emerald-600 font-semibold text-sm">+{fmtSAR(row.credit)}</span>
                                  : <span className="text-gray-200">—</span>}
                              </td>
                              <td className="px-4 py-3 text-end whitespace-nowrap">
                                <span className={`font-bold text-sm ${row.balance < 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                                  {fmtSAR(row.balance)}
                                </span>
                                <span className="text-xs text-gray-400 ms-1">SAR</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 border-t-2 border-gray-300">
                          <td colSpan={4} className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">
                            {lang === 'ar' ? 'الإجماليات (بعد التصفية)' : 'Totals (filtered)'}
                            <span className="ms-2 font-normal text-gray-400">
                              ({filteredLedger.length} {lang === 'ar' ? 'حركة' : 'entries'})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-end font-bold text-rose-600 text-sm">
                            ({fmtSAR(filteredLedger.reduce((a, r) => a + r.debit, 0))})
                          </td>
                          <td className="px-4 py-3 text-end font-bold text-emerald-600 text-sm">
                            +{fmtSAR(filteredLedger.reduce((a, r) => a + r.credit, 0))}
                          </td>
                          <td className="px-4 py-3 text-end font-bold text-gray-900 text-sm">
                            {filteredLedger.length > 0 ? fmtSAR(filteredLedger.at(-1).balance) : '—'} SAR
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )
              )}
            </div>

            {/* ══ SECTION 5: RECONCILIATION ════════════════════════════════════ */}
            <div className={`rounded-2xl border shadow-sm overflow-hidden print-full ${
              s.reconciliation.isBalanced ? 'bg-white border-gray-200' : 'bg-red-50 border-red-300'
            }`}>
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <SectionHeader
                    icon={ShieldCheck}
                    title={lang === 'ar' ? 'مطابقة الحسابات' : 'Financial Reconciliation'}
                    subtitle={lang === 'ar' ? 'التحقق من توازن الأرصدة للتدقيق المحاسبي' : 'Balance verification for accounting audit'}
                  >
                    <button onClick={() => setShowRecon(v => !v)}
                      className="no-print p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <ChevronDown size={16} className={`transition-transform ${showRecon ? '' : '-rotate-90'}`} />
                    </button>
                  </SectionHeader>
                </div>

                {/* Audit Status Badge */}
                <div className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border ${
                  s.reconciliation.isBalanced
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : 'bg-red-100 text-red-800 border-red-300'
                }`}>
                  {s.reconciliation.isBalanced
                    ? <><CheckCircle2 size={16} />{lang === 'ar' ? 'الحساب مطابق — Financially Reconciled ✓' : '✓ Financially Reconciled'}</>
                    : <><AlertTriangle size={16} />{lang === 'ar' ? 'يتطلب مراجعة — Needs Review ⚠️' : '⚠️ Needs Review'}</>}
                </div>
              </div>

              {showRecon && (
                <div className="p-6">
                  {!s.reconciliation.isBalanced && (
                    <div className="flex items-start gap-3 p-4 bg-red-100 border border-red-300 rounded-xl mb-6">
                      <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-800 font-bold text-sm">
                          {lang === 'ar' ? '⚠️ تنبيه: فارق في المطابقة' : '⚠️ RECONCILIATION ALERT — Discrepancy Detected'}
                        </p>
                        <p className="text-red-700 text-xs mt-0.5">
                          {lang === 'ar'
                            ? `الفارق: ${fmtSAR(Math.abs(s.reconciliation.discrepancy))} SAR — يُرجى مراجعة الحركات المالية مع المحاسب`
                            : `Discrepancy: ${fmtSAR(Math.abs(s.reconciliation.discrepancy))} SAR — Please review transactions with the accountant`}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                        {lang === 'ar' ? 'تفصيل الرصيد المتوقع' : 'Expected Balance Breakdown'}
                      </p>
                      {[
                        { label: lang === 'ar' ? '+ إجمالي الإيداعات' : '+ Total Deposits',           value: s.reconciliation.totalDeposits,           sign: '+', color: 'text-emerald-700' },
                        { label: lang === 'ar' ? '− إجمالي السحوبات' : '− Total Withdrawals',         value: s.reconciliation.totalWithdrawals,         sign: '-', color: 'text-rose-700' },
                        { label: lang === 'ar' ? '− إجمالي الاستثمارات' : '− Total Investments',      value: s.reconciliation.totalInvestments,         sign: '-', color: 'text-rose-700' },
                        { label: lang === 'ar' ? '+ توزيعات الأرباح' : '+ Profit Distributions',      value: s.reconciliation.totalProfitDistributions, sign: '+', color: 'text-emerald-700' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">{item.label}</span>
                          <span className={`text-sm font-semibold ${item.color}`}>
                            {item.sign === '+' ? '+' : '('}{fmtSAR(item.value)}{item.sign === '-' ? ')' : ''} SAR
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between py-3 border-t-2 border-gray-300">
                        <span className="text-sm font-bold text-gray-800">{lang === 'ar' ? '= الرصيد المتوقع' : '= Expected Balance'}</span>
                        <span className="text-base font-bold text-gray-900">{fmtSAR(s.reconciliation.expectedBalance)} SAR</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                        {lang === 'ar' ? 'المقارنة مع الرصيد الفعلي' : 'vs. Actual Balance'}
                      </p>
                      <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                        {[
                          { label: lang === 'ar' ? 'الرصيد المتوقع' : 'Expected Balance', value: s.reconciliation.expectedBalance },
                          { label: lang === 'ar' ? 'الرصيد الفعلي (المحفظة)' : 'Actual Balance (Wallet)', value: s.reconciliation.actualBalance },
                        ].map(item => (
                          <div key={item.label} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{item.label}</span>
                            <span className="text-sm font-bold text-gray-800">{fmtSAR(item.value)} SAR</span>
                          </div>
                        ))}
                        <div className={`flex justify-between items-center pt-3 border-t ${s.reconciliation.isBalanced ? 'border-green-200' : 'border-red-200'}`}>
                          <span className="text-sm font-bold text-gray-700">{lang === 'ar' ? 'الفارق' : 'Discrepancy'}</span>
                          <span className={`text-sm font-bold ${s.reconciliation.isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
                            {s.reconciliation.isBalanced ? '✓ 0.00' : fmtSAR(s.reconciliation.discrepancy)} SAR
                          </span>
                        </div>
                      </div>

                      <div className={`flex items-center gap-3 p-4 rounded-xl border font-semibold text-sm ${
                        s.reconciliation.isBalanced
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : 'bg-red-50 border-red-300 text-red-800'
                      }`}>
                        {s.reconciliation.isBalanced
                          ? <><CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />{lang === 'ar' ? 'الحساب متوازن — لا يوجد فارق ✓' : 'Account balanced — no discrepancy ✓'}</>
                          : <><AlertTriangle size={20} className="text-red-600 flex-shrink-0" />{lang === 'ar' ? 'يوجد فارق — يتطلب مراجعة محاسبية' : 'Discrepancy found — accounting review needed'}</>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Print footer */}
            <div className="hidden print:block text-center text-xs text-gray-400 pt-4 border-t mt-8">
              {lang === 'ar'
                ? `منصة الوسم — كشف حساب رسمي — تاريخ الإصدار: ${fmtDate(s.generatedAt, lang)}`
                : `ALWSM Platform — Official Investor Statement — Generated: ${fmtDate(s.generatedAt, lang)}`}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selectedUserId && !loading && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20 gap-4 no-print">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <User size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm font-medium">
              {lang === 'ar' ? 'اختر مستثمراً لعرض كشف حسابه الكامل' : 'Select an investor to view their full statement'}
            </p>
          </div>
        )}

      </div>
    </>
  )
}
