import React, { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { authHeader, fetchJson } from '../../lib/api'
import { useTranslation } from 'react-i18next'

const TYPE_CONFIG = {
  DEPOSIT:        { sign: +1, color: 'text-green-600',  bg: 'bg-green-50'  },
  DISTRIBUTION:   { sign: +1, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  WITHDRAWAL:     { sign: -1, color: 'text-red-600',    bg: 'bg-red-50'    },
  TOKEN_MINT:     { sign: -1, color: 'text-orange-600', bg: 'bg-orange-50' },
  TOKEN_TRANSFER: { sign: -1, color: 'text-blue-600',   bg: 'bg-blue-50'   },
}

function AmountCell({ type, amount }) {
  const cfg = TYPE_CONFIG[type] || { sign: 1, color: 'text-gray-700', bg: 'bg-gray-50' }
  const isPos = (cfg.sign > 0 && amount >= 0) || (amount > 0 && cfg.sign > 0)
  const display = Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${cfg.color}`}>
      {isPos ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
      {isPos ? '+' : '-'}{display}
    </span>
  )
}

export default function WalletHistoryModal({ userId, investorName, onClose }) {
  const { t, i18n } = useTranslation('pages')
  const isRtl = i18n.dir() === 'rtl'
  const [txs, setTxs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    setError('')
    fetchJson(`/api/admin/users/${userId}/wallet-history`, { headers: authHeader() })
      .then(data => setTxs(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Wallet history load error:', err)
        setError(t('admin.walletHistory.loadError'))
      })
      .finally(() => setLoading(false))
  }, [userId, t])

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString(isRtl ? 'ar-SA' : 'en-GB', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—'

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
              <Wallet size={18} className="text-brand-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{t('admin.walletHistory.title')}</h3>
              {investorName && (
                <p className="text-xs text-gray-500 mt-0.5">{investorName}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="animate-spin text-brand-accent" size={24} />
              <span className="text-gray-500 text-sm">{t('admin.walletHistory.loading')}</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle className="text-red-400" size={28} />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          ) : txs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Wallet size={32} className="text-gray-300" />
              <p className="text-gray-500 text-sm">{t('admin.walletHistory.empty')}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    t('admin.walletHistory.colDate'),
                    t('admin.walletHistory.colType'),
                    t('admin.walletHistory.colAmount'),
                    t('admin.walletHistory.colDesc'),
                    t('admin.walletHistory.colRef'),
                  ].map(h => (
                    <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txs.map(tx => {
                  const cfg = TYPE_CONFIG[tx.type] || { bg: 'bg-gray-50', color: 'text-gray-700' }
                  return (
                    <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs text-gray-600">{fmtDate(tx.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                          {tx.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <AmountCell type={tx.type} amount={tx.amount} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-600 max-w-[160px] truncate" title={tx.description}>
                          {tx.description || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-mono text-gray-400 truncate max-w-[100px]" title={tx.ref}>
                          {tx.ref || '—'}
                        </p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
