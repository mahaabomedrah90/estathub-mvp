import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  FileText, Download, FileSpreadsheet, Loader2, AlertCircle,
  CheckCircle2, User, Wallet, Building2, TrendingUp, Coins,
  ArrowUpCircle, ArrowDownCircle, ShieldCheck, AlertTriangle,
  ChevronDown, Printer, BarChart3, Search, DollarSign,
  Home, CreditCard, Clock, Star, Banknote,
} from 'lucide-react'
import { authHeader, fetchJson } from '../../lib/api'
import { useTranslation } from 'react-i18next'

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtSAR = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct  = (n, d = 1) => Number(n || 0).toFixed(d) + '%'
const fmtDate = (d, lang = 'ar') =>
  d ? new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', {
    year: 'numeric', month: 'short', day: 'numeric',
  }) : '—'
const fmtDateIso  = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')
const today       = () => new Date().toISOString().slice(0, 10).replace(/-/g, '')
const escapeCsv   = (val) => { const s = String(val ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s }
const escapeXml   = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ─── Ledger type config ───────────────────────────────────────────────────────

const TX_CFG = {
  CAPITAL_RAISED: { ar: 'رأس مال مستثمرين',  en: 'Investor Capital',   badge: 'bg-blue-100 text-blue-800 border border-blue-200',     row: 'bg-blue-50/20' },
  TOKEN_SALE:     { ar: 'بيع حصص',        en: 'Token Sale',       badge: 'bg-blue-100 text-blue-800 border border-blue-200',     row: 'bg-blue-50/20' },
  RENTAL_INCOME:  { ar: 'دخل إيجاري',     en: 'Rental Income',    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200', row: 'bg-emerald-50/20' },
  SETTLEMENT:     { ar: 'تسوية دفع',      en: 'Settlement',       badge: 'bg-rose-100 text-rose-800 border border-rose-200',     row: 'bg-rose-50/20' },
  PLATFORM_FEE:   { ar: 'رسوم منصة',      en: 'Platform Fee',     badge: 'bg-gray-100 text-gray-700 border border-gray-200',     row: '' },
  EXPENSE:        { ar: 'مصروف',          en: 'Expense',          badge: 'bg-orange-100 text-orange-800 border border-orange-200', row: '' },
  REFUND:         { ar: 'استرداد',        en: 'Refund',           badge: 'bg-purple-100 text-purple-800 border border-purple-200', row: '' },
  ADJUSTMENT:     { ar: 'تعديل',          en: 'Adjustment',       badge: 'bg-gray-100 text-gray-600 border border-gray-200',     row: '' },
}

// ─── Order / Withdrawal status ────────────────────────────────────────────────

const ORDER_STATUS = {
  PAID:      { ar: 'مدفوع',        en: 'Paid',      cls: 'bg-green-100 text-green-800' },
  ISSUED:    { ar: 'مُصدر',       en: 'Issued',    cls: 'bg-blue-100 text-blue-800' },
  PENDING:   { ar: 'قيد المعالجة',en: 'Pending',   cls: 'bg-yellow-100 text-yellow-800' },
  CANCELLED: { ar: 'ملغي',        en: 'Cancelled', cls: 'bg-red-100 text-red-800' },
}
const PROP_STATUS = {
  APPROVED: { ar: 'معتمد',    en: 'Approved', cls: 'bg-green-100 text-green-800' },
  PENDING:  { ar: 'قيد المراجعة', en: 'Pending', cls: 'bg-yellow-100 text-yellow-800' },
  REJECTED: { ar: 'مرفوض',   en: 'Rejected', cls: 'bg-red-100 text-red-800' },
}

function StatusBadge({ status, map }) {
  const cfg = map[status] ?? { ar: status, en: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>{cfg.ar}</span>
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, labelSub, value, sub, variant = 'default' }) {
  const styles = {
    default:  { wrap: 'bg-white border-gray-200',               icon: 'bg-brand-primary/8 text-brand-primary', label: 'text-gray-500', value: 'text-gray-900' },
    accent:   { wrap: 'bg-brand-primary border-brand-primary text-white', icon: 'bg-white/15 text-white',    label: 'text-white/70',  value: 'text-white' },
    green:    { wrap: 'bg-emerald-50 border-emerald-200',        icon: 'bg-emerald-100 text-emerald-600',   label: 'text-emerald-600', value: 'text-gray-900' },
    blue:     { wrap: 'bg-blue-50 border-blue-200',             icon: 'bg-blue-100 text-blue-600',         label: 'text-blue-600',  value: 'text-gray-900' },
    amber:    { wrap: 'bg-amber-50 border-amber-200',           icon: 'bg-amber-100 text-amber-600',       label: 'text-amber-600', value: 'text-gray-900' },
    rose:     { wrap: 'bg-rose-50 border-rose-200',             icon: 'bg-rose-100 text-rose-600',         label: 'text-rose-600',  value: 'text-gray-900' },
  }
  const s = styles[variant] ?? styles.default
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-3 ${s.wrap}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.icon}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wide leading-tight ${s.label}`}>{label}</p>
        {labelSub && <p className="text-xs text-gray-400 mb-1">{labelSub}</p>}
        <p className={`text-xl font-bold leading-tight mt-1 ${s.value}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon: Icon, title, subtitle, badge, onToggle, open = true, children, headerExtra }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print-full">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
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
            {badge && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary">{badge}</span>}
            {headerExtra}
            {onToggle && (
              <button onClick={onToggle} className="no-print p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <ChevronDown size={16} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
              </button>
            )}
          </div>
        </div>
      </div>
      {open && <div>{children}</div>}
    </div>
  )
}

// ─── Empty Row ────────────────────────────────────────────────────────────────

function EmptyRow({ icon: Icon, msg }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
      <Icon size={26} className="text-gray-300" />
      <p className="text-gray-400 text-sm">{msg}</p>
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function FundingBar({ pct }) {
  const p = Math.min(100, Math.max(0, pct || 0))
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-brand-primary rounded-full" style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-10 text-end">{fmtPct(p, 0)}</span>
    </div>
  )
}

// ─── PDF Summary Generator ────────────────────────────────────────────────────

