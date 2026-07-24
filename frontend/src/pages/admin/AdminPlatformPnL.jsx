import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, Users, Building2,
  Download, FileSpreadsheet, Printer, Star, Loader2, AlertCircle,
  CheckCircle2, AlertTriangle, ShieldCheck, ChevronDown, Search,
  Plus, X, Coins, CreditCard, Banknote, FileText, PieChart,
} from 'lucide-react'
import { authHeader, fetchJson } from '../../lib/api'
import { useTranslation } from 'react-i18next'

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtSAR = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtPct = (n, d = 1) => Number(n || 0).toFixed(d) + '%'

const fmtDate = (d, lang = 'ar') =>
  d
    ? new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—'

const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '')

const escapeCsv = (val) => {
  const s = String(val ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s
}

// ─── Revenue & Expense Config (factory — depends on lang) ─────────────────────

function getRevCfg(lang) {
  return {
    INVESTMENT_FEE: {
      ar: 'رسوم عمليات الاستثمار',
      en: 'Investment Transaction Fees',
      color: 'bg-brand-primary',
      barColor: 'bg-brand-primary',
      examples: lang === 'ar' ? 'رسوم الشراء، رسوم المعالجة' : 'Purchase fees, processing fees',
      icon: Coins,
    },
    PREPARATION_FEE: {
      ar: 'رسوم تجهيز العقار',
      en: 'Property Preparation Fees',
      color: 'bg-teal-500',
      barColor: 'bg-teal-500',
      examples: lang === 'ar' ? 'مراجعة، توثيق، تقييم، إعداد العقار' : 'Review, verification, valuation, onboarding',
      icon: Building2,
    },
    OWNER_FEE: {
      ar: 'رسوم الملاك (قديمة)',
      en: 'Owner Fees (legacy)',
      color: 'bg-blue-400',
      barColor: 'bg-blue-400',
      examples: lang === 'ar' ? 'فئة قديمة — للتوافق فقط' : 'Legacy category — backward compatibility only',
      icon: Building2,
    },
    MANAGEMENT_FEE: {
      ar: 'رسوم إدارة المنصة',
      en: 'Platform Management Fees',
      color: 'bg-indigo-500',
      barColor: 'bg-indigo-500',
      examples: lang === 'ar' ? 'رسوم الإدارة السنوية' : 'Annual management, asset management',
      icon: TrendingUp,
    },
    SUBSCRIPTION: {
      ar: 'إيرادات الاشتراكات',
      en: 'Subscription Revenue',
      color: 'bg-purple-500',
      barColor: 'bg-purple-500',
      examples: lang === 'ar' ? 'حسابات مميزة، خطط المؤسسات' : 'Premium accounts, enterprise plans',
      icon: CreditCard,
    },
    OTHER: {
      ar: 'إيرادات أخرى',
      en: 'Other Revenue',
      color: 'bg-gray-500',
      barColor: 'bg-gray-500',
      examples: lang === 'ar' ? 'غرامات، رسوم الخدمة' : 'Penalties, service charges',
      icon: DollarSign,
    },
  }
}

function getExpCfg(lang) {
  return {
    TECHNOLOGY: {
      ar: 'التقنية',
      en: 'Technology',
      color: 'bg-sky-500',
      barColor: 'bg-sky-500',
      examples: lang === 'ar' ? 'AWS، الخوادم، المجالات، الأمن' : 'AWS, RDS, domains, security tools',
      icon: BarChart3,
    },
    OPERATIONS: {
      ar: 'العمليات',
      en: 'Operations',
      color: 'bg-orange-500',
      barColor: 'bg-orange-500',
      examples: lang === 'ar' ? 'مكتب، رسوم بنكية، بوابات الدفع' : 'Office, bank charges, payment gateway',
      icon: Banknote,
    },
    MARKETING: {
      ar: 'التسويق',
      en: 'Marketing',
      color: 'bg-pink-500',
      barColor: 'bg-pink-500',
      examples: lang === 'ar' ? 'إعلانات، محتوى، فعاليات' : 'Advertising, content, events',
      icon: TrendingUp,
    },
    PAYROLL: {
      ar: 'الرواتب',
      en: 'Payroll',
      color: 'bg-brand-primary',
      barColor: 'bg-brand-primary',
      examples: lang === 'ar' ? 'الموظفون، المستقلون' : 'Founders, employees, contractors',
      icon: Users,
    },
    PROFESSIONAL_SERVICES: {
      ar: 'الخدمات المهنية',
      en: 'Professional Services',
      color: 'bg-teal-500',
      barColor: 'bg-teal-500',
      examples: lang === 'ar' ? 'محاسبة، قانوني، تدقيق، امتثال' : 'Accounting, legal, audit, compliance',
      icon: ShieldCheck,
    },
    OTHER: {
      ar: 'مصروفات أخرى',
      en: 'Other Expenses',
      color: 'bg-gray-500',
      barColor: 'bg-gray-500',
      examples: lang === 'ar' ? 'متنوعة' : 'Miscellaneous',
      icon: FileText,
    },
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, labelSub, value, sub, variant = 'default' }) {
  const styles = {
    default: {
      wrap: 'bg-white border-gray-200',
      icon: 'bg-brand-primary/8 text-brand-primary',
      label: 'text-gray-500',
      value: 'text-gray-900',
    },
    accent: {
      wrap: 'bg-brand-primary border-brand-primary text-white',
      icon: 'bg-white/15 text-white',
      label: 'text-white/70',
      value: 'text-white',
    },
    green: {
      wrap: 'bg-emerald-50 border-emerald-200',
      icon: 'bg-emerald-100 text-emerald-600',
      label: 'text-emerald-600',
      value: 'text-gray-900',
    },
    blue: {
      wrap: 'bg-blue-50 border-blue-200',
      icon: 'bg-blue-100 text-blue-600',
      label: 'text-blue-600',
      value: 'text-gray-900',
    },
    amber: {
      wrap: 'bg-amber-50 border-amber-200',
      icon: 'bg-amber-100 text-amber-600',
      label: 'text-amber-600',
      value: 'text-gray-900',
    },
    rose: {
      wrap: 'bg-rose-50 border-rose-200',
      icon: 'bg-rose-100 text-rose-600',
      label: 'text-rose-600',
      value: 'text-gray-900',
    },
    profit: {
      wrap: 'bg-emerald-600 border-emerald-700 text-white',
      icon: 'bg-white/20 text-white',
      label: 'text-white/80',
      value: 'text-white',
    },
    loss: {
      wrap: 'bg-red-600 border-red-700 text-white',
      icon: 'bg-white/20 text-white',
      label: 'text-white/80',
      value: 'text-white',
    },
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

function Section({ icon: Icon, title, subtitle, badge, open = true, onToggle, children, headerExtra }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
            {badge && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary">
                {badge}
              </span>
            )}
            {headerExtra}
            {onToggle && (
              <button
                onClick={onToggle}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform ${open ? '' : 'rotate-[-90deg]'}`}
                />
              </button>
            )}
          </div>
        </div>
      </div>
      {open && <div>{children}</div>}
    </div>
  )
}

function MiniBar({ value, max, color = 'bg-brand-primary' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-full h-24 bg-gray-100 rounded-t flex flex-col justify-end">
        <div
          className={`w-full rounded-t transition-all ${color}`}
          style={{ height: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function RevenueBar({ pct, color = 'bg-brand-primary' }) {
  const p = Math.min(100, Math.max(0, pct || 0))
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-500 w-10 text-end">{p.toFixed(1)}%</span>
    </div>
  )
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

function generatePnLPDF(data, lang) {
  if (!data) return
  const s = data.summary
  const isAr = lang === 'ar'
  const dir = isAr ? 'rtl' : 'ltr'
  const fmtN = (n) => fmtSAR(n) + ' SAR'

  const revRows = (data.revenue?.breakdown || [])
    .map(
      (r) => `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${r.label}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:end">${fmtN(r.amount)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:end">${fmtPct(r.pct)}</td>
      </tr>`
    )
    .join('')

  const expRows = (data.expenses?.breakdown || [])
    .map(
      (e) => `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${e.label}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:end">${fmtN(e.amount)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:end">${fmtPct(e.pct)}</td>
      </tr>`
    )
    .join('')

  const recon = data.reconciliation || {}
  const reconStatus = recon.fullyBalanced
    ? `<span style="color:#16a34a;font-weight:700">${isAr ? 'التقرير متوازن' : 'Report Balanced'}</span>`
    : `<span style="color:#dc2626;font-weight:700">${isAr ? 'يحتاج مراجعة' : 'Review Needed'}</span>`

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${isAr ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8" />
  <title>${isAr ? 'قائمة الإيرادات والمصاريف - ALWSM' : 'Platform P&L Statement - ALWSM'}</title>
  <style>
    body { font-family: ${isAr ? "'Tajawal', " : ''}Arial, sans-serif; direction: ${dir}; color:#111; margin:0; padding:32px; background:#fff }
    h1 { color:#1a1a2e; margin:0 }
    h2 { font-size:14px; color:#444; border-bottom:2px solid #e5e7eb; padding-bottom:6px; margin-top:28px }
    table { width:100%; border-collapse:collapse; font-size:13px }
    th { background:#f9fafb; padding:8px 12px; text-align:start; font-size:12px; color:#6b7280; font-weight:600; border-bottom:2px solid #e5e7eb }
    .kpi-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px; margin:16px 0 }
    .kpi { background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:12px 16px }
    .kpi-label { font-size:10px; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:.04em }
    .kpi-value { font-size:18px; font-weight:700; color:#111; margin-top:2px }
    .brand { color:#2563eb }
    .positive { color:#16a34a; font-weight:700 }
    .negative { color:#dc2626; font-weight:700 }
    .notice { background:#fefce8; border:1px solid #fde68a; border-radius:8px; padding:10px 14px; font-size:12px; color:#92400e; margin:16px 0 }
    @media print { body { padding:16px } }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:24px">
    <div>
      <h1 style="font-size:22px">ALWSM <span class="brand">${isAr ? 'علوسم' : ''}</span></h1>
      <p style="margin:4px 0 0;color:#6b7280;font-size:13px">${isAr ? 'قائمة الإيرادات والمصاريف للمنصة' : 'Platform Profit & Loss Statement'}</p>
    </div>
    <div style="text-align:end">
      <p style="margin:0;font-size:12px;color:#6b7280">${isAr ? 'الفترة' : 'Period'}</p>
      <p style="margin:2px 0 0;font-weight:600;font-size:13px">${fmtDate(data.period?.from, lang)} — ${fmtDate(data.period?.to, lang)}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#9ca3af">${isAr ? 'تاريخ الإنشاء' : 'Generated'}: ${fmtDate(data.generatedAt, lang)}</p>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">${isAr ? 'إجمالي الإيرادات' : 'Total Revenue'}</div>
      <div class="kpi-value positive">${fmtN(s?.totalRevenue)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${isAr ? 'إجمالي المصاريف' : 'Total Expenses'}</div>
      <div class="kpi-value negative">${fmtN(s?.totalExpenses)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${isAr ? 'صافي الربح' : 'Net Profit'}</div>
      <div class="kpi-value ${(s?.netProfit || 0) >= 0 ? 'positive' : 'negative'}">${fmtN(s?.netProfit)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${isAr ? 'هامش الربح' : 'Profit Margin'}</div>
      <div class="kpi-value">${fmtPct(s?.profitMarginPct)}</div>
    </div>
  </div>

  <h2>${isAr ? 'تفصيل الإيرادات' : 'Revenue Breakdown'}</h2>
  <table>
    <thead><tr>
      <th>${isAr ? 'نوع الإيراد' : 'Revenue Type'}</th>
      <th style="text-align:end">${isAr ? 'المبلغ' : 'Amount'}</th>
      <th style="text-align:end">${isAr ? 'النسبة' : '%'}</th>
    </tr></thead>
    <tbody>${revRows}</tbody>
    <tfoot><tr style="background:#f0fdf4">
      <td style="padding:8px 12px;font-weight:700">${isAr ? 'الإجمالي' : 'Total'}</td>
      <td style="padding:8px 12px;text-align:end;font-weight:700" class="positive">${fmtN(data.revenue?.total)}</td>
      <td style="padding:8px 12px;text-align:end;font-weight:700">100%</td>
    </tr></tfoot>
  </table>

  <h2>${isAr ? 'تفصيل المصاريف' : 'Expense Breakdown'}</h2>
  <table>
    <thead><tr>
      <th>${isAr ? 'الفئة' : 'Category'}</th>
      <th style="text-align:end">${isAr ? 'المبلغ' : 'Amount'}</th>
      <th style="text-align:end">${isAr ? 'النسبة' : '%'}</th>
    </tr></thead>
    <tbody>${expRows}</tbody>
    <tfoot><tr style="background:#fff1f2">
      <td style="padding:8px 12px;font-weight:700">${isAr ? 'الإجمالي' : 'Total'}</td>
      <td style="padding:8px 12px;text-align:end;font-weight:700" class="negative">${fmtN(data.expenses?.total)}</td>
      <td style="padding:8px 12px;text-align:end;font-weight:700">100%</td>
    </tr></tfoot>
  </table>

  <h2>${isAr ? 'حالة المطابقة' : 'Reconciliation Status'}</h2>
  <table>
    <tbody>
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${isAr ? 'إجمالي مصادر الإيراد' : 'Revenue Sources Total'}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:end">${fmtN(recon.revenueSourcesTotal)}</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${isAr ? 'إجمالي الإيراد (KPI)' : 'Revenue KPI Total'}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:end">${fmtN(recon.revenueKpi)}</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${isAr ? 'إجمالي مصادر المصروف' : 'Expense Sources Total'}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:end">${fmtN(recon.expenseSourcesTotal)}</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${isAr ? 'صافي الربح' : 'Net Profit'}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:end;font-weight:700">${fmtN(recon.netProfit)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-weight:700">${isAr ? 'حالة التقرير' : 'Report Status'}</td>
        <td style="padding:8px 12px;text-align:end">${reconStatus}</td>
      </tr>
    </tbody>
  </table>

  <div class="notice" style="margin-top:24px">
    <strong>${isAr ? 'تنبيه محاسبي:' : 'Accounting Notice:'}</strong>
    ${isAr
      ? ' رأس مال المستثمرين والتسويات للملاك ليست إيراداً للمنصة. يعرض هذا التقرير فقط رسوم المنصة الفعلية والتكاليف التشغيلية.'
      : ' Investor capital and owner settlements are NOT platform revenue. This report shows only ALWSM fee income and operational costs.'}
  </div>

  <p style="margin-top:32px;font-size:11px;color:#9ca3af;text-align:center">
    ALWSM Platform — ${isAr ? 'تقرير سري للاستخدام الداخلي فقط' : 'Confidential — Internal Use Only'} — ${new Date().toLocaleDateString()}
  </p>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 600)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPlatformPnL() {
  const { i18n } = useTranslation()
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en'
  const isRtl = lang === 'ar'

  const REV_CFG = useMemo(() => getRevCfg(lang), [lang])
  const EXP_CFG = useMemo(() => getExpCfg(lang), [lang])

  // ── State ──────────────────────────────────────────────────────────────────
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  // Filters
  const [filterFrom, setFilterFrom] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 11)
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [filterTo, setFilterTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [filterProperty, setFilterProperty] = useState('ALL')
  const [filterRevenueType, setFilterRevenueType] = useState('ALL')
  const [filterExpenseCategory, setFilterExpenseCategory] = useState('ALL')

  // Modals
  const [showAddRevenue, setShowAddRevenue] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [addRevenueForm, setAddRevenueForm] = useState({
    type: 'INVESTMENT_FEE',
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  })
  const [addExpenseForm, setAddExpenseForm] = useState({
    category: 'TECHNOLOGY',
    description: '',
    amount: '',
    vendor: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
    invoiceRef: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Section toggles
  const [showRevenue, setShowRevenue] = useState(true)
  const [showExpenses, setShowExpenses] = useState(true)
  const [showTrend, setShowTrend] = useState(true)
  const [showPropProfit, setShowPropProfit] = useState(true)
  const [showCashFlow, setShowCashFlow] = useState(true)
  const [showRecon, setShowRecon] = useState(true)

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    setData(null)
    const params = new URLSearchParams()
    if (filterFrom) params.set('from', filterFrom)
    if (filterTo) params.set('to', filterTo)
    if (filterProperty !== 'ALL') params.set('propertyId', filterProperty)
    if (filterRevenueType !== 'ALL') params.set('revenueType', filterRevenueType)
    if (filterExpenseCategory !== 'ALL') params.set('expenseCategory', filterExpenseCategory)
    try {
      const res = await fetchJson(`/api/admin/platform-pnl?${params}`, {
        headers: authHeader(),
      })
      setData(res.data)
    } catch {
      setError(lang === 'ar' ? 'تعذّر تحميل التقرير' : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [filterFrom, filterTo, filterProperty, filterRevenueType, filterExpenseCategory, lang])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Quick date helpers ─────────────────────────────────────────────────────
  const setThisMonth = () => {
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    setFilterFrom(from)
    setFilterTo(now.toISOString().slice(0, 10))
  }
  const setThisQuarter = () => {
    const now = new Date()
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      .toISOString()
      .slice(0, 10)
    setFilterFrom(qStart)
    setFilterTo(now.toISOString().slice(0, 10))
  }
  const setThisYear = () => {
    const now = new Date()
    setFilterFrom(`${now.getFullYear()}-01-01`)
    setFilterTo(now.toISOString().slice(0, 10))
  }

  // ── Submit revenue ─────────────────────────────────────────────────────────
  const submitRevenue = async () => {
    if (!addRevenueForm.description || !addRevenueForm.amount) return
    setSubmitting(true)
    try {
      await fetchJson('/api/admin/platform-pnl/revenue', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addRevenueForm, amount: parseFloat(addRevenueForm.amount) }),
      })
      setShowAddRevenue(false)
      setAddRevenueForm({
        type: 'INVESTMENT_FEE',
        description: '',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        notes: '',
      })
      showToast(lang === 'ar' ? 'تم إضافة الإيراد' : 'Revenue entry added')
      loadData()
    } catch {
      showToast(lang === 'ar' ? 'فشل في الحفظ' : 'Failed to save', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Submit expense ─────────────────────────────────────────────────────────
  const submitExpense = async () => {
    if (!addExpenseForm.description || !addExpenseForm.amount) return
    setSubmitting(true)
    try {
      await fetchJson('/api/admin/platform-pnl/expense', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addExpenseForm, amount: parseFloat(addExpenseForm.amount) }),
      })
      setShowAddExpense(false)
      setAddExpenseForm({
        category: 'TECHNOLOGY',
        description: '',
        amount: '',
        vendor: '',
        date: new Date().toISOString().slice(0, 10),
        notes: '',
        invoiceRef: '',
      })
      showToast(lang === 'ar' ? 'تم إضافة المصروف' : 'Expense entry added')
      loadData()
    } catch {
      showToast(lang === 'ar' ? 'فشل في الحفظ' : 'Failed to save', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const exportExpenseCsv = () => {
    if (!data?.expenses?.entries?.length) return
    const headers = [
      lang === 'ar' ? 'التاريخ' : 'Date',
      lang === 'ar' ? 'الفئة' : 'Category',
      lang === 'ar' ? 'الوصف' : 'Description',
      lang === 'ar' ? 'المورد' : 'Vendor',
      lang === 'ar' ? 'المبلغ (SAR)' : 'Amount (SAR)',
      lang === 'ar' ? 'رقم الفاتورة' : 'Invoice Ref',
    ]
    const rows = data.expenses.entries.map((e) => [
      escapeCsv(fmtDate(e.date || e.createdAt, 'en')),
      escapeCsv(EXP_CFG[e.category]?.[lang] || e.category),
      escapeCsv(e.description),
      escapeCsv(e.vendor || ''),
      escapeCsv(fmtSAR(e.amount)),
      escapeCsv(e.invoiceRef || ''),
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `alwsm_expenses_${today()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const s = data?.summary || {}
  const isProfit = (s.netProfit || 0) >= 0
  const propList = useMemo(() => data?.propertyProfitability || [], [data])
  const monthlyTrend = useMemo(() => data?.monthlyTrend || [], [data])
  const maxTrendVal = useMemo(
    () => Math.max(1, ...monthlyTrend.map((m) => Math.max(m.revenue || 0, m.expenses || 0))),
    [monthlyTrend]
  )

  const inputCls =
    'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary bg-white'
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-50">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .print-break { page-break-before: always; }
        }
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-6 ${isRtl ? 'left-6' : 'right-6'} z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold transition-all
            ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}
        >
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="bg-brand-primary no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center flex-shrink-0">
                <PieChart size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {lang === 'ar' ? 'قائمة الإيرادات والمصاريف' : 'Platform P&L Statement'}
                </h1>
                <p className="text-white/70 text-sm mt-0.5">
                  {lang === 'ar' ? 'تقرير الأداء المالي للمنصة — ALWSM' : 'ALWSM Platform Financial Performance Report'}
                </p>
                {data?.period && (
                  <p className="text-white/60 text-xs mt-1">
                    {fmtDate(data.period.from, lang)} — {fmtDate(data.period.to, lang)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => generatePnLPDF(data, lang)}
                disabled={!data}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-40"
              >
                <FileText size={15} />
                {lang === 'ar' ? 'PDF' : 'Summary PDF'}
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
              >
                <Printer size={15} />
                {lang === 'ar' ? 'طباعة' : 'Print'}
              </button>
              <button
                onClick={exportExpenseCsv}
                disabled={!data?.expenses?.entries?.length}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-40"
              >
                <FileSpreadsheet size={15} />
                {lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}
              </button>
              <button
                onClick={() => setShowAddRevenue(true)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
              >
                <Plus size={15} />
                {lang === 'ar' ? 'إضافة إيراد' : 'Add Revenue'}
              </button>
              <button
                onClick={() => setShowAddExpense(true)}
                className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
              >
                <Plus size={15} />
                {lang === 'ar' ? 'إضافة مصروف' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Filter Bar ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>{lang === 'ar' ? 'من تاريخ' : 'From Date'}</label>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{lang === 'ar' ? 'إلى تاريخ' : 'To Date'}</label>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{lang === 'ar' ? 'العقار' : 'Property'}</label>
              <select
                value={filterProperty}
                onChange={(e) => setFilterProperty(e.target.value)}
                className={inputCls}
              >
                <option value="ALL">{lang === 'ar' ? 'كل العقارات' : 'All Properties'}</option>
                {propList.map((p) => (
                  <option key={p.propertyId} value={p.propertyId}>
                    {p.propertyTitle || p.propertyId}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{lang === 'ar' ? 'نوع الإيراد' : 'Revenue Type'}</label>
              <select
                value={filterRevenueType}
                onChange={(e) => setFilterRevenueType(e.target.value)}
                className={inputCls}
              >
                <option value="ALL">{lang === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
                {Object.entries(REV_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v[lang]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-gray-500">
              {lang === 'ar' ? 'فلاتر سريعة:' : 'Quick:'}
            </span>
            <button
              onClick={setThisMonth}
              className="text-xs font-semibold text-brand-primary bg-brand-primary/8 hover:bg-brand-primary/15 px-3 py-1.5 rounded-lg transition"
            >
              {lang === 'ar' ? 'هذا الشهر' : 'This Month'}
            </button>
            <button
              onClick={setThisQuarter}
              className="text-xs font-semibold text-brand-primary bg-brand-primary/8 hover:bg-brand-primary/15 px-3 py-1.5 rounded-lg transition"
            >
              {lang === 'ar' ? 'هذا الربع' : 'This Quarter'}
            </button>
            <button
              onClick={setThisYear}
              className="text-xs font-semibold text-brand-primary bg-brand-primary/8 hover:bg-brand-primary/15 px-3 py-1.5 rounded-lg transition"
            >
              {lang === 'ar' ? 'هذه السنة' : 'This Year'}
            </button>
            <div className="flex-1" />
            <div>
              <label className={labelCls + ' inline-block me-2'}>{lang === 'ar' ? 'فئة المصروف' : 'Expense Category'}</label>
              <select
                value={filterExpenseCategory}
                onChange={(e) => setFilterExpenseCategory(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary bg-white"
              >
                <option value="ALL">{lang === 'ar' ? 'كل الفئات' : 'All Categories'}</option>
                {Object.entries(EXP_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v[lang]}</option>
                ))}
              </select>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 bg-brand-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-brand-primary/90 transition"
            >
              <Search size={14} />
              {lang === 'ar' ? 'تطبيق' : 'Apply'}
            </button>
            <button
              onClick={() => {
                const now = new Date()
                const from = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10)
                setFilterFrom(from)
                setFilterTo(now.toISOString().slice(0, 10))
                setFilterProperty('ALL')
                setFilterRevenueType('ALL')
                setFilterExpenseCategory('ALL')
              }}
              className="flex items-center gap-2 border border-gray-200 text-gray-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition"
            >
              <X size={14} />
              {lang === 'ar' ? 'إعادة ضبط' : 'Reset'}
            </button>
          </div>
        </div>

        {/* ── Accounting Notice ── */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-semibold text-sm">
              {lang === 'ar' ? 'مبدأ محاسبي أساسي' : 'Core Accounting Principle'}
            </p>
            <p className="text-amber-700 text-xs mt-0.5">
              {lang === 'ar'
                ? 'رأس مال المستثمرين والتسويات للملاك ليست إيراداً للمنصة. يعرض هذا التقرير فقط رسوم الوسم الفعلية والتكاليف التشغيلية.'
                : 'Investor capital and owner settlements are NOT platform revenue. This report shows only ALWSM fee income and operational costs.'}
            </p>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={36} className="animate-spin text-brand-primary" />
              <p className="text-gray-500 text-sm font-medium">
                {lang === 'ar' ? 'جارٍ تحميل التقرير…' : 'Loading report…'}
              </p>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
            <AlertCircle size={36} className="text-red-500" />
            <div>
              <p className="text-red-800 font-semibold">{error}</p>
              <p className="text-red-600 text-sm mt-1">
                {lang === 'ar' ? 'تحقق من الاتصال وحاول مجدداً' : 'Check your connection and try again'}
              </p>
            </div>
            <button
              onClick={loadData}
              className="bg-red-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-red-700 transition text-sm"
            >
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        )}

        {/* ── Data sections ── */}
        {!loading && !error && data && (
          <>
            {/* ─ SECTION 1: Executive KPIs ─ */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide px-1">
                {lang === 'ar' ? 'ملخص تنفيذي' : 'Executive Summary'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                  icon={TrendingUp}
                  label={lang === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
                  labelSub={lang === 'ar' ? 'رسوم المنصة فقط' : 'Platform fees only'}
                  value={`${fmtSAR(s.totalRevenue)} SAR`}
                  variant="green"
                />
                <KpiCard
                  icon={TrendingDown}
                  label={lang === 'ar' ? 'إجمالي المصاريف' : 'Total Expenses'}
                  labelSub={lang === 'ar' ? 'التكاليف التشغيلية' : 'Operational costs'}
                  value={`${fmtSAR(s.totalExpenses)} SAR`}
                  variant="rose"
                />
                <KpiCard
                  icon={isProfit ? Star : AlertTriangle}
                  label={lang === 'ar' ? 'صافي الربح / الخسارة' : 'Net Profit / Loss'}
                  labelSub={lang === 'ar' ? 'الإيرادات − المصاريف' : 'Revenue − Expenses'}
                  value={`${fmtSAR(s.netProfit)} SAR`}
                  variant={isProfit ? 'profit' : 'loss'}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                  icon={PieChart}
                  label={lang === 'ar' ? 'هامش الربح' : 'Profit Margin'}
                  value={fmtPct(s.profitMarginPct)}
                  sub={lang === 'ar' ? 'من إجمالي الإيرادات' : 'Of total revenue'}
                  variant="amber"
                />
                <KpiCard
                  icon={Users}
                  label={lang === 'ar' ? 'المستثمرون النشطون' : 'Active Investors'}
                  value={String(s.activeInvestors || 0)}
                  sub={lang === 'ar' ? 'في الفترة المحددة' : 'In selected period'}
                  variant="blue"
                />
                <KpiCard
                  icon={Building2}
                  label={lang === 'ar' ? 'العقارات النشطة' : 'Active Properties'}
                  value={String(s.activeProperties || 0)}
                  sub={lang === 'ar' ? 'توليد إيرادات' : 'Generating revenue'}
                  variant="default"
                />
              </div>
            </div>

            {/* ─ SECTION 2: Revenue Breakdown ─ */}
            <Section
              icon={TrendingUp}
              title={lang === 'ar' ? 'تفصيل الإيرادات' : 'Revenue Breakdown'}
              subtitle={lang === 'ar' ? 'مصادر الإيراد وإسهامها في الإجمالي' : 'Revenue sources and their contribution to total'}
              badge={`${fmtSAR(data.revenue?.total)} SAR`}
              open={showRevenue}
              onToggle={() => setShowRevenue((v) => !v)}
              headerExtra={
                <button
                  onClick={() => setShowAddRevenue(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-primary bg-brand-primary/8 hover:bg-brand-primary/15 px-3 py-1.5 rounded-lg transition no-print"
                >
                  <Plus size={13} />
                  {lang === 'ar' ? 'إضافة إيراد' : 'Add Revenue'}
                </button>
              }
            >
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(data.revenue?.breakdown || []).map((rev) => {
                    const cfg = REV_CFG[rev.type] || REV_CFG.OTHER
                    const Icon = cfg.icon
                    return (
                      <div
                        key={rev.type}
                        className="bg-gray-50 border border-gray-100 rounded-2xl p-4 hover:border-gray-200 transition"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-8 h-8 ${cfg.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                            <Icon size={15} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-700 truncate">{cfg[lang]}</p>
                            <p className="text-xs text-gray-400 truncate">{cfg.examples}</p>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-gray-900">{fmtSAR(rev.amount)} SAR</p>
                        <RevenueBar pct={rev.pct} color={cfg.barColor} />
                        {rev.type === 'INVESTMENT_FEE' && data.feeRate && (
                          <p className="text-xs text-gray-400 mt-2">
                            {lang === 'ar'
                              ? `${data.feeRate}% من قيمة العملية`
                              : `${data.feeRate}% of order value`}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Manual revenue entries table */}
                {data.revenue?.manualEntries?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-3">
                      {lang === 'ar' ? 'الإدخالات اليدوية' : 'Manual Entries'}
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                            <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                            <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{lang === 'ar' ? 'الوصف' : 'Description'}</th>
                            <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500">{lang === 'ar' ? 'المبلغ' : 'Amount'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.revenue.manualEntries.map((e, i) => (
                            <tr key={e.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                              <td className="px-4 py-3 text-gray-600 text-xs">{fmtDate(e.date || e.createdAt, lang)}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                  {REV_CFG[e.type]?.[lang] || e.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-700 text-xs">{e.description}</td>
                              <td className="px-4 py-3 text-end font-semibold text-emerald-700 text-sm">{fmtSAR(e.amount)} SAR</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* ─ SECTION 3: Expense Breakdown ─ */}
            <Section
              icon={TrendingDown}
              title={lang === 'ar' ? 'تفصيل المصاريف' : 'Expense Breakdown'}
              subtitle={lang === 'ar' ? 'فئات المصاريف التشغيلية' : 'Operational expense categories'}
              badge={`${fmtSAR(data.expenses?.total)} SAR`}
              open={showExpenses}
              onToggle={() => setShowExpenses((v) => !v)}
              headerExtra={
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition no-print"
                >
                  <Plus size={13} />
                  {lang === 'ar' ? 'إضافة مصروف' : 'Add Expense'}
                </button>
              }
            >
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(data.expenses?.breakdown || []).map((exp) => {
                    const cfg = EXP_CFG[exp.category] || EXP_CFG.OTHER
                    const Icon = cfg.icon
                    return (
                      <div
                        key={exp.category}
                        className="bg-gray-50 border border-gray-100 rounded-2xl p-4 hover:border-gray-200 transition"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-8 h-8 ${cfg.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                            <Icon size={15} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-700 truncate">{cfg[lang]}</p>
                            <p className="text-xs text-gray-400 truncate">{cfg.examples}</p>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-gray-900">{fmtSAR(exp.amount)} SAR</p>
                        <RevenueBar pct={exp.pct} color={cfg.barColor} />
                      </div>
                    )
                  })}
                </div>

                {/* Expense entries table */}
                {data.expenses?.entries?.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-gray-700">
                        {lang === 'ar' ? 'سجل المصاريف' : 'Expense Entries'}
                      </h3>
                      <button
                        onClick={exportExpenseCsv}
                        className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition no-print"
                      >
                        <Download size={13} />
                        CSV
                      </button>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                            <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{lang === 'ar' ? 'الفئة' : 'Category'}</th>
                            <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{lang === 'ar' ? 'الوصف' : 'Description'}</th>
                            <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{lang === 'ar' ? 'المورد' : 'Vendor'}</th>
                            <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500">{lang === 'ar' ? 'المبلغ' : 'Amount'}</th>
                            <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{lang === 'ar' ? 'رقم الفاتورة' : 'Invoice Ref'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.expenses.entries.map((e, i) => (
                            <tr key={e.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                              <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtDate(e.date || e.createdAt, lang)}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${EXP_CFG[e.category]?.color.replace('bg-', 'bg-').replace('500', '100')} text-gray-800`}>
                                  {EXP_CFG[e.category]?.[lang] || e.category}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-700 text-xs max-w-[180px] truncate">{e.description}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{e.vendor || '—'}</td>
                              <td className="px-4 py-3 text-end font-semibold text-rose-700 text-sm whitespace-nowrap">{fmtSAR(e.amount)} SAR</td>
                              <td className="px-4 py-3 text-gray-400 text-xs font-mono">{e.invoiceRef || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* ─ SECTION 4: Monthly Trend ─ */}
            <Section
              icon={BarChart3}
              title={lang === 'ar' ? 'الاتجاه الشهري' : 'Monthly Trend'}
              subtitle={lang === 'ar' ? 'إيرادات ومصاريف وصافي ربح كل شهر' : 'Revenue, expenses and net profit per month'}
              open={showTrend}
              onToggle={() => setShowTrend((v) => !v)}
            >
              <div className="p-6">
                {monthlyTrend.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">
                    {lang === 'ar' ? 'لا توجد بيانات للفترة المحددة' : 'No data for selected period'}
                  </p>
                ) : (
                  <>
                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-4 mb-6 no-print">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-brand-primary" />
                        <span className="text-xs text-gray-600 font-medium">{lang === 'ar' ? 'الإيرادات' : 'Revenue'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500" />
                        <span className="text-xs text-gray-600 font-medium">{lang === 'ar' ? 'المصاريف' : 'Expenses'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-xs text-gray-600 font-medium">{lang === 'ar' ? 'صافي الربح' : 'Net Profit'}</span>
                      </div>
                    </div>

                    {/* Bar chart rows */}
                    <div className="overflow-x-auto">
                      <div className="min-w-[600px]">
                        {/* Revenue bars */}
                        <div className="mb-1">
                          <p className="text-xs font-semibold text-gray-500 mb-2">{lang === 'ar' ? 'الإيرادات' : 'Revenue'}</p>
                          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${monthlyTrend.length}, 1fr)` }}>
                            {monthlyTrend.map((m) => (
                              <div key={m.month} title={`${m.month}: ${fmtSAR(m.revenue)} SAR`}>
                                <MiniBar value={m.revenue} max={maxTrendVal} color="bg-brand-primary" />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Expense bars */}
                        <div className="mb-1 mt-3">
                          <p className="text-xs font-semibold text-gray-500 mb-2">{lang === 'ar' ? 'المصاريف' : 'Expenses'}</p>
                          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${monthlyTrend.length}, 1fr)` }}>
                            {monthlyTrend.map((m) => (
                              <div key={m.month} title={`${m.month}: ${fmtSAR(m.expenses)} SAR`}>
                                <MiniBar value={m.expenses} max={maxTrendVal} color="bg-rose-400" />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Net profit bars */}
                        <div className="mb-2 mt-3">
                          <p className="text-xs font-semibold text-gray-500 mb-2">{lang === 'ar' ? 'صافي الربح' : 'Net Profit'}</p>
                          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${monthlyTrend.length}, 1fr)` }}>
                            {monthlyTrend.map((m) => (
                              <div key={m.month} title={`${m.month}: ${fmtSAR(m.netProfit)} SAR`}>
                                <MiniBar
                                  value={Math.max(0, m.netProfit || 0)}
                                  max={maxTrendVal}
                                  color={(m.netProfit || 0) >= 0 ? 'bg-emerald-500' : 'bg-rose-600'}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Month labels */}
                        <div className="grid gap-1 mt-2" style={{ gridTemplateColumns: `repeat(${monthlyTrend.length}, 1fr)` }}>
                          {monthlyTrend.map((m) => (
                            <div key={m.month} className="text-center">
                              <span className="text-[10px] text-gray-400 font-medium">
                                {new Date(m.month + '-01').toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Monthly data table summary */}
                    <div className="mt-6 overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-sm min-w-[500px]">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{lang === 'ar' ? 'الشهر' : 'Month'}</th>
                            <th className="px-4 py-3 text-end text-xs font-semibold text-emerald-600">{lang === 'ar' ? 'الإيرادات' : 'Revenue'}</th>
                            <th className="px-4 py-3 text-end text-xs font-semibold text-rose-600">{lang === 'ar' ? 'المصاريف' : 'Expenses'}</th>
                            <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500">{lang === 'ar' ? 'صافي الربح' : 'Net Profit'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyTrend.map((m, i) => (
                            <tr key={m.month} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                              <td className="px-4 py-2.5 text-gray-700 text-xs font-medium">
                                {new Date(m.month + '-01').toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', { year: 'numeric', month: 'long' })}
                              </td>
                              <td className="px-4 py-2.5 text-end text-emerald-700 font-semibold text-xs">{fmtSAR(m.revenue)}</td>
                              <td className="px-4 py-2.5 text-end text-rose-700 font-semibold text-xs">{fmtSAR(m.expenses)}</td>
                              <td className={`px-4 py-2.5 text-end font-bold text-xs ${(m.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                {fmtSAR(m.netProfit)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </Section>

            {/* ─ SECTION 5: Property Profitability ─ */}
            <Section
              icon={Building2}
              title={lang === 'ar' ? 'ربحية العقارات' : 'Property Profitability'}
              subtitle={lang === 'ar' ? 'مساهمة كل عقار في إيرادات المنصة' : 'Each property contribution to platform revenue'}
              open={showPropProfit}
              onToggle={() => setShowPropProfit((v) => !v)}
            >
              <div className="p-6">
                {propList.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">
                    {lang === 'ar' ? 'لا توجد بيانات عقارات' : 'No property data'}
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{lang === 'ar' ? 'العقار' : 'Property'}</th>
                          <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500">{lang === 'ar' ? 'الطلبات' : 'Orders'}</th>
                          <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500">{lang === 'ar' ? 'المستثمرون' : 'Investors'}</th>
                          <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500">{lang === 'ar' ? 'الإيراد المحقق' : 'Revenue Generated'}</th>
                          <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500">{lang === 'ar' ? '% من الإجمالي' : '% of Total'}</th>
                          <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500">{lang === 'ar' ? 'صافي المساهمة' : 'Net Contribution'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propList.map((p, i) => {
                          const pctOfTotal =
                            data.revenue?.total > 0
                              ? ((p.revenue / data.revenue.total) * 100).toFixed(1)
                              : '0.0'
                          return (
                            <tr key={p.propertyId} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                              <td className="px-4 py-3">
                                <p className="text-sm font-semibold text-gray-900">{p.propertyTitle || p.propertyId}</p>
                                <p className="text-xs text-gray-400 font-mono">{p.propertyId?.slice(0, 8)}…</p>
                              </td>
                              <td className="px-4 py-3 text-end text-gray-700 font-semibold">{p.orders || 0}</td>
                              <td className="px-4 py-3 text-end text-gray-700 font-semibold">{p.investorCount || 0}</td>
                              <td className="px-4 py-3 text-end text-emerald-700 font-bold text-sm">{fmtSAR(p.revenue)} SAR</td>
                              <td className="px-4 py-3 text-end">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary">
                                  {pctOfTotal}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-end text-emerald-700 font-bold text-sm">{fmtSAR(p.netContribution)} SAR</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 border-t border-gray-200">
                          <td className="px-4 py-3 font-bold text-gray-900">{lang === 'ar' ? 'الإجمالي' : 'Total'}</td>
                          <td className="px-4 py-3 text-end font-bold text-gray-900">
                            {propList.reduce((a, b) => a + (b.orders || 0), 0)}
                          </td>
                          <td className="px-4 py-3 text-end font-bold text-gray-900">
                            {propList.reduce((a, b) => a + (b.investorCount || 0), 0)}
                          </td>
                          <td className="px-4 py-3 text-end font-bold text-emerald-700">
                            {fmtSAR(propList.reduce((a, b) => a + (b.revenue || 0), 0))} SAR
                          </td>
                          <td className="px-4 py-3 text-end font-bold text-brand-primary">100%</td>
                          <td className="px-4 py-3 text-end font-bold text-emerald-700">
                            {fmtSAR(propList.reduce((a, b) => a + (b.netContribution || 0), 0))} SAR
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </Section>

            {/* ─ SECTION 6: Cash Flow ─ */}
            <Section
              icon={Banknote}
              title={lang === 'ar' ? 'ملخص التدفقات النقدية' : 'Cash Flow Summary'}
              subtitle={lang === 'ar' ? 'التدفقات التشغيلية للمنصة فقط' : 'Platform operational cash flows only'}
              open={showCashFlow}
              onToggle={() => setShowCashFlow((v) => !v)}
            >
              <div className="p-6 space-y-4">
                {/* Cash flow notice */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-700 text-xs">
                    {lang === 'ar'
                      ? 'إيداعات المستثمرين وتسويات الملاك مستبعدة — التدفقات التشغيلية للمنصة فقط.'
                      : 'Investor deposits and owner settlements excluded — only platform operational cash.'}
                  </p>
                </div>

                <div className="max-w-sm mx-auto space-y-2">
                  {/* Opening balance */}
                  <div className="flex items-center justify-between px-5 py-4 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-sm font-semibold text-gray-600">
                      {lang === 'ar' ? 'الرصيد الافتتاحي' : 'Opening Balance'}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {fmtSAR(data.cashFlow?.openingBalance)} SAR
                    </span>
                  </div>

                  {/* Inflows */}
                  <div className="flex items-center justify-between px-5 py-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">+</span>
                      <span className="text-sm font-semibold text-emerald-700">
                        {lang === 'ar' ? 'التدفقات الداخلة' : 'Inflows (Platform Fee Revenue)'}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-emerald-700">
                      {fmtSAR(data.cashFlow?.inflows)} SAR
                    </span>
                  </div>

                  {/* Outflows */}
                  <div className="flex items-center justify-between px-5 py-4 bg-rose-50 rounded-xl border border-rose-100">
                    <div className="flex items-center gap-2">
                      <span className="text-rose-600 font-bold">−</span>
                      <span className="text-sm font-semibold text-rose-700">
                        {lang === 'ar' ? 'التدفقات الخارجة' : 'Outflows (Platform Expenses)'}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-rose-700">
                      {fmtSAR(data.cashFlow?.outflows)} SAR
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t-2 border-dashed border-gray-200 my-2" />

                  {/* Closing balance */}
                  <div className={`flex items-center justify-between px-5 py-4 rounded-xl border ${isProfit ? 'bg-emerald-600 border-emerald-700' : 'bg-red-600 border-red-700'}`}>
                    <span className={`text-sm font-bold ${isProfit ? 'text-white' : 'text-white'}`}>
                      {lang === 'ar' ? '= الرصيد الختامي' : '= Closing Balance'}
                    </span>
                    <span className={`text-lg font-bold ${isProfit ? 'text-white' : 'text-white'}`}>
                      {fmtSAR(data.cashFlow?.closingBalance)} SAR
                    </span>
                  </div>
                </div>
              </div>
            </Section>

            {/* ─ SECTION 7: Reconciliation ─ */}
            <Section
              icon={ShieldCheck}
              title={lang === 'ar' ? 'مطابقة التقرير' : 'Report Reconciliation'}
              subtitle={lang === 'ar' ? 'التحقق من توازن الأرقام' : 'Verifying that the numbers balance'}
              open={showRecon}
              onToggle={() => setShowRecon((v) => !v)}
              badge={
                data.reconciliation?.fullyBalanced
                  ? (lang === 'ar' ? 'متوازن' : 'Balanced')
                  : (lang === 'ar' ? 'يحتاج مراجعة' : 'Review Needed')
              }
            >
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Revenue reconciliation */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      {lang === 'ar' ? 'مطابقة الإيرادات' : 'Revenue Reconciliation'}
                    </h3>
                    <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                      {(data.revenue?.breakdown || []).map((r, i) => (
                        <div
                          key={r.type}
                          className={`flex items-center justify-between px-4 py-3 ${i < (data.revenue.breakdown.length - 1) ? 'border-b border-gray-100' : ''}`}
                        >
                          <span className="text-xs text-gray-600">{REV_CFG[r.type]?.[lang] || r.type}</span>
                          <span className="text-xs font-semibold text-gray-900">{fmtSAR(r.amount)} SAR</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border-t border-emerald-100">
                        <span className="text-sm font-bold text-emerald-700">{lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
                        <span className="text-sm font-bold text-emerald-700">
                          {fmtSAR(data.reconciliation?.revenueSourcesTotal)} SAR
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 bg-emerald-100 border-t border-emerald-200">
                        <span className="text-xs text-emerald-700 font-semibold">{lang === 'ar' ? 'الإيراد الكلي (KPI)' : 'Revenue KPI'}</span>
                        <span className="text-xs font-bold text-emerald-800">
                          {fmtSAR(data.reconciliation?.revenueKpi)} SAR
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50">
                        <span className="text-xs text-gray-500">{lang === 'ar' ? 'الحالة' : 'Status'}</span>
                        {data.reconciliation?.revenueBalanced ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <CheckCircle2 size={12} /> {lang === 'ar' ? 'متوازن' : 'Balanced'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                            <AlertCircle size={12} /> {lang === 'ar' ? 'فرق موجود' : 'Discrepancy'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expense reconciliation */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      {lang === 'ar' ? 'مطابقة المصاريف' : 'Expense Reconciliation'}
                    </h3>
                    <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                      {(data.expenses?.breakdown || []).map((e, i) => (
                        <div
                          key={e.category}
                          className={`flex items-center justify-between px-4 py-3 ${i < (data.expenses.breakdown.length - 1) ? 'border-b border-gray-100' : ''}`}
                        >
                          <span className="text-xs text-gray-600">{EXP_CFG[e.category]?.[lang] || e.category}</span>
                          <span className="text-xs font-semibold text-gray-900">{fmtSAR(e.amount)} SAR</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-4 py-3 bg-rose-50 border-t border-rose-100">
                        <span className="text-sm font-bold text-rose-700">{lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
                        <span className="text-sm font-bold text-rose-700">
                          {fmtSAR(data.reconciliation?.expenseSourcesTotal)} SAR
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 bg-rose-100 border-t border-rose-200">
                        <span className="text-xs text-rose-700 font-semibold">{lang === 'ar' ? 'المصروف الكلي (KPI)' : 'Expense KPI'}</span>
                        <span className="text-xs font-bold text-rose-800">
                          {fmtSAR(data.reconciliation?.expenseKpi)} SAR
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2.5 bg-rose-50">
                        <span className="text-xs text-gray-500">{lang === 'ar' ? 'الحالة' : 'Status'}</span>
                        {data.reconciliation?.expenseBalanced ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <CheckCircle2 size={12} /> {lang === 'ar' ? 'متوازن' : 'Balanced'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                            <AlertCircle size={12} /> {lang === 'ar' ? 'فرق موجود' : 'Discrepancy'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net profit line */}
                <div className={`rounded-2xl border-2 p-5 flex items-center justify-between ${isProfit ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}>
                  <div>
                    <p className={`text-sm font-bold ${isProfit ? 'text-emerald-700' : 'text-red-700'}`}>
                      {lang === 'ar' ? 'صافي الربح = الإيرادات − المصاريف' : 'Net Profit = Revenue − Expenses'}
                    </p>
                    <p className={`text-xs mt-0.5 ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmtSAR(data.reconciliation?.revenueKpi)} − {fmtSAR(data.reconciliation?.expenseKpi)} SAR
                    </p>
                  </div>
                  <div className={`text-2xl font-bold ${isProfit ? 'text-emerald-700' : 'text-red-700'}`}>
                    {fmtSAR(data.reconciliation?.netProfit)} SAR
                  </div>
                </div>

                {/* Audit badge */}
                <div className={`flex items-center justify-center gap-3 py-4 rounded-2xl border ${data.reconciliation?.fullyBalanced ? 'bg-emerald-600 border-emerald-700' : 'bg-red-600 border-red-700'}`}>
                  {data.reconciliation?.fullyBalanced ? (
                    <>
                      <CheckCircle2 size={20} className="text-white" />
                      <span className="text-white font-bold text-base">
                        {lang === 'ar' ? 'التقرير متوازن بالكامل' : 'Report Fully Balanced'}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={20} className="text-white" />
                      <span className="text-white font-bold text-base">
                        {lang === 'ar' ? 'يحتاج مراجعة — توجد فروقات' : 'Review Needed — Discrepancies Detected'}
                      </span>
                    </>
                  )}
                </div>

                {/* Generated at */}
                <p className="text-center text-xs text-gray-400">
                  {lang === 'ar' ? 'تاريخ إنشاء التقرير:' : 'Report generated:'}{' '}
                  {fmtDate(data.generatedAt, lang)}
                  {data.feeRate !== undefined && (
                    <> &nbsp;·&nbsp; {lang === 'ar' ? `معدل رسوم المنصة: ${data.feeRate}%` : `Platform fee rate: ${data.feeRate}%`}</>
                  )}
                </p>
              </div>
            </Section>
          </>
        )}

        {/* ── Empty state (no data and no error and not loading) ── */}
        {!loading && !error && !data && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <PieChart size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-semibold">{lang === 'ar' ? 'لا توجد بيانات' : 'No data available'}</p>
            <p className="text-gray-400 text-sm mt-1">{lang === 'ar' ? 'حدد الفترة الزمنية وانقر تطبيق' : 'Select a date range and click Apply'}</p>
          </div>
        )}
      </div>

      {/* ── Add Revenue Modal ── */}
      {showAddRevenue && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">
                {lang === 'ar' ? 'إضافة إيراد يدوي' : 'Add Revenue Entry'}
              </h3>
              <button onClick={() => setShowAddRevenue(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelCls}>{lang === 'ar' ? 'نوع الإيراد' : 'Revenue Type'}</label>
                <select
                  value={addRevenueForm.type}
                  onChange={(e) => setAddRevenueForm((f) => ({ ...f, type: e.target.value }))}
                  className={inputCls}
                >
                  {Object.entries(REV_CFG).map(([k, v]) => (
                    <option key={k} value={k}>{v[lang]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{lang === 'ar' ? 'الوصف' : 'Description'}</label>
                <input
                  type="text"
                  value={addRevenueForm.description}
                  onChange={(e) => setAddRevenueForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={lang === 'ar' ? 'وصف الإيراد' : 'Revenue description'}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{lang === 'ar' ? 'المبلغ (SAR)' : 'Amount (SAR)'}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addRevenueForm.amount}
                  onChange={(e) => setAddRevenueForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{lang === 'ar' ? 'التاريخ' : 'Date'}</label>
                <input
                  type="date"
                  value={addRevenueForm.date}
                  onChange={(e) => setAddRevenueForm((f) => ({ ...f, date: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{lang === 'ar' ? 'ملاحظات (اختياري)' : 'Notes (optional)'}</label>
                <textarea
                  value={addRevenueForm.notes}
                  onChange={(e) => setAddRevenueForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder={lang === 'ar' ? 'ملاحظات إضافية…' : 'Additional notes…'}
                  rows={3}
                  className={inputCls + ' resize-none'}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={submitRevenue}
                  disabled={submitting || !addRevenueForm.description || !addRevenueForm.amount}
                  className="flex-1 bg-brand-primary text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 hover:bg-brand-primary/90 transition flex items-center justify-center"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    lang === 'ar' ? 'حفظ' : 'Save'
                  )}
                </button>
                <button
                  onClick={() => setShowAddRevenue(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 font-semibold text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Expense Modal ── */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-gray-900">
                {lang === 'ar' ? 'إضافة مصروف' : 'Add Expense Entry'}
              </h3>
              <button onClick={() => setShowAddExpense(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelCls}>{lang === 'ar' ? 'فئة المصروف' : 'Expense Category'}</label>
                <select
                  value={addExpenseForm.category}
                  onChange={(e) => setAddExpenseForm((f) => ({ ...f, category: e.target.value }))}
                  className={inputCls}
                >
                  {Object.entries(EXP_CFG).map(([k, v]) => (
                    <option key={k} value={k}>{v[lang]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{lang === 'ar' ? 'الوصف' : 'Description'}</label>
                <input
                  type="text"
                  value={addExpenseForm.description}
                  onChange={(e) => setAddExpenseForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={lang === 'ar' ? 'وصف المصروف' : 'Expense description'}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{lang === 'ar' ? 'المبلغ (SAR)' : 'Amount (SAR)'}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addExpenseForm.amount}
                  onChange={(e) => setAddExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{lang === 'ar' ? 'المورد (اختياري)' : 'Vendor (optional)'}</label>
                <input
                  type="text"
                  value={addExpenseForm.vendor}
                  onChange={(e) => setAddExpenseForm((f) => ({ ...f, vendor: e.target.value }))}
                  placeholder={lang === 'ar' ? 'اسم المورد أو الجهة' : 'Vendor or supplier name'}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{lang === 'ar' ? 'التاريخ' : 'Date'}</label>
                <input
                  type="date"
                  value={addExpenseForm.date}
                  onChange={(e) => setAddExpenseForm((f) => ({ ...f, date: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{lang === 'ar' ? 'رقم الفاتورة (اختياري)' : 'Invoice Ref (optional)'}</label>
                <input
                  type="text"
                  value={addExpenseForm.invoiceRef}
                  onChange={(e) => setAddExpenseForm((f) => ({ ...f, invoiceRef: e.target.value }))}
                  placeholder={lang === 'ar' ? 'رقم الفاتورة' : 'e.g. INV-2026-001'}
                  className={inputCls + ' font-mono'}
                />
              </div>
              <div>
                <label className={labelCls}>{lang === 'ar' ? 'ملاحظات (اختياري)' : 'Notes (optional)'}</label>
                <textarea
                  value={addExpenseForm.notes}
                  onChange={(e) => setAddExpenseForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder={lang === 'ar' ? 'ملاحظات إضافية…' : 'Additional notes…'}
                  rows={3}
                  className={inputCls + ' resize-none'}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={submitExpense}
                  disabled={submitting || !addExpenseForm.description || !addExpenseForm.amount}
                  className="flex-1 bg-rose-600 text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 hover:bg-rose-700 transition flex items-center justify-center"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    lang === 'ar' ? 'حفظ' : 'Save'
                  )}
                </button>
                <button
                  onClick={() => setShowAddExpense(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 font-semibold text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
