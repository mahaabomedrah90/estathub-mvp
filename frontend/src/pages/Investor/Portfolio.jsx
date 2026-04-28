import React, { useEffect, useState } from 'react'
import { authHeader, fetchJson, getToken } from '../../lib/api'
import {
  Wallet, Building2, ArrowUpCircle, ArrowDownCircle,
  Loader2, AlertCircle, DollarSign, PieChart, History,
  X, Clock, CheckCircle
} from 'lucide-react'
import { useTranslation } from 'react-i18next'


export default function Portfolio() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wallet, setWallet] = useState(null)
  const [amount, setAmount] = useState(100)
  const [actionLoading, setActionLoading] = useState(false)
  const { t, i18n } = useTranslation('pages')
  const { t: tCommon } = useTranslation('common')
  const isRtl = i18n.language === 'ar'

  // Deposit request modal state
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositAmount, setDepositAmount] = useState(500)
  const [bankRef, setBankRef] = useState('')
  const [depositSubmitting, setDepositSubmitting] = useState(false)
  const [depositSuccess, setDepositSuccess] = useState(false)
  const [depositError, setDepositError] = useState('')

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

  async function handleDepositRequest() {
    if (!Number.isFinite(Number(depositAmount)) || Number(depositAmount) < 100) {
      setDepositError(isRtl ? 'الحد الأدنى للإيداع 100 ريال.' : 'Minimum deposit is 100 SAR.')
      return
    }
    if (Number(depositAmount) > 100000) {
      setDepositError(isRtl ? 'الحد الأقصى للإيداع 100,000 ريال.' : 'Maximum deposit is 100,000 SAR.')
      return
    }
    setDepositSubmitting(true)
    setDepositError('')
    try {
      await fetchJson('/api/wallet/deposit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ amount: Number(depositAmount), bankReference: bankRef || undefined }),
      })
      setDepositSuccess(true)
      await load()
    } catch (e) {
      setDepositError(isRtl
        ? 'فشل إرسال الطلب. يرجى المحاولة مرة أخرى.'
        : 'Failed to submit request. Please try again.')
    } finally {
      setDepositSubmitting(false)
    }
  }

  function openDepositModal() {
    setDepositAmount(500)
    setBankRef('')
    setDepositError('')
    setDepositSuccess(false)
    setShowDepositModal(true)
  }

  function closeDepositModal() {
    setShowDepositModal(false)
    setDepositSuccess(false)
    setDepositError('')
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

      {/* Deposit Request Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative" dir={isRtl ? 'rtl' : 'ltr'}>
            <button onClick={closeDepositModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>

            {depositSuccess ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle className="mx-auto text-brand-accent" size={56} />
                <h3 className="text-xl font-bold text-[#1E1958]">
                  {isRtl ? 'تم إرسال الطلب بنجاح' : 'Request Submitted'}
                </h3>
                <p className="text-gray-600 text-sm">
                  {isRtl
                    ? 'تم استلام طلب الإيداع وهو قيد المراجعة. سيتم تحديث رصيدك بعد التحقق من التحويل.'
                    : 'Your deposit request has been received and is pending review. Your balance will be updated after verification.'}
                </p>
                <button onClick={closeDepositModal} className="mt-4 px-6 py-2.5 rounded-xl bg-brand-accent text-white font-medium hover:bg-brand-accent/90 transition-colors">
                  {isRtl ? 'حسناً' : 'OK'}
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-[#1E1958] mb-1">
                  {isRtl ? 'طلب إيداع عبر التحويل البنكي' : 'Bank Transfer Deposit Request'}
                </h3>
                <p className="text-sm text-gray-500 mb-5">
                  {isRtl
                    ? 'حوّل المبلغ إلى الحساب البنكي الموضح، ثم أرسل طلب الإيداع للمراجعة.'
                    : 'Transfer the amount to the bank account below, then submit your request for admin review.'}
                </p>

                {/* Bank details */}
                <div className="bg-[#1E1958]/5 border border-[#1E1958]/20 rounded-xl p-4 mb-5 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{isRtl ? 'البنك' : 'Bank'}</span>
                    <span className="font-semibold text-[#1E1958]">مصرف الإنماء</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{isRtl ? 'اسم الحساب' : 'Account Name'}</span>
                    <span className="font-semibold text-[#1E1958]">شركة الوسم العصري</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">IBAN</span>
                    <span className="font-mono font-semibold text-[#1E1958] text-xs">SA57 0500 0068 2073 1569 00</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isRtl ? 'المبلغ (ريال)' : 'Amount (SAR)'}
                    </label>
                    <input
                      type="number"
                      min={100}
                      max={100000}
                      value={depositAmount}
                      onChange={e => setDepositAmount(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                    />
                    <p className="text-xs text-gray-400 mt-1">{isRtl ? 'الحد الأدنى 100 ريال — الحد الأقصى 100,000 ريال' : 'Min 100 SAR — Max 100,000 SAR'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isRtl ? 'رقم المرجع البنكي (اختياري)' : 'Bank Transfer Reference (optional)'}
                    </label>
                    <input
                      type="text"
                      value={bankRef}
                      onChange={e => setBankRef(e.target.value)}
                      placeholder={isRtl ? 'رقم العملية / رمز التحويل' : 'Transaction ID / reference'}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                    />
                  </div>

                  {depositError && (
                    <div className="text-red-600 text-sm flex items-center gap-2">
                      <AlertCircle size={16} />
                      {depositError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleDepositRequest}
                      disabled={depositSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 text-white font-medium transition-colors"
                    >
                      {depositSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpCircle size={16} />}
                      {isRtl ? 'إرسال الطلب' : 'Submit Request'}
                    </button>
                    <button onClick={closeDepositModal} className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
                      {isRtl ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Manage Funds Section */}
      <div className="bg-[#CDB9A1]/20 border border-[#CDB9A1]/40 rounded-lg shadow-card p-6">
        <h2 className="text-xl font-semibold text-[#1E1958] mb-4">{t('investor.wallet.manageFundsTitle')}</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-text-body mb-2" htmlFor="withdraw-amount-input">
              {t('investor.wallet.amountLabel')}
            </label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              id="withdraw-amount-input"
              className="border border-border-soft rounded-xl w-full px-4 py-2.5 bg-surface-base focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors"
            />
          </div>
          <div className="flex gap-3 items-end">
            <button
              onClick={openDepositModal}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-accent hover:bg-brand-accent/90 text-white font-medium transition-colors"
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
        <p className="text-sm text-brand-accent font-medium mt-3">
          {isRtl
            ? 'الإيداع عبر التحويل البنكي فقط — يتم تحديث الرصيد بعد مراجعة الإدارة.'
            : 'Deposits via bank transfer only — balance updated after admin review.'}
        </p>
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

        {/* Pending deposit requests */}
        {safeWallet.pendingDeposits?.length > 0 && (
          <div className="mb-4 space-y-2">
            {safeWallet.pendingDeposits.map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="text-amber-600" size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-amber-800">
                      {isRtl ? 'طلب إيداع قيد المراجعة' : 'Deposit Request Pending Review'}
                    </div>
                    <div className="text-xs text-amber-600">{new Date(req.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="font-semibold text-amber-700">+{req.amount.toLocaleString()} {tCommon('currency.sar')}</div>
              </div>
            ))}
          </div>
        )}

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
