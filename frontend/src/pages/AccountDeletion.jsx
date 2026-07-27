import React, { useState } from 'react'
import { AlertCircle, Mail, CheckCircle2, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function AccountDeletion() {
  const { t } = useTranslation('pages')
  const { i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    reason: '',
    confirmation: false
  })

  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (!formData.fullName.trim()) {
      setError(t('accountDeletion.errors.nameRequired') || 'Name is required')
      return
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError(t('accountDeletion.errors.emailRequired') || 'Valid email is required')
      return
    }
    if (!formData.confirmation) {
      setError(t('accountDeletion.errors.confirmationRequired') || 'You must confirm the deletion')
      return
    }

    try {
      // Send deletion request to backend
      const response = await fetch('/api/auth/request-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone || undefined,
          reason: formData.reason || undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to submit deletion request')
      }

      setSubmitted(true)
      setFormData({ fullName: '', email: '', phone: '', reason: '', confirmation: false })
    } catch (err) {
      // Show actual error message - do NOT show fake success
      setError(t('accountDeletion.form.submitError') || 'Unable to process your request at this time. Please try again later or contact support@alwsm.sa')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-text-strong tracking-tight">
          {t('accountDeletion.title')}
        </h1>
        <p className="text-lg text-text-muted">
          {t('accountDeletion.subtitle')}
        </p>
      </div>

      {submitted ? (
        // Success Message
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
          <CheckCircle2 className="text-green-600 mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-bold text-text-strong mb-2">
            {t('accountDeletion.success.title')}
          </h2>
          <p className="text-text-body mb-6">
            {t('accountDeletion.success.message')}
          </p>
          <p className="text-sm text-text-muted mb-6">
            {t('accountDeletion.success.contact')}
          </p>
          <a
            href="/"
            className="inline-block bg-brand-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-primary/90 transition-colors"
          >
            {t('accountDeletion.success.returnHome')}
          </a>
        </div>
      ) : (
        <>
          {/* Warning Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex gap-3">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-text-strong mb-2">
                  {t('accountDeletion.warning.title')}
                </h3>
                <p className="text-sm text-text-body">
                  {t('accountDeletion.warning.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Information Sections */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface-card border border-border-soft rounded-xl p-6">
              <h3 className="font-semibold text-text-strong mb-3 flex items-center gap-2">
                <Shield size={18} />
                {t('accountDeletion.info.whatHappens.title')}
              </h3>
              <ul className="space-y-2 text-sm text-text-body">
                {(t('accountDeletion.info.whatHappens.items', { returnObjects: true }) || []).map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-brand-primary font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-surface-card border border-border-soft rounded-xl p-6">
              <h3 className="font-semibold text-text-strong mb-3 flex items-center gap-2">
                <AlertCircle size={18} />
                {t('accountDeletion.info.retention.title')}
              </h3>
              <p className="text-sm text-text-body mb-3">
                {t('accountDeletion.info.retention.description')}
              </p>
              <ul className="space-y-2 text-sm text-text-body">
                {(t('accountDeletion.info.retention.items', { returnObjects: true }) || []).map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-amber-600 font-bold">!</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Deletion Request Form */}
          <div className="bg-surface-card border border-border-soft rounded-2xl shadow-card p-8">
            <h2 className="text-xl font-bold text-text-strong mb-6">
              {t('accountDeletion.form.title')}
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-text-strong mb-2">
                  {t('accountDeletion.form.fullName')} *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder={t('accountDeletion.form.fullNamePlaceholder')}
                  className="w-full px-4 py-3 border border-border-soft rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-text-strong mb-2">
                  {t('accountDeletion.form.email')} *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('accountDeletion.form.emailPlaceholder')}
                  className="w-full px-4 py-3 border border-border-soft rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-text-strong mb-2">
                  {t('accountDeletion.form.phone')}
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={t('accountDeletion.form.phonePlaceholder')}
                  className="w-full px-4 py-3 border border-border-soft rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-text-strong mb-2">
                  {t('accountDeletion.form.reason')}
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  placeholder={t('accountDeletion.form.reasonPlaceholder')}
                  rows="4"
                  className="w-full px-4 py-3 border border-border-soft rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                />
                <p className="text-xs text-text-muted mt-1">
                  {t('accountDeletion.form.reasonOptional')}
                </p>
              </div>

              {/* Confirmation */}
              <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-lg p-4">
                <label className="flex gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="confirmation"
                    checked={formData.confirmation}
                    onChange={handleChange}
                    className="mt-1"
                    required
                  />
                  <span className="text-sm text-text-body">
                    {t('accountDeletion.form.confirmation')}
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!formData.confirmation}
              >
                {t('accountDeletion.form.submit')}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="bg-brand-primary rounded-2xl p-8 text-white text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Mail size={24} />
              <h3 className="text-lg font-bold">
                {t('accountDeletion.contact.title')}
              </h3>
            </div>
            <p className="text-white/70 mb-6">
              {t('accountDeletion.contact.description')}
            </p>
            <a
              href="mailto:support@alwsm.sa"
              className="inline-block bg-brand-accent text-white px-6 py-3 rounded-full font-semibold hover:bg-brand-accent/90 transition-colors"
            >
              support@alwsm.sa
            </a>
          </div>
        </>
      )}
    </div>
  )
}
