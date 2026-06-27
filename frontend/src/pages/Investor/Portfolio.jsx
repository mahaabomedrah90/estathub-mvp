import React, { useEffect, useState, useCallback } from 'react'
import { authHeader, fetchJson, getToken } from '../../lib/api'
import {
  Wallet, Building2, ArrowUpCircle, ArrowDownCircle,
  Loader2, AlertCircle, DollarSign, PieChart, History,
  X, Clock, CheckCircle2, Copy, Check, XCircle
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

// ─── DepositModal ─────────────────────────────────────────────────────────────

function DepositModal({ amount, onClose, onSuccess, isRtl }) {
  const [bankReference, setBankReference] = useState('')
  const [bankName, setBankName]           = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [apiError, setApiError]           = useState('')
  const [refError, setRefError]           = useState('')
  const [copied, setCopied]               = useState(false)

  const IBAN = 'SA57 0500 0068 2073 1569 00'

  function copyIban() {
    navigator.clipboard.writeText(IBAN.replace(/\s/g, '')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleSubmit() {
    setApiError('')
    setRefError('')
    if (!bankReference.trim()) {
      setRefError(isRtl ? 'رقم المرجع البنكي مطلوب.' : 'Bank reference is required.')
      return
    }
    setSubmitting(true)
    try {
      // Future: replace BANK_TRANSFER flow with payment gateway reference when gateway is enabled.
      await fetchJson('/api/wallet/deposit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          amount:        Number(amount),
          bankReference: bankReference.trim(),
          bankName:      bankName.trim() || undefined,
          receiptUrl:    null,
        }),
      })
      onSuccess()
    } catch {
      setApiError(isRtl ? 'فشل إرسال الطلب. يرجى المحاولة مرة أخرى.' : 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const isSubmitEnabled = Number(amount) >= 100 && bankReference.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl" dir={isRtl ? 'rtl' : 'ltr'}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-[#1E1958]">
              {isRtl ? 'طلب إيداع عبر التحويل البنكي' : 'Bank Transfer Deposit Request'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {isRtl
                ? 'حوّل المبلغ إلى حساب الشركة، ثم أدخل رقم المرجع البنكي لإرسال الطلب للمراجعة.'
                : 'Transfer to the company account, then enter your reference to submit for review.'}
            </p>
          </div>
          <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 flex-shrink-0 mt-0.5 ${isRtl ? 'mr-3' : 'ml-3'}`}>
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Company bank account */}
          <div className="bg-[#1E1958]/5 border border-[#1E1958]/15 rounded-xl p-4 space-y-2.5 text-sm">
            <p className="text-xs font-semibold text-[#1E1958]/60 uppercase tracking-wider">
              {isRtl ? 'حساب الشركة' : 'Company Account'}
            </p>
            <div className="flex justify-between"><span className="text-gray-500">{isRtl ? 'البنك' : 'Bank'}</span><span className="font-bold text-[#1E1958]">مصرف الإنماء</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{isRtl ? 'اسم الحساب' : 'Account Name'}</span><span className="font-bold text-[#1E1958]">شركة الوسم العصري</span></div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-500">IBAN</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-[#1E1958] text-xs tracking-widest select-all">{IBAN}</span>
                <button onClick={copyIban} className="p-1.5 rounded-lg hover:bg-[#1E1958]/10 transition-colors" title={isRtl ? 'نسخ' : 'Copy'}>
                  {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} className="text-[#1E1958]/50" />}
                </button>
              </div>
            </div>
          </div>

          {/* Amount — READ-ONLY */}
          <div className="flex items-center justify-between bg-brand-accent/10 border border-brand-accent/25 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-gray-700">{isRtl ? 'مبلغ الإيداع' : 'Deposit Amount'}</span>
            <span className="text-xl font-bold text-[#1E1958]">
              {Number(amount).toLocaleString(isRtl ? 'ar-SA' : 'en-US')} <span className="text-base font-semibold">{isRtl ? 'ريال' : 'SAR'}</span>
            </span>
          </div>

          {/* Bank reference — REQUIRED */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {isRtl ? 'رقم المرجع البنكي' : 'Bank Reference'}<span className="text-red-500 ms-1">*</span>
            </label>
            <input
              type="text"
              value={bankReference}
              onChange={e => { setBankReference(e.target.value); setRefError('') }}
              placeholder={isRtl ? 'مثال: 88487474' : 'e.g. 88487474'}
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent ${refError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
            />
            {refError && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={12} />{refError}</p>}
          </div>

          {/* Bank name — optional */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {isRtl ? 'البنك المحوّل منه (اختياري)' : 'Sending Bank (optional)'}
            </label>
            <input
              type="text"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder={isRtl ? 'مثال: بنك الراجحي' : 'e.g. Al Rajhi Bank'}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
            />
          </div>

          {apiError && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="flex-shrink-0" />{apiError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button onClick={handleSubmit} disabled={submitting || !isSubmitEnabled}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpCircle size={16} />}
              {isRtl ? 'إرسال طلب الإيداع' : 'Submit Deposit Request'}
            </button>
            <button onClick={onClose} disabled={submitting}
              className="sm:w-auto px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold transition-colors">
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function maskIban(iban) {
  const clean = iban.replace(/\s+/g, '')
  if (clean.length < 8) return '****'
  return `${clean.slice(0, 4)} **** **** **** **** ${clean.slice(-4)}`
}

function validateIban(raw) {
  const clean = raw.replace(/\s+/g, '').toUpperCase()
  if (!clean) return 'required'
  if (!clean.startsWith('SA') || clean.length !== 24) return 'invalid'
  return null
}

// ─── WithdrawalModal ──────────────────────────────────────────────────────────

function WithdrawalModal({ amount, cashBalance, savedWithdrawalAccount, onClose, onSuccess, isRtl }) {
  const hasSaved   = savedWithdrawalAccount?.hasIban === true
  const [confirmed,   setConfirmed]   = useState(false)
  const [iban,        setIban]        = useState('')
  const [bankName,    setBankName]    = useState('')
  const [ibanError,   setIbanError]   = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [apiError,    setApiError]    = useState('')

  const parsedAmount = Number(amount)
  const amountValid  = parsedAmount > 0 && parsedAmount <= cashBalance

  const canSubmit = amountValid && !submitting && (hasSaved ? confirmed : true)

  async function handleSubmit() {
    setApiError('')

    // Inline IBAN validation when user must enter IBAN
    if (!hasSaved) {
      const err = validateIban(iban)
      if (err === 'required') {
        setIbanError(isRtl ? 'رقم الآيبان مطلوب لإرسال طلب السحب' : 'IBAN is required for withdrawal requests')
        return
      }
      if (err === 'invalid') {
        setIbanError(isRtl ? 'رقم الآيبان غير صحيح — يجب أن يبدأ بـ SA ومكوّن من 24 حرفاً' : 'Invalid IBAN — must start with SA and be 24 characters')
        return
      }
    }

    setSubmitting(true)
    try {
      const payload = hasSaved
        ? { amount: parsedAmount, ibanConfirmed: true }
        : { amount: parsedAmount, iban: iban.replace(/\s+/g, '').toUpperCase(), bankName: bankName.trim() || undefined }

      await fetchJson('/api/wallet/withdrawal-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(payload),
      })
      onSuccess()
    } catch (e) {
      const errCode = e?.data?.error
      const errMsg  = e?.data?.message || ''
      if (errCode === 'iban_required') {
        setIbanError(isRtl ? 'رقم الآيبان مطلوب لإرسال طلب السحب' : 'IBAN is required')
      } else if (errCode === 'invalid_iban') {
        setIbanError(isRtl ? 'رقم الآيبان غير صحيح' : 'Invalid IBAN format')
      } else {
        setApiError(isRtl
          ? (e?.data?.messageAr || errMsg || 'فشل إرسال الطلب. يرجى المحاولة مرة أخرى.')
          : (errMsg || 'Failed to submit. Please try again.'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl" dir={isRtl ? 'rtl' : 'ltr'}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-[#1E1958]">
              {isRtl ? 'طلب سحب' : 'Withdrawal Request'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {isRtl
                ? 'لن يتم خصم المبلغ من محفظتك إلا بعد اعتماد الطلب من الإدارة.'
                : 'Your balance will only be deducted after admin approval.'}
            </p>
          </div>
          <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 flex-shrink-0 mt-0.5 ${isRtl ? 'mr-3' : 'ml-3'}`}>
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Amount + balance summary */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{isRtl ? 'مبلغ السحب' : 'Withdrawal Amount'}</span>
              <span className="text-lg font-bold text-red-700">
                {parsedAmount.toLocaleString(isRtl ? 'ar-SA' : 'en-US')} {isRtl ? 'ريال' : 'SAR'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{isRtl ? 'الرصيد المتاح' : 'Available Balance'}</span>
              <span className="font-semibold text-gray-700">
                {cashBalance.toLocaleString(isRtl ? 'ar-SA' : 'en-US')} {isRtl ? 'ريال' : 'SAR'}
              </span>
            </div>
            {parsedAmount > cashBalance && (
              <p className="text-xs text-red-600 font-semibold mt-1">
                {isRtl ? 'المبلغ يتجاوز الرصيد المتاح.' : 'Amount exceeds available balance.'}
              </p>
            )}
          </div>

          {/* IBAN section */}
          {hasSaved ? (
            /* ── Saved IBAN confirmation ── */
            <div className="space-y-3">
              <div className="bg-[#1E1958]/5 border border-[#1E1958]/15 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-xs font-semibold text-[#1E1958]/60 uppercase tracking-wider">
                  {isRtl ? 'حساب الاستلام' : 'Receiving Account'}
                </p>
                {savedWithdrawalAccount.bankName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{isRtl ? 'البنك' : 'Bank'}</span>
                    <span className="font-bold text-[#1E1958]">{savedWithdrawalAccount.bankName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-500">IBAN</span>
                  <span className="font-mono font-semibold text-[#1E1958] text-xs tracking-widest">
                    {savedWithdrawalAccount.ibanMasked}
                  </span>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-[#1E1958] flex-shrink-0"
                />
                <span className="text-sm text-gray-700 leading-snug">
                  {isRtl
                    ? 'أؤكد أن هذا الآيبان هو حسابي البنكي الصحيح لاستلام مبلغ السحب.'
                    : 'I confirm this IBAN is my correct bank account for receiving the withdrawal amount.'}
                </span>
              </label>
            </div>
          ) : (
            /* ── New IBAN entry ── */
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {isRtl ? 'رقم الآيبان' : 'IBAN'}<span className="text-red-500 ms-1">*</span>
                </label>
                <input
                  type="text"
                  value={iban}
                  onChange={e => { setIban(e.target.value); setIbanError('') }}
                  placeholder="SA000000000000000000000"
                  dir="ltr"
                  className={`w-full border rounded-xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent ${ibanError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                />
                {ibanError && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />{ibanError}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {isRtl ? 'اسم البنك (اختياري)' : 'Bank Name (optional)'}
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  placeholder={isRtl ? 'مثال: بنك الراجحي' : 'e.g. Al Rajhi Bank'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                />
              </div>
            </div>
          )}

          {apiError && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="flex-shrink-0" />{apiError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button onClick={handleSubmit} disabled={!canSubmit}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownCircle size={16} />}
              {isRtl ? 'إرسال طلب السحب' : 'Submit Withdrawal Request'}
            </button>
            <button onClick={onClose} disabled={submitting}
              className="sm:w-auto px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold transition-colors">
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SuccessModal ─────────────────────────────────────────────────────────────

function SuccessModal({ type, onClose, isRtl }) {
  const isDeposit = type === 'deposit'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
        <CheckCircle2 className={`mx-auto mb-4 ${isDeposit ? 'text-green-500' : 'text-orange-500'}`} size={56} />
        <h3 className="text-xl font-bold text-[#1E1958] mb-2">
          {isRtl ? 'تم إرسال الطلب' : 'Request Submitted'}
        </h3>
        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
          {isDeposit
            ? (isRtl
                ? 'تم إرسال طلب الإيداع بنجاح. سيتم تحديث رصيدك بعد مراجعة الإدارة.'
                : 'Deposit request submitted. Your balance will be updated after admin review.')
            : (isRtl
                ? 'تم إرسال طلب السحب بنجاح. لن يتم خصم المبلغ إلا بعد اعتماد الإدارة.'
                : 'Withdrawal request submitted. Balance will only be deducted after admin approval.')}
        </p>
        <button onClick={onClose}
          className="w-full px-6 py-3 rounded-xl bg-brand-accent text-white font-semibold hover:bg-brand-accent/90 transition-colors">
          {isRtl ? 'حسناً' : 'OK'}
        </button>
      </div>
    </div>
  )
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, isRtl }) {
  if (status === 'APPROVED') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full whitespace-nowrap">
      <CheckCircle2 size={10} />{isRtl ? 'مكتمل' : 'Completed'}
    </span>
  )
  if (status === 'PENDING') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full whitespace-nowrap">
      <Clock size={10} />{isRtl ? 'قيد المراجعة' : 'Pending'}
    </span>
  )
  if (status === 'REJECTED') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full whitespace-nowrap">
      <XCircle size={10} />{isRtl ? 'مرفوض' : 'Rejected'}
    </span>
  )
  return null
}

// ─── TimelineCard ─────────────────────────────────────────────────────────────

function TimelineCard({ item, isRtl }) {
  const loc = isRtl ? 'ar-SA' : 'en-US'
  const sar = isRtl ? 'ريال' : 'SAR'
  const fmtDate = d => d ? new Date(d).toLocaleDateString(loc, {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Riyadh',
  }) : '—'

  // ── Deposit ──────────────────────────────────────────────────────────────
  if (item.source === 'deposit') {
    const s  = item.status
    const ok = s === 'APPROVED', pend = s === 'PENDING', rej = s === 'REJECTED'
    const Icon    = pend ? Clock : ok ? CheckCircle2 : XCircle
    const iconBg  = pend ? 'bg-amber-100'  : ok ? 'bg-green-100' : 'bg-red-100'
    const iconCl  = pend ? 'text-amber-600' : ok ? 'text-green-600' : 'text-red-600'
    const cardBg  = pend ? 'bg-amber-50 border-amber-200' : ok ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-200'
    const amtCl   = pend ? 'text-amber-700' : ok ? 'text-green-600' : 'text-gray-400'
    const title   = pend ? (isRtl ? 'طلب إيداع قيد المراجعة' : 'Deposit Under Review')
                  : ok   ? (isRtl ? 'تم الإيداع بنجاح' : 'Deposit Completed')
                  :         (isRtl ? 'تعذر قبول طلب الإيداع' : 'Deposit Request Rejected')
    const subtitle = pend ? (isRtl ? 'سيتم تحديث رصيدك بعد التحقق من التحويل' : 'Balance updated after transfer verification')
                   : ok   ? (item.bankName || (isRtl ? 'تحويل بنكي' : 'Bank transfer'))
                   :         (isRtl ? 'لم يتم إضافة أي مبلغ لمحفظتك' : 'No amount was added to your wallet')
    const dateStr = fmtDate(ok && item.reviewedAt ? item.reviewedAt : item.date)

    return (
      <div className={`flex items-start gap-4 p-4 rounded-xl border ${cardBg}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}>
          <Icon size={20} className={iconCl} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900 leading-tight">{title}</div>
          <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
          <div className="text-xs text-gray-400 mt-0.5">{dateStr}</div>
          {rej && item.adminNote && (
            <div className="mt-2 text-xs text-red-700 bg-red-100 rounded-lg px-2.5 py-1.5 leading-relaxed">
              {isRtl ? `السبب: ${item.adminNote}` : `Reason: ${item.adminNote}`}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-0.5">
          <span className={`font-bold text-sm whitespace-nowrap ${amtCl} ${rej ? 'line-through opacity-60' : ''}`}>
            +{item.amount.toLocaleString(loc)} {sar}
          </span>
          <StatusBadge status={s} isRtl={isRtl} />
        </div>
      </div>
    )
  }

  // ── Withdrawal ────────────────────────────────────────────────────────────
  if (item.source === 'withdrawal') {
    const s  = item.status
    const ok = s === 'APPROVED', pend = s === 'PENDING', rej = s === 'REJECTED'
    const Icon    = pend ? Clock : ok ? CheckCircle2 : XCircle
    const iconBg  = pend ? 'bg-amber-100'  : ok ? 'bg-green-100' : 'bg-red-100'
    const iconCl  = pend ? 'text-amber-600' : ok ? 'text-green-600' : 'text-red-600'
    const cardBg  = pend ? 'bg-amber-50 border-amber-200' : ok ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-200'
    const amtCl   = pend ? 'text-amber-700' : ok ? 'text-red-600' : 'text-gray-400'
    const title   = pend ? (isRtl ? 'طلب سحب قيد المراجعة' : 'Withdrawal Under Review')
                  : ok   ? (isRtl ? 'تم تنفيذ السحب' : 'Withdrawal Completed')
                  :         (isRtl ? 'تعذر تنفيذ طلب السحب' : 'Withdrawal Request Rejected')
    const subtitle = pend ? (isRtl ? 'متوقع: ١–٢ أيام عمل' : 'Expected: 1–2 business days')
                   : ok   ? (item.bankName || (isRtl ? 'تحويل بنكي' : 'Bank transfer'))
                   :         (isRtl ? 'لم يتم خصم أي مبلغ من محفظتك' : 'No amount was deducted from your wallet')
    const dateStr = fmtDate(ok && item.reviewedAt ? item.reviewedAt : item.date)

    return (
      <div className={`flex items-start gap-4 p-4 rounded-xl border ${cardBg}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}>
          <Icon size={20} className={iconCl} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900 leading-tight">{title}</div>
          <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
          {ok && item.ibanMasked && (
            <div className="text-xs font-mono text-gray-400 mt-0.5 tracking-wider">{item.ibanMasked}</div>
          )}
          <div className="text-xs text-gray-400 mt-0.5">{dateStr}</div>
          {rej && item.adminNote && (
            <div className="mt-2 text-xs text-red-700 bg-red-100 rounded-lg px-2.5 py-1.5 leading-relaxed">
              {isRtl ? `السبب: ${item.adminNote}` : `Reason: ${item.adminNote}`}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-0.5">
          <span className={`font-bold text-sm whitespace-nowrap ${amtCl} ${rej ? 'line-through opacity-60' : ''}`}>
            −{item.amount.toLocaleString(loc)} {sar}
          </span>
          <StatusBadge status={s} isRtl={isRtl} />
        </div>
      </div>
    )
  }

  // ── Other transaction (TOKEN_MINT, DISTRIBUTION, etc.) ────────────────────
  const typeUpper      = (item.txType || '').toUpperCase()
  const isDistrib      = typeUpper === 'DISTRIBUTION'
  const isInvestment   = typeUpper === 'TOKEN_MINT' || typeUpper === 'TOKEN_TRANSFER'
  const Icon           = isDistrib ? DollarSign : isInvestment ? Building2 : ArrowUpCircle
  const iconBg         = isDistrib ? 'bg-[#41EAD4]/10' : isInvestment ? 'bg-[#1E1958]/5' : 'bg-gray-100'
  const iconCl         = isDistrib ? 'text-[#41EAD4]'  : isInvestment ? 'text-[#1E1958]'  : 'text-gray-500'
  const amtCl          = isDistrib ? 'text-green-600'   : isInvestment ? 'text-[#1E1958]'  : 'text-gray-700'
  const amtPrefix      = isDistrib ? '+' : '−'
  const txTitle        = isDistrib    ? (isRtl ? 'توزيع أرباح' : 'Profit Distribution')
                       : isInvestment ? (isRtl ? 'استثمار عقاري' : 'Property Investment')
                       : (item.txType || '')

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:bg-gray-50/60 transition-colors">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}>
        <Icon size={20} className={iconCl} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-gray-900 leading-tight">{txTitle}</div>
        {item.note && <div className="text-xs text-gray-500 mt-0.5">{item.note}</div>}
        <div className="text-xs text-gray-400 mt-0.5">{fmtDate(item.date)}</div>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-0.5">
        <span className={`font-bold text-sm whitespace-nowrap ${amtCl}`}>
          {amtPrefix}{item.amount.toLocaleString(loc)} {sar}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full whitespace-nowrap">
          <CheckCircle2 size={10} />{isRtl ? 'مكتمل' : 'Completed'}
        </span>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Portfolio() {
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')
  const [wallet, setWallet]                 = useState(null)
  const { t, i18n } = useTranslation('pages')
  const { t: tCommon } = useTranslation('common')
  const isRtl = i18n.language === 'ar'

  // ── Single source of truth for the amount field ──
  const [amount, setAmount] = useState('')

  // ── Modal state ──
  const [modal, setModal] = useState(null) // null | 'deposit' | 'withdrawal' | 'deposit-success' | 'withdrawal-success'

  const load = useCallback(async () => {
    try {
      setError('')
      setLoading(true)
      const data = await fetchJson('/api/wallet', { headers: { ...authHeader() } })
      setWallet(data)
    } catch {
      // Keep existing data if we have it (reload after action); null-out only on first load
      setWallet(prev => prev)
      setError(t('investor.wallet.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { if (getToken()) load() }, [load])

  const cashBalance  = wallet?.cashBalance ?? 0
  const parsedAmount = Number(amount)

  const canDeposit    = parsedAmount >= 100 && parsedAmount <= 100000
  const canWithdraw   = parsedAmount > 0 && parsedAmount <= cashBalance

  function handleDepositSuccess() {
    setModal('deposit-success')
    setAmount('')
    load()
  }

  function handleWithdrawalSuccess() {
    setModal('withdrawal-success')
    setAmount('')
    load()
  }

  // ── Guard screens ──
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
        <div className="flex items-center gap-2"><AlertCircle size={20} /><span>{error}</span></div>
      </div>
    )
  }

  const safeWallet   = wallet || { cashBalance: 0, investedValue: 0, holdings: [], transactions: [], withdrawalHistory: [], depositHistory: [] }
  const totalValue   = safeWallet.cashBalance + safeWallet.investedValue

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-8" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── Modals ── */}
      {modal === 'deposit' && (
        <DepositModal
          amount={amount}
          onClose={() => setModal(null)}
          onSuccess={handleDepositSuccess}
          isRtl={isRtl}
        />
      )}
      {modal === 'withdrawal' && (
        <WithdrawalModal
          amount={amount}
          cashBalance={safeWallet.cashBalance}
          savedWithdrawalAccount={wallet?.savedWithdrawalAccount}
          onClose={() => setModal(null)}
          onSuccess={handleWithdrawalSuccess}
          isRtl={isRtl}
        />
      )}
      {(modal === 'deposit-success' || modal === 'withdrawal-success') && (
        <SuccessModal
          type={modal === 'deposit-success' ? 'deposit' : 'withdrawal'}
          onClose={() => setModal(null)}
          isRtl={isRtl}
        />
      )}

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-[#1E1958]">{t('investor.wallet.title')}</h1>
        <p className="text-text-muted">{t('investor.wallet.subtitle')}</p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="bg-[#ED9072]/10 border border-[#ED9072]/30 rounded-lg p-4 text-[#ED9072]" role="alert">
          <div className="flex items-center gap-2"><AlertCircle size={20} /><span>{error}</span></div>
        </div>
      )}

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#1E1958] to-[#2a2458] rounded-lg p-6 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={24} />
            <span className="text-white/70">{t('investor.wallet.totalValueLabel')}</span>
          </div>
          <div className="text-3xl font-bold mb-1">{totalValue.toLocaleString()} {tCommon('currency.sar')}</div>
          <div className="text-white/60 text-sm">{t('investor.wallet.totalValueDesc')}</div>
        </div>

        <div className="bg-[#CDB9A1]/20 border border-[#CDB9A1]/40 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[#1E1958] mb-4">
            <Wallet size={20} />
            <span>{t('investor.wallet.availableCashLabel')}</span>
          </div>
          <div className="text-3xl font-bold text-[#1E1958] mb-1">{safeWallet.cashBalance.toLocaleString()} {tCommon('currency.sar')}</div>
          <div className="text-gray-600 text-sm">{t('investor.wallet.availableCashDesc')}</div>
        </div>

        <div className="bg-[#41EAD4]/10 border border-[#41EAD4]/30 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[#41EAD4] mb-4">
            <PieChart size={20} />
            <span>{t('investor.wallet.investedValueLabel')}</span>
          </div>
          <div className="text-3xl font-bold text-[#41EAD4] mb-1">{safeWallet.investedValue.toLocaleString()} {tCommon('currency.sar')}</div>
          <div className="text-gray-600 text-sm">{t('investor.wallet.investedValueDesc', { count: safeWallet.holdings?.length || 0 })}</div>
        </div>
      </div>

      {/* Wallet ID — only shown when a real wallet exists */}
      {safeWallet.walletId && (
        <div className="bg-[#CDB9A1]/30 border border-[#CDB9A1]/50 rounded-lg p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">{t('investor.wallet.walletIdLabel')}</div>
          <div className="font-mono text-sm text-[#1E1958] break-all">{safeWallet.walletId}</div>
        </div>
      )}

      {/* Empty balance notice — no demo CTA */}
      {safeWallet.cashBalance === 0 && (
        <div className="bg-[#ED9072]/10 border border-[#ED9072]/30 rounded-lg p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-[#ED9072] flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-[#ED9072] mb-1">{t('investor.wallet.noBalanceTitle')}</h3>
              <p className="text-sm text-gray-600">{t('investor.wallet.noBalanceBody')}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Funds — single amount input drives both deposit and withdrawal ── */}
      <div className="bg-[#CDB9A1]/20 border border-[#CDB9A1]/40 rounded-lg shadow-card p-6">
        <h2 className="text-xl font-semibold text-[#1E1958] mb-4">{t('investor.wallet.manageFundsTitle')}</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-text-body mb-2">{t('investor.wallet.amountLabel')}</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={isRtl ? 'أدخل المبلغ' : 'Enter amount'}
              className="border border-border-soft rounded-xl w-full px-4 py-2.5 bg-surface-base outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1">
              {isRtl
                ? `الإيداع: الحد الأدنى 100 ريال | السحب: حتى ${safeWallet.cashBalance.toLocaleString('ar-SA')} ريال`
                : `Deposit min: 100 SAR | Withdraw up to: ${safeWallet.cashBalance.toLocaleString()} SAR`}
            </p>
          </div>
          <div className="flex gap-3 items-end flex-wrap">
            <button
              onClick={() => setModal('deposit')}
              disabled={!canDeposit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
            >
              <ArrowUpCircle size={18} />
              {t('investor.wallet.deposit')}
            </button>
            <button
              onClick={() => setModal('withdrawal')}
              disabled={!canWithdraw}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
            >
              <ArrowDownCircle size={18} />
              {t('investor.wallet.withdraw')}
            </button>
          </div>
        </div>
        <p className="text-sm text-brand-accent font-medium mt-3">
          {isRtl
            ? 'الإيداع والسحب عبر التحويل البنكي — يتم تحديث الرصيد بعد مراجعة الإدارة.'
            : 'Deposits and withdrawals via bank transfer — balance updated after admin review.'}
        </p>
      </div>

      {/* Holdings */}
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
                    <div className="font-bold text-text-strong">{h.value.toLocaleString()} {tCommon('currency.sar')}</div>
                    <div className="text-xs text-text-muted">{t('investor.wallet.holdingTotalValue')}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-text-muted">{t('investor.wallet.holdingTokensOwned')}: </span><span className="font-medium text-text-strong">{h.tokens}</span></div>
                  <div><span className="text-text-muted">{t('investor.wallet.holdingTokenPrice')}: </span><span className="font-medium text-text-strong">{h.tokenPrice.toLocaleString()} {tCommon('currency.sar')}</span></div>
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

      {/* Wallet Activity — unified financial timeline */}
      <div className="bg-surface-card border border-border-soft rounded-lg shadow-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <History size={22} className="text-text-muted" />
          <div>
            <h2 className="text-xl font-semibold text-text-strong">
              {isRtl ? 'سجل المحفظة' : 'Wallet Activity'}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {isRtl ? 'جميع العمليات المالية — الأحدث أولاً' : 'All financial activity — newest first'}
            </p>
          </div>
        </div>

        {(() => {
          const items = []
          for (const w of safeWallet.withdrawalHistory || []) {
            items.push({ _key: `wr-${w.id}`, source: 'withdrawal', status: w.status, amount: w.amount,
              date: w.createdAt, reviewedAt: w.reviewedAt || null, bankName: w.bankName || null,
              ibanMasked: w.iban || null, adminNote: w.adminNote || null })
          }
          for (const d of safeWallet.depositHistory || []) {
            items.push({ _key: `dr-${d.id}`, source: 'deposit', status: d.status, amount: d.amount,
              date: d.createdAt, reviewedAt: d.reviewedAt || null, bankName: d.bankName || null,
              adminNote: d.adminNote || null })
          }
          for (const tx of safeWallet.transactions || []) {
            const t = (tx.type || '').toUpperCase()
            if (t === 'DEPOSIT' || t === 'WITHDRAWAL') continue
            items.push({ _key: `tx-${tx.id}`, source: 'transaction', txType: tx.type, amount: tx.amount,
              date: tx.createdAt, reviewedAt: null, note: tx.note || null, status: null, adminNote: null })
          }
          items.sort((a, b) => new Date(b.date) - new Date(a.date))

          if (!items.length) {
            return (
              <div className="text-center py-12 text-text-muted">
                <History className="mx-auto mb-3 text-border-soft" size={48} />
                <div className="font-medium">{isRtl ? 'لا توجد عمليات بعد' : 'No activity yet'}</div>
                <div className="text-sm mt-1">{isRtl ? 'ستظهر هنا جميع العمليات المالية' : 'Financial activity will appear here'}</div>
              </div>
            )
          }

          return (
            <div className="space-y-2">
              {items.map(item => <TimelineCard key={item._key} item={item} isRtl={isRtl} />)}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
