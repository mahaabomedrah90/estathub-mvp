import React, { useEffect, useState } from 'react'
import { authHeader, fetchJson, getToken } from '../../lib/api'
import { 
  Wallet, TrendingUp, Building2, ArrowUpCircle, ArrowDownCircle, 
  Loader2, AlertCircle, DollarSign, PieChart, History 
} from 'lucide-react'
import { useTranslation } from 'react-i18next'


export default function Portfolio() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wallet, setWallet] = useState(null)
  const [amount, setAmount] = useState(100)
  const [actionLoading, setActionLoading] = useState(false)
  const { t } = useTranslation('pages')
  const { t: tCommon } = useTranslation('common')

  async function load() {
    try {
      setError('')
      setLoading(true)
      const data = await fetchJson('/api/wallet', { headers: { ...authHeader() } })
      setWallet(data)
    } catch (e) {
      console.warn('Portfolio wallet API failed, using fallback:', e)
      setWallet({ cashBalance: 0, investedValue: 0, holdings: [], transactions: [] }) // Fallback
      setError(t('investor.wallet.usingDemoData'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (getToken()) load()
  }, [])

  if (!getToken()) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Wallet className="mx-auto text-gray-400" size={64} />
<div className="text-gray-600">{t('investor.wallet.loginRequired')}</div>        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-emerald-600 mx-auto" size={40} />
          <div className="text-gray-600">{t('investor.wallet.loading')}</div>
        </div>
      </div>
    )
  }

  if (error && !wallet) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
        <div className="flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      </div>
    )
  }

 const safeWallet = wallet || { cashBalance: 0, investedValue: 0, holdings: [], transactions: [] }
 const totalValue = safeWallet.cashBalance + safeWallet.investedValue

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">{t('investor.wallet.title')}</h1>
        <p className="text-gray-600">{t('investor.wallet.subtitle')}</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Balance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign size={24} />
              <span className="text-emerald-100">{t('investor.wallet.totalValueLabel')}</span>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{totalValue.toLocaleString()} {tCommon('currency.sar')}</div>
          <div className="text-emerald-100 text-sm">{t('investor.wallet.totalValueDesc')}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-4">
            <Wallet size={20} />
            <span>{t('investor.wallet.availableCashLabel')}</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{safeWallet.cashBalance.toLocaleString()} {tCommon('currency.sar')}</div>
          <div className="text-gray-500 text-sm">{t('investor.wallet.availableCashDesc')}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-4">
            <PieChart size={20} />
            <span>{t('investor.wallet.investedValueLabel')}</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{safeWallet.investedValue.toLocaleString()} {tCommon('currency.sar')}</div>
          <div className="text-gray-500 text-sm">{t('investor.wallet.investedValueDesc', { count: safeWallet.holdings?.length || 0 })}</div>
        </div>
      </div>

      {/* Wallet ID Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="text-sm text-gray-500 mb-1">{t('investor.wallet.walletIdLabel')}</div>
       <div className="font-mono text-sm text-gray-900 break-all">{safeWallet.walletId || 'DEMO-WALLET-ID'}</div>
      </div>

      {/* Test Balance Button (Development Only) */}
      {safeWallet.cashBalance === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-1">{t('investor.wallet.noBalanceTitle')}</h3>
              <p className="text-sm text-yellow-700 mb-3">
                {t('investor.wallet.noBalanceBody')}
              </p>
              <button
                disabled={actionLoading}
                onClick={async () => {
                  try {
                    setActionLoading(true)
                    setError('')
                    await fetchJson('/api/wallet/init-test-balance', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...authHeader() }
                    })
                    await load()
                  } catch (e) {
                    setError(t('investor.wallet.testBalanceFailed'))
                  } finally {
                    setActionLoading(false)
                  }
                }}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
                {t('investor.wallet.getTestBalance')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit/Withdraw Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('investor.wallet.manageFundsTitle')}</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="amount-input">{t('investor.wallet.amountLabel')}</label>
            <input 
              type="number" 
              min={1} 
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              id="amount-input"
              className="border border-gray-300 rounded-lg w-full px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
            />
          </div>
          <div className="flex gap-3 items-end">
            <button
              disabled={actionLoading}
              onClick={async () => {
                try {
                  setActionLoading(true)
                  setError('')
                  await fetchJson('/api/wallet/deposit', {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json', ...authHeader() },
                    body: JSON.stringify({ amount: Number(amount) })
                  })
                  await load()
                } catch { 
                  setError(t('investor.wallet.depositFailed')) 
                } finally {
                  setActionLoading(false)
                }
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-medium transition-colors"
            >
              <ArrowUpCircle size={18} />
              {t('investor.wallet.deposit')}
            </button>
            <button
              disabled={actionLoading}
              onClick={async () => {
                try {
                  setActionLoading(true)
                  setError('')
                  await fetchJson('/api/wallet/withdraw', {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json', ...authHeader() },
                    body: JSON.stringify({ amount: Number(amount) })
                  })
                  await load()
                } catch { 
                  setError(t('investor.wallet.withdrawFailed')) 
                } finally {
                  setActionLoading(false)
                }
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white font-medium transition-colors"
            >
              <ArrowDownCircle size={18} />
              {t('investor.wallet.withdraw')}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-3">{ t('investor.wallet.mockNote')}</p>
      </div>

      {/* Holdings Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={24} className="text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">{t('investor.wallet.myHoldingsTitle')}</h2>
        </div>
        {safeWallet.holdings?.length ? (
          <div className="space-y-3">
            {safeWallet.holdings.map(h => (
              <div key={h.propertyId} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-gray-900">{h.title}</div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{h.value.toLocaleString()} {t('investor.wallet.totalValueDesc')}</div>
                    <div className="text-xs text-gray-500">{t('investor.wallet.totalValueDesc')}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">{ t('investor.wallet.holdingTokensOwned')}: </span>
                    <span className="font-medium text-gray-900">{h.tokens}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('investor.wallet.holdingTokenPrice')}: </span>
                    <span className="font-medium text-gray-900">{h.tokenPrice.toLocaleString()} {tCommon('currency.sar')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="mx-auto mb 2 text-gray-300" size={48} />
              <div>{  t('investor.wallet.noHoldingsTitle')}</div>
          </div>
        )}
      </div>

      {/* Transactions Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <History size={24} className="text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">{t('investor.wallet.recentTransactionsTitle')}</h2>
        </div>
       {safeWallet.transactions?.length ? (
          <div className="space-y-2">
            {safeWallet.transactions.map(tx => {
              const typeUpper = (tx.type || '').toUpperCase()
              const isDeposit = typeUpper === 'DEPOSIT'
              const isWithdraw = typeUpper === 'WITHDRAW' || typeUpper === 'WITHDRAWAL'
              const isPurchase = typeUpper === 'PURCHASE'

              const rawType = (tx.type || '').toLowerCase()
              const normalizedKey =
                rawType === 'withdrawal' ? 'withdraw' :
                rawType === 'deposit' ? 'deposit' :
                rawType === 'purchase' ? 'purchase' : rawType
              
              return (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isDeposit ? 'bg-emerald-100' : isWithdraw ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      {isDeposit ? <ArrowUpCircle className="text-emerald-600" size={20} /> :
                       isWithdraw ? <ArrowDownCircle className="text-red-600" size={20} /> :
                       <Building2 className="text-blue-600" size={20} />}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 capitalize">{t(`investor.wallet.transactionType.${normalizedKey}`)}</div>
                      <div className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className={`font-semibold ${
                    isDeposit ? 'text-emerald-600' : isWithdraw ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {isDeposit ? '+' : '-'}{tx.amount.toLocaleString()} {tCommon('currency.sar')}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <History className="mx-auto mb-2 text-gray-300" size={48} />
            <div>{t('investor.wallet.noTransactions')}</div>
          </div>
        )}
      </div>
    </div>
  )
}