function generateOwnerSummaryPDF(statement, lang) {
  const { owner: ow, summary: sum, propertyPortfolio: pp, reconciliation: rec } = statement
  const isRtl = lang === 'ar'

  const propRows = pp.map(p => `
    <tr>
      <td>${p.title}</td>
      <td>${Number(p.totalValue).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
      <td>${Number(p.tokenPrice).toFixed(2)}</td>
      <td>${p.soldTokens.toLocaleString()} / ${p.totalTokens.toLocaleString()}</td>
      <td>${Number(p.capitalRaised).toFixed(2)}</td>
      <td>${Number(p.fundingPct).toFixed(0)}%</td>
      <td>${p.status === 'APPROVED' ? (isRtl ? 'معتمد' : 'Approved') : p.status}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
<meta charset="UTF-8">
<title>${isRtl ? 'كشف حساب المالك' : 'Owner Statement'} — ${ow.fullName}</title>
<style>
  @page { size: A4; margin: 15mm 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 11px; line-height: 1.5; }
  .hdr { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 3px solid #1B4332; margin-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 900; color: #1B4332; }
  .brand-sub { font-size: 10px; color: #6b7280; margin-top: 2px; }
  .rt { text-align: ${isRtl ? 'left' : 'right'}; }
  .rt h1 { font-size: 16px; font-weight: 800; color: #1B4332; }
  .rt p { font-size: 9px; color: #6b7280; }
  .owner-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .field label { font-size: 8px; text-transform: uppercase; color: #9ca3af; font-weight: 700; letter-spacing: 0.5px; }
  .field p { font-size: 11px; font-weight: 600; color: #111827; margin-top: 1px; }
  .sec { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1B4332; letter-spacing: 0.5px; margin: 14px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #d1fae5; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 14px; }
  .kpi { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 10px; }
  .kpi label { font-size: 8px; text-transform: uppercase; color: #6b7280; font-weight: 700; display: block; margin-bottom: 3px; }
  .kpi .v { font-size: 13px; font-weight: 800; color: #111827; }
  .kpi .v.g { color: #059669; } .kpi .v.b { color: #1B4332; } .kpi .v.a { color: #d97706; }
  .kpi .u { font-size: 8px; color: #9ca3af; }
  .kpi-wide { grid-column: span 2; background: #1B4332; }
  .kpi-wide label { color: rgba(255,255,255,0.7); } .kpi-wide .v { color: #fff; font-size: 15px; } .kpi-wide .u { color: rgba(255,255,255,0.6); }
  table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 14px; }
  thead tr { background: #1B4332; color: white; }
  thead th { padding: 6px 8px; text-align: ${isRtl ? 'right' : 'left'}; font-size: 9px; font-weight: 700; text-transform: uppercase; }
  tbody tr:nth-child(even) { background: #f9fafb; }
  td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }
  .recon { background: ${rec.isBalanced ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${rec.isBalanced ? '#bbf7d0' : '#fecaca'}; border-radius: 6px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .recon .lbl { font-size: 11px; font-weight: 700; color: ${rec.isBalanced ? '#166534' : '#991b1b'}; }
  .recon .val { font-size: 14px; font-weight: 900; color: ${rec.isBalanced ? '#16a34a' : '#dc2626'}; }
  .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 8px; color: #9ca3af; }
  .disc { font-size: 8px; color: #9ca3af; font-style: italic; margin-top: 6px; }
</style>
</head>
<body>
<div class="hdr">
  <div><div class="brand">الوسم | ALWSM</div><div class="brand-sub">${isRtl ? 'منصة التملك العقاري الجزئي' : 'Fractional Real Estate Platform'}</div></div>
  <div class="rt"><h1>${isRtl ? 'كشف حساب المالك' : 'Owner Statement'}</h1><p>${isRtl ? 'تاريخ الإصدار:' : 'Generated:'} ${fmtDate(statement.generatedAt, lang)}</p></div>
</div>

<div class="owner-card">
  <div class="field"><label>${isRtl ? 'الاسم' : 'Name'}</label><p>${ow.fullName}</p></div>
  <div class="field"><label>${isRtl ? 'البريد' : 'Email'}</label><p>${ow.email}</p></div>
  <div class="field"><label>${isRtl ? 'الهوية' : 'National ID'}</label><p>${ow.nationalId ?? '—'}</p></div>
  <div class="field"><label>${isRtl ? 'الآيبان' : 'IBAN'}</label><p>${ow.ownerIban ?? '—'}</p></div>
</div>

<div class="sec">${isRtl ? 'ملخص الحساب' : 'Account Summary'}</div>
<div class="kpi-grid">
  <div class="kpi"><label>${isRtl ? 'رأس مال المستثمرين (التزام)' : 'Investor Capital (Liability)'}</label><div class="v b">${fmtSAR(sum.totalCapitalRaised)}</div><div class="u">SAR</div></div>
  <div class="kpi"><label>${isRtl ? 'الرصيد المتاح' : 'Available Balance'}</label><div class="v b">${fmtSAR(sum.availableBalance)}</div><div class="u">SAR</div></div>
  <div class="kpi"><label>${isRtl ? 'محوّل للمالك' : 'Transferred to Owner'}</label><div class="v">${fmtSAR(sum.transferredToOwner)}</div><div class="u">SAR</div></div>
  <div class="kpi"><label>${isRtl ? 'دخل إيجاري' : 'Rental Income'}</label><div class="v g">${fmtSAR(sum.totalRentalIncome)}</div><div class="u">SAR</div></div>
  <div class="kpi kpi-wide"><label>${isRtl ? 'التزام المنصة تجاه المالك' : 'Platform Liability To Owner'}</label><div class="v">${fmtSAR(sum.platformLiabilityToOwner)}</div><div class="u">SAR — ${isRtl ? 'التزام دائن مستحق الدفع' : 'Creditor Payable'}</div></div>
  <div class="kpi"><label>${isRtl ? 'نسبة التمويل' : 'Funding Progress'}</label><div class="v a">${fmtPct(sum.fundingProgressPct, 0)}</div></div>
  <div class="kpi"><label>${isRtl ? 'العقارات' : 'Properties'}</label><div class="v b">${sum.propertiesTokenized}</div></div>
</div>

<div class="sec">${isRtl ? 'محفظة العقارات' : 'Property Portfolio'}</div>
${pp.length > 0 ? `
<table>
  <thead><tr>
    <th>${isRtl ? 'العقار' : 'Property'}</th><th>${isRtl ? 'القيمة' : 'Value'}</th>
    <th>${isRtl ? 'سعر الحصة' : 'Token Price'}</th><th>${isRtl ? 'مباع/إجمالي' : 'Sold/Total'}</th>
    <th>${isRtl ? 'رأس المال' : 'Capital'}</th><th>${isRtl ? 'تمويل%' : 'Funded%'}</th>
    <th>${isRtl ? 'الحالة' : 'Status'}</th>
  </tr></thead>
  <tbody>${propRows}</tbody>
</table>` : `<p style="color:#9ca3af;font-size:10px;margin-bottom:14px;">${isRtl ? 'لا توجد عقارات' : 'No properties'}</p>`}

<div class="sec">${isRtl ? 'مطابقة التزامات المالك' : 'Owner Liability Reconciliation'}</div>
<div class="recon">
  <div class="lbl">${rec.isBalanced ? (isRtl ? '✓ الحساب مطابق — Financially Reconciled' : '✓ Financially Reconciled') : (isRtl ? '⚠️ يتطلب مراجعة — Needs Review' : '⚠️ Needs Review')}</div>
  <div class="val">${rec.isBalanced ? (isRtl ? 'لا فارق' : 'Balanced') : `${fmtSAR(Math.abs(rec.discrepancy))} SAR`}</div>
</div>

<div class="disc">${isRtl
  ? 'هذا التقرير يعتمد على السجلات المحاسبية الفعلية. القيم المعروضة هي قيم دفترية لا تعكس التقييم السوقي للعقار.'
  : 'This report is based on actual accounting records. Values shown are book values and do not reflect market valuation of properties.'}</div>
<div class="footer">
  <span>${isRtl ? 'منصة الوسم — كشف حساب رسمي للمالك' : 'ALWSM Platform — Official Owner Statement'}</span>
  <span>${isRtl ? 'تاريخ الإصدار:' : 'Generated:'} ${fmtDate(statement.generatedAt, lang)} | ${ow.email}</span>
</div>
<script>window.onload = function() { window.print(); }</script>
</body></html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (win) { win.document.write(html); win.document.close() }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminOwnerStatement() {
  const { i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const lang  = i18n.language?.startsWith('ar') ? 'ar' : 'en'

  const printRef = useRef(null)

  const [owners, setOwners]             = useState([])
  const [ownersLoading, setOwnersLoading] = useState(true)
  const [selectedOwnerId, setSelectedOwnerId] = useState('')
  const [ownerSearch, setOwnerSearch]   = useState('')
  const [statement, setStatement]       = useState(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [toast, setToast]               = useState(null)

  // Ledger filters
  const [ledgerSearch, setLedgerSearch]     = useState('')
  const [filterType, setFilterType]         = useState('ALL')
  const [filterProperty, setFilterProperty] = useState('ALL')
  const [filterFrom, setFilterFrom]         = useState('')
  const [filterTo, setFilterTo]             = useState('')

  // Section collapse
  const [showPortfolio, setShowPortfolio]         = useState(true)
  const [showCapital, setShowCapital]             = useState(true)
  const [showRental, setShowRental]               = useState(true)
  const [showSettlements, setShowSettlements]     = useState(true)
  const [showFees, setShowFees]                   = useState(true)
  const [showLedger, setShowLedger]               = useState(true)
  const [showRecon, setShowRecon]                 = useState(true)

  // ── Load owners ──────────────────────────────────────────────────────────
  const loadOwners = useCallback(async () => {
    setOwnersLoading(true)
    try {
      const res = await fetchJson('/api/admin/owner-statement', { headers: authHeader() })
      setOwners(Array.isArray(res.data) ? res.data : [])
    } catch { setOwners([]) }
    finally { setOwnersLoading(false) }
  }, [])

  useEffect(() => { loadOwners() }, [loadOwners])

  // ── Load statement ───────────────────────────────────────────────────────
  const loadStatement = useCallback(async (uid) => {
    if (!uid) return
    setLoading(true); setError(''); setStatement(null)
    try {
      const res = await fetchJson(`/api/admin/owner-statement/${uid}`, { headers: authHeader() })
      setStatement(res.data)
    } catch {
      setError(lang === 'ar' ? 'تعذّر تحميل كشف الحساب' : 'Failed to load statement')
    } finally { setLoading(false) }
  }, [lang])

  useEffect(() => {
    if (selectedOwnerId) loadStatement(selectedOwnerId)
    else setStatement(null)
  }, [selectedOwnerId, loadStatement])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  // ── Filtered owners dropdown ─────────────────────────────────────────────
  const filteredOwners = useMemo(() => {
    if (!ownerSearch.trim()) return owners
    const q = ownerSearch.toLowerCase()
    return owners.filter(o =>
      o.fullName?.toLowerCase().includes(q) ||
      o.email?.toLowerCase().includes(q) ||
      o.nationalId?.includes(q)
    )
  }, [owners, ownerSearch])

  // ── Property options for ledger filter ──────────────────────────────────
  const propertyOptions = useMemo(() => {
    if (!statement?.ledger) return []
    const map = new Map()
    map.set('ALL', lang === 'ar' ? 'كل العقارات' : 'All Properties')
    for (const row of statement.ledger) {
      if (row.propertyId && !map.has(row.propertyId)) {
        const p = statement.propertyPortfolio?.find(p => p.id === row.propertyId)
        map.set(row.propertyId, p?.title ?? row.propertyId)
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
        const d = (lang === 'ar' ? row.description : row.descriptionEn).toLowerCase()
        if (!d.includes(q) && !row.ref?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [statement, ledgerSearch, filterType, filterFrom, filterTo, filterProperty, lang])

  // ── Export CSV ───────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!statement) return
    const hdrs = lang === 'ar'
      ? ['#', 'التاريخ', 'النوع', 'الوصف', 'مدين', 'دائن', 'الرصيد']
      : ['#', 'Date', 'Type', 'Description', 'Debit', 'Credit', 'Balance']
    const rows = filteredLedger.map(r => [
      r.seq, fmtDateIso(r.date),
      lang === 'ar' ? (TX_CFG[r.type]?.ar ?? r.type) : (TX_CFG[r.type]?.en ?? r.type),
      lang === 'ar' ? r.description : r.descriptionEn,
      r.debit.toFixed(2), r.credit.toFixed(2), r.balance.toFixed(2),
    ])
    const content = [hdrs, ...rows].map(r => r.map(escapeCsv).join(',')).join('\n')
    const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `owner_statement_${statement.owner.email}_${today()}.csv`; a.click()
    URL.revokeObjectURL(url)
    showToast(lang === 'ar' ? 'تم تصدير CSV' : 'CSV exported')
  }

  // ── Export Excel ─────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (!statement) return
    const hdrs = ['#', 'Date', 'Type', 'Description', 'Debit SAR', 'Credit SAR', 'Balance SAR']
    const xmlRows = [
      `<Row>${hdrs.map(h => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}</Row>`,
      ...filteredLedger.map(r => {
        const vals = [r.seq, fmtDateIso(r.date), TX_CFG[r.type]?.en ?? r.type,
          r.descriptionEn, r.debit.toFixed(2), r.credit.toFixed(2), r.balance.toFixed(2)]
        return `<Row>${vals.map(v => `<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`).join('')}</Row>`
      }),
    ].join('\n')
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Owner Statement"><Table>${xmlRows}</Table></Worksheet>
</Workbook>`
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `owner_statement_${statement.owner.email}_${today()}.xls`; a.click()
    URL.revokeObjectURL(url)
    showToast(lang === 'ar' ? 'تم تصدير Excel' : 'Excel exported')
  }

  // ─── Render helpers ────────────────────────────────────────────────────────

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary bg-white'

  const LEDGER_TYPES = [
    { value: 'ALL',           label: lang === 'ar' ? 'كل الأنواع' : 'All Types' },
    { value: 'CAPITAL_RAISED',label: lang === 'ar' ? 'رأس مال مستثمرين' : 'Investor Capital' },
    { value: 'RENTAL_INCOME', label: lang === 'ar' ? 'دخل إيجاري' : 'Rental Income' },
    { value: 'SETTLEMENT',    label: lang === 'ar' ? 'تسوية دفع' : 'Settlement' },
    { value: 'PLATFORM_FEE',  label: lang === 'ar' ? 'رسوم منصة' : 'Platform Fee' },
    { value: 'EXPENSE',       label: lang === 'ar' ? 'مصروف' : 'Expense' },
    { value: 'REFUND',        label: lang === 'ar' ? 'استرداد' : 'Refund' },
    { value: 'ADJUSTMENT',    label: lang === 'ar' ? 'تعديل' : 'Adjustment' },
  ]

  const s   = statement
  const sum = s?.summary
  const rec = s?.reconciliation

  return (
    <>
      <style>{`
        @media print { .no-print { display: none !important; } .print-full { break-inside: avoid; } body { font-size: 11px; } }
      `}</style>

      <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold ${
            toast.type === 'info' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
          } ${isRtl ? 'left-4' : 'right-4'}`}>
            <CheckCircle2 size={16} />{toast.msg}
          </div>
        )}

        {/* ═══ PAGE HEADER ════════════════════════════════════════════════════ */}
        <div className="bg-brand-primary text-white rounded-2xl p-8 no-print">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Home size={24} className="text-brand-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {lang === 'ar' ? 'كشف حساب المالك' : 'Owner Statement'}
                </h1>
                <p className="text-white/70 text-sm mt-1">
                  {lang === 'ar'
                    ? 'المرجع المالي الرسمي — رأس المال، الإيجارات، التسويات، المطابقة'
                    : 'Official financial reference — capital, rentals, settlements, reconciliation'}
                </p>
              </div>
            </div>
            {s && (
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => { generateOwnerSummaryPDF(s, lang); showToast(lang === 'ar' ? 'جارٍ توليد PDF…' : 'Generating PDF…', 'info') }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl text-sm font-semibold transition-colors">
                  <Star size={14} />{lang === 'ar' ? 'ملخص PDF' : 'Summary PDF'}
                </button>
                <button onClick={() => { window.print(); showToast(lang === 'ar' ? 'جارٍ الطباعة…' : 'Printing…', 'info') }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold text-white transition-colors">
                  <Printer size={14} />{lang === 'ar' ? 'طباعة' : 'Print'}
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

        {/* ═══ OWNER SELECTOR ═════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 no-print">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-brand-primary/10 rounded-xl flex items-center justify-center">
              <Search size={18} className="text-brand-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{lang === 'ar' ? 'اختيار المالك' : 'Select Owner'}</h2>
              <p className="text-xs text-gray-400">{lang === 'ar' ? 'ابحث واختر مالك العقار لعرض كشف حسابه' : 'Search and select a property owner to view their statement'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{lang === 'ar' ? 'بحث' : 'Search'}</label>
              <div className="relative">
                <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRtl ? 'right-3' : 'left-3'}`} />
                <input value={ownerSearch} onChange={e => setOwnerSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'اسم، بريد إلكتروني، رقم هوية…' : 'Name, email, national ID…'}
                  className={`${inputCls} ${isRtl ? 'pr-9' : 'pl-9'}`} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{lang === 'ar' ? 'المالك' : 'Owner'}</label>
              {ownersLoading
                ? <div className="flex items-center gap-2 h-11 text-gray-400 text-sm"><Loader2 size={14} className="animate-spin" />{lang === 'ar' ? 'جارٍ التحميل…' : 'Loading…'}</div>
                : (
                  <select value={selectedOwnerId} onChange={e => setSelectedOwnerId(e.target.value)} className={inputCls}>
                    <option value="">{lang === 'ar' ? '— اختر المالك —' : '— Select Owner —'}</option>
                    {filteredOwners.map(o => (
                      <option key={o.id} value={o.id}>{o.fullName ?? o.email} — {o.email}</option>
                    ))}
                  </select>
                )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-brand-accent" size={28} />
            <span className="text-gray-500 text-sm font-medium">{lang === 'ar' ? 'جارٍ بناء كشف الحساب…' : 'Building statement…'}</span>
          </div>
        )}
        {error && (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="text-red-400" size={32} />
            <p className="text-red-600 text-sm font-medium">{error}</p>
            <button onClick={() => loadStatement(selectedOwnerId)} className="text-sm text-brand-accent hover:underline font-semibold">
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        )}

        {/* ═══ STATEMENT ══════════════════════════════════════════════════════ */}
        {s && !loading && (
          <div ref={printRef} className="space-y-6">

            {/* Print header */}
            <div className="hidden print:block print-full mb-6 border-b pb-4">
              <h1 className="text-2xl font-bold text-gray-900">{lang === 'ar' ? 'كشف حساب المالك' : 'Owner Statement'}</h1>
              <p className="text-sm text-gray-500 mt-1">{lang === 'ar' ? 'تاريخ الإصدار:' : 'Generated:'} {fmtDate(s.generatedAt, lang)}</p>
              <p className="text-sm text-gray-700 mt-2 font-semibold">{s.owner.fullName} — {s.owner.email}</p>
            </div>

            {/* ══ SECTION 1: OWNER PROFILE ════════════════════════════════════ */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 print-full">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={22} className="text-white" />
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: lang === 'ar' ? 'الاسم' : 'Name', value: s.owner.fullName },
                    { label: lang === 'ar' ? 'البريد الإلكتروني' : 'Email', value: s.owner.email },
                    { label: lang === 'ar' ? 'رقم الهوية / السجل التجاري' : 'National ID / CR', value: s.owner.nationalId ?? s.owner.commercialRegistration ?? '—' },
                    { label: lang === 'ar' ? 'الجوال' : 'Phone', value: s.owner.phoneNumber ?? s.owner.ownerPhone ?? '—' },
                    { label: lang === 'ar' ? 'الآيبان' : 'IBAN', value: s.owner.ownerIban ?? '—' },
                    { label: lang === 'ar' ? 'البنك / البريد' : 'Bank Email', value: s.owner.ownerEmail ?? '—' },
                    { label: lang === 'ar' ? 'عضو منذ' : 'Member Since', value: fmtDate(s.owner.memberSince, lang) },
                    { label: lang === 'ar' ? 'الحالة' : 'Status', value: s.owner.status === 'ACTIVE' ? (lang === 'ar' ? 'نشط ✓' : 'Active ✓') : s.owner.status },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">{f.label}</p>
                      <p className="text-sm font-bold text-gray-900">{f.value}</p>
                    </div>
                  ))}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{lang === 'ar' ? 'تاريخ التقرير:' : 'Report:'} {fmtDate(s.generatedAt, lang)}</span>
              </div>
            </div>

            {/* ══ SECTION 2: WALLET SUMMARY (KPIs) ════════════════════════════ */}
            <div className="print-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                  <BarChart3 size={18} className="text-brand-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{lang === 'ar' ? 'ملخص المحفظة المالية' : 'Owner Wallet Summary'}</h2>
                  <p className="text-xs text-gray-400">{lang === 'ar' ? 'نظرة شاملة على الوضع المالي للمالك' : 'Comprehensive financial position overview'}</p>
                </div>
              </div>

              {/* Row 1 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <KpiCard icon={ArrowUpCircle} variant="blue"
                  label={lang === 'ar' ? 'إجمالي رأس المال المجموع' : 'Total Capital Raised'}
                  labelSub={lang === 'ar' ? 'من مبيعات الحصص للمستثمرين' : 'From token sales to investors'}
                  value={`${fmtSAR(sum.totalCapitalRaised)} SAR`} />
                <KpiCard icon={Wallet} variant="default"
                  label={lang === 'ar' ? 'الرصيد المتاح' : 'Available Balance'}
                  labelSub={lang === 'ar' ? 'قابل للسحب' : 'Withdrawable now'}
                  value={`${fmtSAR(sum.availableBalance)} SAR`} />
                <KpiCard icon={Clock} variant="amber"
                  label={lang === 'ar' ? 'تسويات قيد الانتظار' : 'Pending Settlements'}
                  labelSub={lang === 'ar' ? 'طلبات سحب لم تُعتمد' : 'Awaiting approval'}
                  value={`${fmtSAR(sum.pendingSettlements)} SAR`} />
                <KpiCard icon={Banknote} variant="green"
                  label={lang === 'ar' ? 'محوّل للمالك' : 'Transferred to Owner'}
                  labelSub={lang === 'ar' ? 'إجمالي التحويلات المعتمدة' : 'Total approved transfers'}
                  value={`${fmtSAR(sum.transferredToOwner)} SAR`} />
              </div>
              {/* Row 2: Platform Liability (prominent, spans 2 cols) + Owner Receivable */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2">
                  <KpiCard icon={AlertTriangle} variant="accent"
                    label={lang === 'ar' ? 'التزام المنصة تجاه المالك' : 'Platform Liability To Owner'}
                    labelSub={lang === 'ar' ? 'ما تدين به الوسم للمالك — رأس المال + إيجارات − تسويات' : 'What ALWSM owes this owner — Capital + Rental − Transferred'}
                    value={`${fmtSAR(sum.platformLiabilityToOwner)} SAR`}
                    sub={lang === 'ar' ? 'التزام دائن في ميزانية الوسم' : 'Creditor payable in ALWSM balance sheet'} />
                </div>
                <KpiCard icon={Wallet} variant="green"
                  label={lang === 'ar' ? 'رصيد المالك المستحق' : 'Owner Receivable Balance'}
                  labelSub={lang === 'ar' ? 'رأس المال + إيجارات − محوّل' : 'Capital + Rental − Transferred'}
                  value={`${fmtSAR(sum.ownerReceivableBalance)} SAR`} />
              </div>
              {/* Row 3: Rental + Investor Funds Held + Funding Progress */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <KpiCard icon={TrendingUp} variant="accent"
                  label={lang === 'ar' ? 'إجمالي الدخل الإيجاري' : 'Total Rental Income'}
                  labelSub={lang === 'ar' ? 'مجموع التوزيعات الإيجارية' : 'Sum of all payout totals'}
                  value={`${fmtSAR(sum.totalRentalIncome)} SAR`} />
                <KpiCard icon={ArrowUpCircle} variant="blue"
                  label={lang === 'ar' ? 'أموال المستثمرين المحتفظ بها' : 'Investor Funds Held'}
                  labelSub={lang === 'ar' ? 'رأس مال المستثمرين — التزام على المنصة' : 'Investor capital collected — platform liability'}
                  value={`${fmtSAR(sum.investorFundsHeld)} SAR`} />
                <KpiCard icon={BarChart3} variant="amber"
                  label={lang === 'ar' ? 'نسبة التمويل الإجمالية' : 'Overall Funding Progress'}
                  labelSub={lang === 'ar' ? 'حصص مباعة / إجمالي الحصص' : 'Tokens sold / total tokens'}
                  value={fmtPct(sum.fundingProgressPct, 1)}
                  sub={`${sum.totalTokensSold.toLocaleString()} / ${(sum.totalTokensSold + sum.totalTokensRemaining).toLocaleString()} ${lang === 'ar' ? 'حصة' : 'tokens'}`} />
              </div>
              {/* Row 4: Properties + Tokens + Investors */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard icon={Building2}
                  label={lang === 'ar' ? 'العقارات المرمّزة' : 'Properties Tokenized'}
                  value={sum.propertiesTokenized}
                  sub={lang === 'ar' ? 'عقار استثماري' : 'investment properties'} />
                <KpiCard icon={Coins}
                  label={lang === 'ar' ? 'الحصص المباعة' : 'Tokens Sold'}
                  value={sum.totalTokensSold.toLocaleString()}
                  sub={lang === 'ar' ? 'حصة ملكية مباعة' : 'ownership tokens sold'} />
                <KpiCard icon={Coins} variant="amber"
                  label={lang === 'ar' ? 'الحصص المتبقية' : 'Tokens Remaining'}
                  value={sum.totalTokensRemaining.toLocaleString()}
                  sub={lang === 'ar' ? 'متاحة للبيع' : 'available for sale'} />
                <KpiCard icon={User}
                  label={lang === 'ar' ? 'عدد المستثمرين' : 'Total Investors'}
                  value={sum.totalInvestors}
                  sub={lang === 'ar' ? 'مستثمر فريد' : 'unique investors'} />
              </div>
            </div>

            {/* ══ SECTION 3: PROPERTY PORTFOLIO ═══════════════════════════════ */}
            <Section icon={Building2}
              title={lang === 'ar' ? 'محفظة العقارات' : 'Property Portfolio'}
              subtitle={lang === 'ar' ? 'جميع العقارات المرمّزة مع تفاصيل التمويل' : 'All tokenized properties with funding details'}
              badge={`${s.propertyPortfolio.length} ${lang === 'ar' ? 'عقار' : 'properties'}`}
              open={showPortfolio} onToggle={() => setShowPortfolio(v => !v)}>
              {s.propertyPortfolio.length === 0
                ? <EmptyRow icon={Building2} msg={lang === 'ar' ? 'لا توجد عقارات مسجلة' : 'No properties registered'} />
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {[
                            lang === 'ar' ? 'العقار' : 'Property',
                            lang === 'ar' ? 'القيمة الكلية' : 'Total Value',
                            lang === 'ar' ? 'سعر الحصة' : 'Token Price',
                            lang === 'ar' ? 'الحصص (مباع/إجمالي)' : 'Tokens (Sold/Total)',
                            lang === 'ar' ? 'رأس المال المجموع' : 'Capital Raised',
                            lang === 'ar' ? 'نسبة المالك%' : 'Owner Retain%',
                            lang === 'ar' ? 'نسبة التمويل' : 'Funding',
                            lang === 'ar' ? 'عدد المستثمرين' : 'Investors',
                            lang === 'ar' ? 'الحالة' : 'Status',
                            lang === 'ar' ? 'تاريخ الترميز' : 'Tokenized',
                          ].map(h => (
                            <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {s.propertyPortfolio.map((p, i) => (
                          <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-gray-900">{p.title}</p>
                              <p className="text-xs text-gray-400">{p.city || p.location}</p>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900">{fmtSAR(p.totalValue)} SAR</td>
                            <td className="px-4 py-3 text-gray-600">{fmtSAR(p.tokenPrice)}</td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-brand-primary">{p.soldTokens.toLocaleString()}</span>
                              <span className="text-gray-400"> / {p.totalTokens.toLocaleString()}</span>
                            </td>
                            <td className="px-4 py-3 font-bold text-emerald-700">{fmtSAR(p.capitalRaised)} SAR</td>
                            <td className="px-4 py-3 text-xs text-gray-600">{fmtPct(p.ownerRetainedPct)}</td>
                            <td className="px-4 py-3 w-32"><FundingBar pct={p.fundingPct} /></td>
                            <td className="px-4 py-3 text-center font-semibold text-gray-700">{p.investorCount}</td>
                            <td className="px-4 py-3"><StatusBadge status={p.status} map={PROP_STATUS} /></td>
                            <td className="px-4 py-3 text-xs text-gray-600">{fmtDate(p.tokenizationDate, lang)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-brand-primary/5 border-t-2 border-brand-primary/20">
                          <td colSpan={4} className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">{lang === 'ar' ? 'الإجمالي' : 'Total'}</td>
                          <td className="px-4 py-3 font-black text-emerald-700">{fmtSAR(s.propertyPortfolio.reduce((a, p) => a + p.capitalRaised, 0))} SAR</td>
                          <td colSpan={5} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
            </Section>

            {/* ══ SECTION 4: CAPITAL RAISING HISTORY ══════════════════════════ */}
            <Section icon={ArrowUpCircle}
              title={lang === 'ar' ? 'سجل جمع رأس المال' : 'Capital Raising History'}
              subtitle={lang === 'ar' ? 'كل عملية بيع حصص للمستثمرين' : 'Every token sale event to investors'}
              badge={`${s.capitalRaisingHistory.length} ${lang === 'ar' ? 'عملية' : 'orders'}`}
              open={showCapital} onToggle={() => setShowCapital(v => !v)}>
              {s.capitalRaisingHistory.length === 0
                ? <EmptyRow icon={Coins} msg={lang === 'ar' ? 'لا توجد مبيعات حصص' : 'No token sales yet'} />
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {[
                            lang === 'ar' ? 'التاريخ' : 'Date',
                            lang === 'ar' ? 'العقار' : 'Property',
                            lang === 'ar' ? 'الحصص' : 'Tokens',
                            lang === 'ar' ? 'المبلغ' : 'Amount',
                            lang === 'ar' ? 'المستثمر' : 'Investor',
                            lang === 'ar' ? 'الحالة' : 'Status',
                            lang === 'ar' ? 'رقم العملية' : 'Order ID',
                          ].map(h => <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {s.capitalRaisingHistory.map((o, i) => (
                          <tr key={o.id} className={`border-b border-gray-100 hover:bg-blue-50/20 ${i % 2 === 0 ? 'bg-white' : 'bg-blue-50/10'}`}>
                            <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{fmtDate(o.date, lang)}</td>
                            <td className="px-4 py-3 font-semibold text-gray-900">{o.propertyTitle}</td>
                            <td className="px-4 py-3 font-bold text-gray-900">{o.tokens.toLocaleString()}</td>
                            <td className="px-4 py-3 font-bold text-emerald-700">+{fmtSAR(o.amount)} SAR</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{o.investorName}</td>
                            <td className="px-4 py-3"><StatusBadge status={o.status} map={ORDER_STATUS} /></td>
                            <td className="px-4 py-3 text-xs font-mono text-gray-400" title={o.id}>{o.id.slice(0, 10)}…</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                          <td colSpan={3} className="px-4 py-3 text-xs font-bold text-emerald-800 uppercase">{lang === 'ar' ? 'الإجمالي' : 'Total'}</td>
                          <td className="px-4 py-3 font-black text-emerald-700">+{fmtSAR(s.capitalRaisingHistory.reduce((a, o) => a + o.amount, 0))} SAR</td>
                          <td colSpan={3} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
            </Section>

            {/* ══ SECTION 5: RENTAL INCOME STATEMENT ══════════════════════════ */}
            <Section icon={TrendingUp}
              title={lang === 'ar' ? 'كشف الدخل الإيجاري' : 'Rental Income Statement'}
              subtitle={lang === 'ar' ? 'توزيعات الإيجار لكل عقار وفترة' : 'Rent distributions per property and period'}
              badge={`${s.rentalIncomeStatement.length} ${lang === 'ar' ? 'توزيعة' : 'payouts'}`}
              open={showRental} onToggle={() => setShowRental(v => !v)}>
              <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    {lang === 'ar'
                      ? 'تُعرض قيمة إجمالي المبلغ الموزع. تفصيل المصروفات (صيانة، إدارة، تأمين) يتطلب سجلات إضافية غير متوفرة حالياً في النظام.'
                      : 'Total payout amount is shown. Expense breakdown (maintenance, management, insurance) requires additional records not currently tracked in the system.'}
                  </p>
                </div>
              </div>
              {s.rentalIncomeStatement.length === 0
                ? <EmptyRow icon={TrendingUp} msg={lang === 'ar' ? 'لا توجد توزيعات إيجارية' : 'No rental payouts yet'} />
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-emerald-50 border-b border-emerald-100">
                          {[
                            lang === 'ar' ? 'العقار' : 'Property',
                            lang === 'ar' ? 'الفترة' : 'Period',
                            lang === 'ar' ? 'تاريخ التوزيع' : 'Payout Date',
                            lang === 'ar' ? 'إجمالي المبلغ الموزع' : 'Total Payout',
                            lang === 'ar' ? 'موزّع على المستثمرين' : 'Distributed to Investors',
                            lang === 'ar' ? 'عدد المستثمرين' : 'Investors',
                          ].map(h => <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-emerald-700 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {s.rentalIncomeStatement.map((p, i) => (
                          <tr key={p.id} className={`border-b border-gray-100 hover:bg-emerald-50/30 ${i % 2 === 0 ? 'bg-white' : 'bg-emerald-50/10'}`}>
                            <td className="px-4 py-3 font-semibold text-gray-900">{p.propertyTitle}</td>
                            <td className="px-4 py-3 text-xs font-mono text-gray-600">{p.period}</td>
                            <td className="px-4 py-3 text-xs text-gray-700">{fmtDate(p.date, lang)}</td>
                            <td className="px-4 py-3 font-bold text-emerald-700">+{fmtSAR(p.totalPayoutAmount)} SAR</td>
                            <td className="px-4 py-3 text-gray-600">{fmtSAR(p.totalDistributedToInvestors)} SAR</td>
                            <td className="px-4 py-3 text-center text-gray-700 font-semibold">{p.distributionCount}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-emerald-100 border-t-2 border-emerald-300">
                          <td colSpan={3} className="px-4 py-3 text-xs font-bold text-emerald-800 uppercase">{lang === 'ar' ? 'الإجمالي' : 'Total'}</td>
                          <td className="px-4 py-3 font-black text-emerald-700">+{fmtSAR(s.rentalIncomeStatement.reduce((a, p) => a + p.totalPayoutAmount, 0))} SAR</td>
                          <td className="px-4 py-3 text-gray-600 font-bold">{fmtSAR(s.rentalIncomeStatement.reduce((a, p) => a + p.totalDistributedToInvestors, 0))} SAR</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
            </Section>

            {/* ══ SECTION 6: SETTLEMENT HISTORY ════════════════════════════════ */}
            <Section icon={Banknote}
              title={lang === 'ar' ? 'سجل التسويات' : 'Settlement History'}
              subtitle={lang === 'ar' ? 'جميع طلبات السحب والتحويلات للمالك' : 'All withdrawal requests and transfers to owner'}
              badge={`${s.settlementHistory.length} ${lang === 'ar' ? 'طلب' : 'requests'}`}
              open={showSettlements} onToggle={() => setShowSettlements(v => !v)}>
              {s.settlementHistory.length === 0
                ? <EmptyRow icon={Banknote} msg={lang === 'ar' ? 'لا توجد طلبات سحب' : 'No settlement requests'} />
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {[
                            lang === 'ar' ? 'التاريخ' : 'Date',
                            lang === 'ar' ? 'تاريخ المعالجة' : 'Processed',
                            lang === 'ar' ? 'المبلغ' : 'Amount',
                            lang === 'ar' ? 'البنك' : 'Bank',
                            lang === 'ar' ? 'الآيبان' : 'IBAN',
                            lang === 'ar' ? 'الحالة' : 'Status',
                            lang === 'ar' ? 'ملاحظة' : 'Note',
                            lang === 'ar' ? 'رقم العملية' : 'Ref',
                          ].map(h => <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {s.settlementHistory.map((w, i) => (
                          <tr key={w.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                            <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{fmtDate(w.date, lang)}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{w.reviewedAt ? fmtDate(w.reviewedAt, lang) : '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`font-bold text-sm ${w.status === 'APPROVED' ? 'text-rose-600' : 'text-gray-700'}`}>
                                {w.status === 'APPROVED' ? '(' : ''}{fmtSAR(w.amount)}{w.status === 'APPROVED' ? ')' : ''} SAR
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{w.bankName ?? '—'}</td>
                            <td className="px-4 py-3 text-xs font-mono text-gray-500">{w.iban ? w.iban.slice(0, 8) + '…' : '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                w.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                w.status === 'PENDING'  ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {w.status === 'APPROVED' ? (lang === 'ar' ? 'مُحوّل' : 'Transferred') :
                                 w.status === 'PENDING'  ? (lang === 'ar' ? 'قيد الانتظار' : 'Pending') :
                                 (lang === 'ar' ? 'مرفوض' : 'Rejected')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 max-w-32 truncate">{w.adminNote ?? '—'}</td>
                            <td className="px-4 py-3 text-xs font-mono text-gray-400" title={w.ref}>{w.ref.slice(0, 10)}…</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 border-t-2 border-gray-300">
                          <td colSpan={2} className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">{lang === 'ar' ? 'الإجمالي المحوّل' : 'Total Transferred'}</td>
                          <td className="px-4 py-3 font-black text-rose-600">
                            ({fmtSAR(s.settlementHistory.filter(w => w.status === 'APPROVED').reduce((a, w) => a + w.amount, 0))}) SAR
                          </td>
                          <td colSpan={5} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
            </Section>

            {/* ══ SECTION 7: PLATFORM FEES ══════════════════════════════════════ */}
            <Section icon={DollarSign}
              title={lang === 'ar' ? 'كشف رسوم المنصة' : 'Platform Fees Statement'}
              subtitle={lang === 'ar' ? 'سجل الرسوم المدفوعة لمنصة الوسم' : 'Record of fees paid to ALWSM platform'}
              badge="N/A"
              open={showFees} onToggle={() => setShowFees(v => !v)}>
              <div className="flex flex-col items-center justify-center py-12 gap-3 px-6">
                <DollarSign size={28} className="text-gray-300" />
                <p className="text-gray-500 text-sm font-medium text-center">
                  {lang === 'ar'
                    ? 'تتبع رسوم المنصة غير متاح حالياً'
                    : 'Platform fee tracking not available in current system'}
                </p>
                <p className="text-gray-400 text-xs text-center max-w-md">
                  {lang === 'ar'
                    ? 'لا يوجد جدول مخصص لتسجيل رسوم التوكنة، الإدارة، والتوزيع. يمكن تفعيل هذه الميزة بإضافة جدول PlatformFee في قاعدة البيانات.'
                    : 'No dedicated table exists for tokenization, management, and distribution fees. This feature can be activated by adding a PlatformFee table to the database.'}
                </p>
              </div>
            </Section>

            {/* ══ SECTION 8: FINANCIAL LEDGER ══════════════════════════════════ */}
            <Section icon={FileText}
              title={lang === 'ar' ? 'دفتر الحركات المالية' : 'Financial Ledger'}
              subtitle={lang === 'ar' ? 'جميع الحركات مرتبة زمنياً مع الرصيد التراكمي' : 'All transactions chronologically with running balance'}
              badge={`${filteredLedger.length} ${lang === 'ar' ? 'حركة' : 'entries'}`}
              open={showLedger} onToggle={() => setShowLedger(v => !v)}>
              {/* Search + Filters */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 no-print space-y-3">
                <div className="relative">
                  <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRtl ? 'right-3' : 'left-3'}`} />
                  <input value={ledgerSearch} onChange={e => setLedgerSearch(e.target.value)}
                    placeholder={lang === 'ar' ? 'ابحث في الوصف، رقم العملية…' : 'Search description, ref…'}
                    className={`${inputCls} ${isRtl ? 'pr-9' : 'pl-9'}`} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{lang === 'ar' ? 'النوع' : 'Type'}</label>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className={inputCls}>
                      {LEDGER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{lang === 'ar' ? 'العقار' : 'Property'}</label>
                    <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)} className={inputCls}>
                      {propertyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{lang === 'ar' ? 'من' : 'From'}</label>
                    <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{lang === 'ar' ? 'إلى' : 'To'}</label>
                    <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>
              {filteredLedger.length === 0
                ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <FileText size={26} className="text-gray-300" />
                    <p className="text-gray-400 text-sm">{lang === 'ar' ? 'لا توجد نتائج' : 'No results'}</p>
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
                            { label: lang === 'ar' ? 'النوع' : 'Type', cls: 'w-44' },
                            { label: lang === 'ar' ? 'الوصف' : 'Description', cls: '' },
                            { label: lang === 'ar' ? 'مدين' : 'Debit', cls: 'w-36 text-end' },
                            { label: lang === 'ar' ? 'دائن' : 'Credit', cls: 'w-36 text-end' },
                            { label: lang === 'ar' ? 'الرصيد' : 'Balance', cls: 'w-36 text-end' },
                          ].map(h => (
                            <th key={h.label} className={`px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${h.cls}`}>{h.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLedger.map((row, i) => {
                          const cfg = TX_CFG[row.type] ?? TX_CFG.ADJUSTMENT
                          return (
                            <tr key={`${row.ref}-${i}`} className={`border-b border-gray-100 hover:brightness-95 transition-colors ${cfg.row || (i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40')}`}>
                              <td className="px-4 py-3 text-xs font-mono text-gray-400">{row.seq}</td>
                              <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{fmtDate(row.date, lang)}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cfg.badge}`}>
                                  {lang === 'ar' ? cfg.ar : cfg.en}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-800 max-w-xs truncate">{lang === 'ar' ? row.description : row.descriptionEn}</td>
                              <td className="px-4 py-3 text-end whitespace-nowrap">
                                {row.debit > 0 ? <span className="text-rose-600 font-semibold text-sm">({fmtSAR(row.debit)})</span> : <span className="text-gray-200">—</span>}
                              </td>
                              <td className="px-4 py-3 text-end whitespace-nowrap">
                                {row.credit > 0 ? <span className="text-emerald-600 font-semibold text-sm">+{fmtSAR(row.credit)}</span> : <span className="text-gray-200">—</span>}
                              </td>
                              <td className="px-4 py-3 text-end whitespace-nowrap">
                                <span className={`font-bold text-sm ${row.balance < 0 ? 'text-rose-600' : 'text-gray-900'}`}>{fmtSAR(row.balance)}</span>
                                <span className="text-xs text-gray-400 ms-1">SAR</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 border-t-2 border-gray-300">
                          <td colSpan={4} className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">
                            {lang === 'ar' ? 'الإجماليات' : 'Totals'}
                            <span className="ms-2 font-normal text-gray-400">({filteredLedger.length} {lang === 'ar' ? 'حركة' : 'entries'})</span>
                          </td>
                          <td className="px-4 py-3 text-end font-bold text-rose-600 text-sm">({fmtSAR(filteredLedger.reduce((a, r) => a + r.debit, 0))})</td>
                          <td className="px-4 py-3 text-end font-bold text-emerald-600 text-sm">+{fmtSAR(filteredLedger.reduce((a, r) => a + r.credit, 0))}</td>
                          <td className="px-4 py-3 text-end font-bold text-gray-900 text-sm">
                            {filteredLedger.length > 0 ? fmtSAR(filteredLedger.at(-1).balance) : '—'} SAR
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
            </Section>

            {/* ══ SECTION 9: RECONCILIATION ══════════════════════════════════════ */}
            <div className={`rounded-2xl border shadow-sm overflow-hidden print-full ${rec.isBalanced ? 'bg-white border-gray-200' : 'bg-red-50 border-red-300'}`}>
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ShieldCheck size={18} className="text-brand-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">{lang === 'ar' ? 'مطابقة التزامات المالك' : 'Owner Liability Reconciliation'}</h2>
                      <p className="text-xs text-gray-400">{lang === 'ar' ? 'التحقق من الالتزام المستحق للمالك — رأس مال + إيجارات − تسويات' : 'Verify ALWSM payable to owner — Capital + Rental − Settlements'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border ${rec.isBalanced ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
                      {rec.isBalanced
                        ? <><CheckCircle2 size={16} />{lang === 'ar' ? 'الحساب مطابق ✓' : '✓ Financially Reconciled'}</>
                        : <><AlertTriangle size={16} />{lang === 'ar' ? 'يتطلب مراجعة ⚠️' : '⚠️ Needs Review'}</>}
                    </div>
                    <button onClick={() => setShowRecon(v => !v)} className="no-print p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <ChevronDown size={16} className={`transition-transform ${showRecon ? '' : '-rotate-90'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {showRecon && (
                <div className="p-6">
                  {!rec.isBalanced && (
                    <div className="flex items-start gap-3 p-4 bg-red-100 border border-red-300 rounded-xl mb-6">
                      <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-800 font-bold text-sm">{lang === 'ar' ? '⚠️ تنبيه: فارق في المطابقة' : '⚠️ RECONCILIATION ALERT'}</p>
                        <p className="text-red-700 text-xs mt-0.5">
                          {lang === 'ar'
                            ? `الفارق: ${fmtSAR(Math.abs(rec.discrepancy))} SAR — يُرجى مراجعة الحركات المالية`
                            : `Discrepancy: ${fmtSAR(Math.abs(rec.discrepancy))} SAR — Please review transactions`}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{lang === 'ar' ? 'تفصيل الالتزام المتوقع للمالك' : 'Expected Owner Liability Breakdown'}</p>
                      {[
                        { label: lang === 'ar' ? '+ رأس المال المجموع (التزام)' : '+ Capital Raised (Liability)',        value: rec.totalCapitalRaised, sign: '+', color: 'text-blue-700' },
                        { label: lang === 'ar' ? '+ الدخل الإيجاري (إيراد)'      : '+ Rental Income (Income)',            value: rec.totalRentalIncome,  sign: '+', color: 'text-emerald-700' },
                        { label: lang === 'ar' ? '− تسويات محوّلة (تخفيض التزام)': '− Settlements Transferred (Liability Reduction)', value: rec.totalSettlements, sign: '-', color: 'text-rose-700' },
                        { label: lang === 'ar' ? '− رسوم المنصة'                  : '− Platform Fees',                   value: rec.platformFeesPaid,   sign: '-', color: 'text-gray-500' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">{item.label}</span>
                          <span className={`text-sm font-semibold ${item.color}`}>
                            {item.sign === '+' ? '+' : '('}{fmtSAR(item.value)}{item.sign === '-' ? ')' : ''} SAR
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between py-3 border-t-2 border-gray-300">
                        <span className="text-sm font-bold text-gray-800">{lang === 'ar' ? '= الالتزام المتوقع للمالك (مستحق الدفع)' : '= Expected Owner Liability (Payable)'}</span>
                        <span className="text-base font-bold text-gray-900">{fmtSAR(rec.expectedOwnerLiability ?? rec.expectedBalance)} SAR</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{lang === 'ar' ? 'المقارنة مع الرصيد الفعلي' : 'vs. Actual Wallet Balance'}</p>
                      <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                        {[
                          { label: lang === 'ar' ? 'الالتزام المتوقع للمالك' : 'Expected Owner Liability', value: rec.expectedOwnerLiability ?? rec.expectedBalance },
                          { label: lang === 'ar' ? 'الرصيد الفعلي (المحفظة)' : 'Actual Balance (Wallet)', value: rec.actualBalance },
                        ].map(item => (
                          <div key={item.label} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{item.label}</span>
                            <span className="text-sm font-bold text-gray-800">{fmtSAR(item.value)} SAR</span>
                          </div>
                        ))}
                        <div className={`flex justify-between items-center pt-3 border-t ${rec.isBalanced ? 'border-green-200' : 'border-red-200'}`}>
                          <span className="text-sm font-bold text-gray-700">{lang === 'ar' ? 'الفارق' : 'Discrepancy'}</span>
                          <span className={`text-sm font-bold ${rec.isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
                            {rec.isBalanced ? '✓ 0.00' : fmtSAR(rec.discrepancy)} SAR
                          </span>
                        </div>
                      </div>
                      <div className={`flex items-center gap-3 p-4 rounded-xl border font-semibold text-sm ${rec.isBalanced ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
                        {rec.isBalanced
                          ? <><CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />{lang === 'ar' ? 'الالتزام للمالك مطابق للرصيد الفعلي ✓' : 'Owner liability matches actual wallet balance ✓'}</>
                          : <><AlertTriangle size={20} className="text-red-600 flex-shrink-0" />{lang === 'ar' ? 'يوجد فارق — يتطلب مراجعة' : 'Discrepancy — review needed'}</>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Print footer */}
            <div className="hidden print:block text-center text-xs text-gray-400 pt-4 border-t mt-8">
              {lang === 'ar'
                ? `منصة الوسم — كشف حساب المالك الرسمي — تاريخ الإصدار: ${fmtDate(s.generatedAt, lang)}`
                : `ALWSM Platform — Official Owner Statement — Generated: ${fmtDate(s.generatedAt, lang)}`}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selectedOwnerId && !loading && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20 gap-4 no-print">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <Home size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm font-medium">
              {lang === 'ar' ? 'اختر مالكاً لعرض كشف حسابه' : 'Select an owner to view their statement'}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
