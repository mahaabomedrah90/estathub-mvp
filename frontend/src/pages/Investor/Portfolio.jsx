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
      setWallet({ cashBalance: 0, investedValue: 0, holdings: [], transactions: [] })
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
          <Wallet className="mx-auto text-text-muted" size={64} />
          <div className="text-text-muted">{t('investor.wallet.loginRequired')}</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-brand-accent mx-auto" size={40} />
          <div className="text-text-muted">{t('investor.wallet.loading')}</div>
        </div>
      </div>
    )
  }

  if (error && !wallet) {
    return (
      <div className="bg-[#ED9072]/10 border border-[#ED9072]/30 rounded-lg p-4 text-[#ED9072]" role="alert">
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
    <div className="max-w-7xl mx-auto px-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-[#1E1958]">{t('investor.wallet.title')}</h1>
        <p className="text-text-muted">{t('investor.wallet.subtitle')}</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-[#ED9072]/10 border border-[#ED9072]/30 rounded-lg p-4 text-[#ED9072]" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Balance Overview Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#1E1958] to-[#2a2458] rounded-lg p-6 text-white shadow-sm">
          <div className="flex items-center justify-between mb-4 space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign size={24} />
              <span className="text-white/70">{t('investor.wallet.totalValueLabel')}</span>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{totalValue.toLocaleString()} {tCommon('currency.sar')}</div>
          <div className="text-white/60 text-sm">{t('investor.wallet.totalValueDesc')}</div>
        </div>

        <div className="bg-[#CDB9A1]/20 border border-[#CDB9A1]/40 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[#1E1958] mb-4 space-y-4">
            <Wallet size={20} />
            <span>{t('investor.wallet.availableCashLabel')}</span>
          </div>
          <div className="text-3xl font-bold text-[#1E1958] mb-1">{safeWallet.cashBalance.toLocaleString()} {tCommon('currency.sar')}</div>
          <div className="text-gray-600 text-sm">{t('investor.wallet.availableCashDesc')}</div>
        </div>

        <div className="bg-[#41EAD4]/10 border border-[#41EAD4]/30 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[#41EAD4] mb-4 space-y-4">
            <PieChart size={20} />
            <span>{t('investor.wallet.investedValueLabel')}</span>
          </div>
          <div className="text-3xl font-bold text-[#41EAD4] mb-1">{safeWallet.investedValue.toLocaleString()} {tCommon('currency.sar')}</div>
          <div className="text-gray-600 text-sm">{t('investor.wallet.investedValueDesc', { count: safeWallet.holdings?.length || 0 })}</div>
        </div>
      </div>

      {/* Wallet ID Card */}
      <div className="bg-[#CDB9A1]/30 border border-[#CDB9A1]/50 rounded-lg p-6 shadow-sm">
        <div className="text-sm text-gray-600 mb-1">{t('investor.wallet.walletIdLabel')}</div>
        <div className="font-mono text-sm text-[#1E1958] break-all">{safeWallet.walletId || 'DEMO-WALLET-ID'}</div>
      </div>

      {/* Empty Balance Notice */}
      {safeWallet.cashBalance === 0 && (
        <div className="bg-[#ED9072]/10 border border-[#ED9072]/30 rounded-lg p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-[#ED9072] flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-[#ED9072] mb-1">{t('investor.wallet.noBalanceTitle')}</h3>
              <p className="text-sm text-gray-600 mb-3">
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
                className="px-4 py-2 bg-[#41EAD4] hover:bg-[#41EAD4]/90 disabled:bg-surface-muted text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
                {t('investor.wallet.getTestBalance')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit/Withdraw Section */}
      <div className="bg-[#CDB9A1]/20 border border-[#CDB9A1]/40 rounded-lg shadow-card p-6">
        <h2 className="text-xl font-semibold text-[#1E1958] mb-4">{t('investor.wallet.manageFundsTitle')}</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-text-body mb-2" htmlFor="amount-input">{t('investor.wallet.amountLabel')}</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              id="amount-input"
              className="border border-border-soft rounded-xl w-full px-4 py-2.5 bg-surface-base focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors"
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
            >
              <ArrowDownCircle size={18} />
              {t('investor.wallet.withdraw')}
            </button>
          </div>
        </div>
        <p className="text-sm text-text-muted mt-3">{t('investor.wallet.mockNote')}</p>
      </div>

      {/* Holdings Section */}
      <div className="bg-surface-card border border-border-soft rounded-lg shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={24} className="text-text-muted" />
          <h2 className="text-xl font-semibold text-text-strong">{t('investor.wallet.myHoldingsTitle')}</h2>
        </div>
        {safeWallet.holdings?.length ? (
          <div className="space-y-3">
            {safeWallet.holdings.map(h => (
              <div key={h.propertyId} className="bg-surface-muted rounded-lg p-4 hover:bg-surface-base transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-text-strong">{h.title}</div>
                  <div className="text-right">
                    <div className="font-bold text-text-strong">{h.value.toLocaleString()} {t('investor.wallet.totalValueDesc')}</div>
                    <div className="text-xs text-text-muted">{t('investor.wallet.totalValueDesc')}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-text-muted">{t('investor.wallet.holdingTokensOwned')}: </span>
                    <span className="font-medium text-text-strong">{h.tokens}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">{t('investor.wallet.holdingTokenPrice')}: </span>
                    <span className="font-medium text-text-strong">{h.tokenPrice.toLocaleString()} {tCommon('currency.sar')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-text-muted">
            <Building2 className="mx-auto mb-2 text-border-soft" size={48} />
            <div>{t('investor.wallet.noHoldingsTitle')}</div>
          </div>
        )}
      </div>

      {/* Transactions Section */}
      <div className="bg-surface-card border border-border-soft rounded-lg shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <History size={24} className="text-text-muted" />
          <h2 className="text-xl font-semibold text-text-strong">{t('investor.wallet.recentTransactionsTitle')}</h2>
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
                <div key={tx.id} className="flex items-center justify-between p-3 bg-surface-muted rounded-lg hover:bg-surface-base transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isDeposit ? 'bg-brand-accent-soft' : isWithdraw ? 'bg-red-100' : 'bg-brand-primary/5'
                    }`}>
                      {isDeposit ? <ArrowUpCircle className="text-brand-accent" size={20} /> :
                       isWithdraw ? <ArrowDownCircle className="text-red-600" size={20} /> :
                       <Building2 className="text-brand-primary" size={20} />}
                    </div>
                    <div>
                      <div className="font-medium text-text-strong capitalize">{t(`investor.wallet.transactionType.${normalizedKey}`)}</div>
                      <div className="text-xs text-text-muted">{new Date(tx.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className={`font-semibold ${
                    isDeposit ? 'text-brand-accent' : isWithdraw ? 'text-red-600' : 'text-brand-primary'
                  }`}>
                    {isDeposit ? '+' : '-'}{tx.amount.toLocaleString()} {tCommon('currency.sar')}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-text-muted">
            <History className="mx-auto mb-2 text-border-soft" size={48} />
            <div>{t('investor.wallet.noTransactions')}</div>
          </div>
        )}
      </div>
    </div>
  )
}
