import React, { useState, useEffect } from 'react'
import { Save, AlertCircle, CheckCircle, Settings, Bell, Shield, Globe, Users, Eye, EyeOff } from 'lucide-react'
import { authHeader, fetchJson, getToken } from '../../lib/api'
import { defaultPermissions, navigationPermissions, updateNavigationVisibility } from '../../lib/api'
import { useTranslation } from 'react-i18next';

export default function AdminSettings() {
  const { t, i18n } = useTranslation('pages');
  const isArabic = i18n.language === 'ar'
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [settings, setSettings] = useState({
    general: {
      platformName: 'ALWASM',
      maintenanceMode: false,
      allowNewRegistrations: true,
      requireEmailVerification: true,
      platformFee: 5,
      minInvestmentAmount: 100,
      maxInvestmentAmount: 1000000
    },
    notifications: {
      emailNotifications: true,
      newPropertyAlerts: true,
      investmentAlerts: true,
      systemAlerts: true,
      adminEmail: 'admin@estathub.com'
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 24,
      maxLoginAttempts: 5,
      passwordMinLength: 8
    },
    features: {
      enableQrCodes: true,
      enableAnalytics: true,
      enableReports: true,
      enableMessaging: true
    }
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await fetchJson('/api/settings', { headers: authHeader() })
      setSettings(data)
      console.log('✅ Settings loaded from database:', data)
    } catch (error) {
      console.error('❌ Failed to load settings:', error)
      showMessage('error', 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      await fetchJson('/api/settings', {
        method: 'PUT',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      console.log('✅ Settings saved to database')
      showMessage('success', 'Settings saved successfully')
    } catch (error) {
      console.error('❌ Failed to save settings:', error)
      showMessage('error', 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
  }
  // Role-based access control handlers
 const toggleNavigationItem = (role, path) => {
 const current = JSON.parse(localStorage.getItem(`disabled_nav_${role}`) || '[]')
 const updated = current.includes(path)
 ? current.filter(p => p !== path)
 : [...current, path]
 updateNavigationVisibility(role, updated)
 showMessage('success', `Navigation visibility updated for ${role}`)
 }
 
 const isNavigationItemDisabled = (role, path) => {
 const disabled = JSON.parse(localStorage.getItem(`disabled_nav_${role}`) || '[]')
 return disabled.includes(path)
 }
 


  if (!getToken()) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <AlertCircle className="mx-auto text-gray-400" size={64} />
          <div className="text-gray-600">Please login as admin to access settings.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[#1E1958] mb-3">{t('admin.settings.headerTitle')}</h1>
            <p className="text-lg text-gray-600 max-w-2xl">
              {t('admin.settings.headerSubtitle')}
            </p>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center px-8 py-4 border-2 border-[#41EAD4] bg-gradient-to-r from-[#41EAD4] to-[#2DD4BF] text-white font-semibold rounded-xl hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#41EAD4] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                {isArabic ? 'جاري حفظ الإعدادات...' : 'Saving settings...'}
              </>
            ) : (
              <>
                <Save size={20} className="mr-3" />
                {isArabic ? 'حفظ التغييرات' : 'Save changes'}
              </>
            )}
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`mb-8 p-6 rounded-2xl border-2 shadow-lg ${
          message.type === 'success' ? 'bg-[#41EAD4]/10 border-[#41EAD4]/30 text-[#41EAD4]' : 'bg-[#ED9072]/10 border-[#ED9072]/30 text-[#ED9072]'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="h-6 w-6 mr-3" />
            ) : (
              <AlertCircle className="h-6 w-6 mr-3" />
            )}
            <div className="text-lg font-medium">{message.text}</div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* General Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-[#1E1958]/10 rounded-xl mr-3">
                <Settings className="text-[#1E1958]" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-[#1E1958]">{t('admin.settings.generalSettings')}</h2>
            </div>
          </div>
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t('admin.settings.platformName')}
                </label>
                <input
                  type="text"
                  value={settings.general.platformName}
                  onChange={(e) => updateSetting('general', 'platformName', e.target.value)}
                  className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#41EAD4] focus:ring-2 focus:ring-[#41EAD4]/20 transition-all text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t('admin.settings.platformFee')} (%)
                </label>
                <input
                  type="number"
                  value={settings.general.platformFee}
                  onChange={(e) => updateSetting('general', 'platformFee', parseFloat(e.target.value))}
                  min="0"
                  max="100"
                  step="0.1"
                  className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#41EAD4] focus:ring-2 focus:ring-[#41EAD4]/20 transition-all text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t('admin.settings.minInvestment')} (SAR)
                </label>
                <input
                  type="number"
                  value={settings.general.minInvestmentAmount}
                  onChange={(e) => updateSetting('general', 'minInvestmentAmount', parseInt(e.target.value))}
                  min="1"
                  className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#41EAD4] focus:ring-2 focus:ring-[#41EAD4]/20 transition-all text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t('admin.settings.maxInvestment')} (SAR)
                </label>
                <input
                  type="number"
                  value={settings.general.maxInvestmentAmount}
                  onChange={(e) => updateSetting('general', 'maxInvestmentAmount', parseInt(e.target.value))}
                  min="1"
                  className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#41EAD4] focus:ring-2 focus:ring-[#41EAD4]/20 transition-all text-gray-900"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <span className="text-sm font-semibold text-gray-700">{t('admin.settings.maintenanceMode')}</span>
                  <p className="text-sm text-gray-500 mt-1">{t('admin.settings.maintenanceModeDesc')}</p>
                </div>
                <button
                  onClick={() => updateSetting('general', 'maintenanceMode', !settings.general.maintenanceMode)}
                  className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#ED9072] focus:ring-offset-2 ${
                    settings.general.maintenanceMode ? 'bg-[#ED9072]' : 'bg-gray-300'
                  }`}
                >
                  <span className="sr-only">{t('admin.settings.toggleMaintenance')}</span>
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.general.maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <span className="text-sm font-semibold text-gray-700">{t('admin.settings.allowNewRegistrations')}</span>
                  <p className="text-sm text-gray-500 mt-1">{t('admin.settings.allowNewRegistrationsDesc')}</p>
                </div>
                <button
                  onClick={() => updateSetting('general', 'allowNewRegistrations', !settings.general.allowNewRegistrations)}
                  className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#41EAD4] focus:ring-offset-2 ${
                    settings.general.allowNewRegistrations ? 'bg-[#41EAD4]' : 'bg-gray-300'
                  }`}
                >
                  <span className="sr-only">{t('admin.settings.toggleRegistrations')}</span>
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.general.allowNewRegistrations ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <span className="text-sm font-semibold text-gray-700">{t('admin.settings.requireEmailVerification')}</span>
                  <p className="text-sm text-gray-500 mt-1">{t('admin.settings.requireEmailVerificationDesc')}</p>
                </div>
                <button
                  onClick={() => updateSetting('general', 'requireEmailVerification', !settings.general.requireEmailVerification)}
                  className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#41EAD4] focus:ring-offset-2 ${
                    settings.general.requireEmailVerification ? 'bg-[#41EAD4]' : 'bg-gray-300'
                  }`}
                >
                  <span className="sr-only">{t('admin.settings.toggleEmailVerification')}</span>
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.general.requireEmailVerification ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-[#41EAD4]/10 rounded-xl mr-3">
                <Bell className="text-[#41EAD4]" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-[#1E1958]">{t('admin.settings.notifications')}</h2>
            </div>
          </div>
          <div className="p-8 space-y-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {t('admin.settings.adminEmail')}
              </label>
              <input
                type="email"
                value={settings.notifications.adminEmail}
                onChange={(e) => updateSetting('notifications', 'adminEmail', e.target.value)}
                className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#41EAD4] focus:ring-2 focus:ring-[#41EAD4]/20 transition-all text-gray-900"
              />
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <span className="text-sm font-semibold text-gray-700">{t('admin.settings.emailNotifications')}</span>
                  <p className="text-sm text-gray-500 mt-1">{t('admin.settings.emailNotificationsDesc')}</p>
                </div>
                <button
                  onClick={() => updateSetting('notifications', 'emailNotifications', !settings.notifications.emailNotifications)}
                  className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#41EAD4] focus:ring-offset-2 ${
                    settings.notifications.emailNotifications ? 'bg-[#41EAD4]' : 'bg-gray-300'
                  }`}
                >
                  <span className="sr-only">{t('admin.settings.toggleEmailNotifications')}</span>
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.notifications.emailNotifications ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <span className="text-sm font-semibold text-gray-700">{t('admin.settings.newPropertyAlerts')}</span>
                  <p className="text-sm text-gray-500 mt-1">{t('admin.settings.newPropertyAlertsDesc')}</p>
                </div>
                <button
                  onClick={() => updateSetting('notifications', 'newPropertyAlerts', !settings.notifications.newPropertyAlerts)}
                  className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#41EAD4] focus:ring-offset-2 ${
                    settings.notifications.newPropertyAlerts ? 'bg-[#41EAD4]' : 'bg-gray-300'
                  }`}
                >
                  <span className="sr-only">{t('admin.settings.togglePropertyAlerts')}</span>
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.notifications.newPropertyAlerts ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <span className="text-sm font-semibold text-gray-700">{t('admin.settings.investmentAlerts')}</span>
                  <p className="text-sm text-gray-500 mt-1">{t('admin.settings.investmentAlertsDesc')}</p>
                </div>
                <button
                  onClick={() => updateSetting('notifications', 'investmentAlerts', !settings.notifications.investmentAlerts)}
                  className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#41EAD4] focus:ring-offset-2 ${
                    settings.notifications.investmentAlerts ? 'bg-[#41EAD4]' : 'bg-gray-300'
                  }`}
                >
                  <span className="sr-only">{t('admin.settings.toggleInvestmentAlerts')}</span>
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.notifications.investmentAlerts ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <span className="text-sm font-semibold text-gray-700">{t('admin.settings.systemAlerts')}</span>
                  <p className="text-sm text-gray-500 mt-1">{t('admin.settings.systemAlertsDesc')}</p>
                </div>
                <button
                  onClick={() => updateSetting('notifications', 'systemAlerts', !settings.notifications.systemAlerts)}
                  className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#41EAD4] focus:ring-offset-2 ${
                    settings.notifications.systemAlerts ? 'bg-[#41EAD4]' : 'bg-gray-300'
                  }`}
                >
                  <span className="sr-only">{t('admin.settings.toggleSystemAlerts')}</span>
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.notifications.systemAlerts ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-[#ED9072]/10 rounded-xl mr-3">
                <Shield className="text-[#ED9072]" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-[#1E1958]">{t('admin.settings.security')}</h2>
            </div>
          </div>
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t('admin.settings.sessionTimeout')}
                </label>
                <input
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                  min="1"
                  max="168"
                  className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#41EAD4] focus:ring-2 focus:ring-[#41EAD4]/20 transition-all text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t('admin.settings.maxLoginAttempts')}
                </label>
                <input
                  type="number"
                  value={settings.security.maxLoginAttempts}
                  onChange={(e) => updateSetting('security', 'maxLoginAttempts', parseInt(e.target.value))}
                  min="1"
                  max="10"
                  className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#41EAD4] focus:ring-2 focus:ring-[#41EAD4]/20 transition-all text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t('admin.settings.passwordMinLength')}
                </label>
                <input
                  type="number"
                  value={settings.security.passwordMinLength}
                  onChange={(e) => updateSetting('security', 'passwordMinLength', parseInt(e.target.value))}
                  min="6"
                  max="20"
                  className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#41EAD4] focus:ring-2 focus:ring-[#41EAD4]/20 transition-all text-gray-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <span className="text-sm font-semibold text-gray-700">{t('admin.settings.twoFactorAuth')}</span>
                <p className="text-sm text-gray-500 mt-1">{t('admin.settings.twoFactorAuthDesc')}</p>
              </div>
              <button
                onClick={() => updateSetting('security', 'twoFactorAuth', !settings.security.twoFactorAuth)}
                className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#ED9072] focus:ring-offset-2 ${
                  settings.security.twoFactorAuth ? 'bg-[#ED9072]' : 'bg-gray-300'
                }`}
              >
                <span className="sr-only">{t('admin.settings.toggle2FA')}</span>
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.security.twoFactorAuth ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Feature Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-[#986F9A]/10 rounded-xl mr-3">
                <Globe className="text-[#986F9A]" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-[#1E1958]">{t('admin.settings.features')}</h2>
            </div>
          </div>
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <span className="text-sm font-semibold text-gray-700">{t('admin.settings.qrCodeGeneration')}</span>
                <p className="text-sm text-gray-500 mt-1">{t('admin.settings.qrCodeGenerationDesc')}</p>
              </div>
              <button
                onClick={() => updateSetting('features', 'enableQrCodes', !settings.features.enableQrCodes)}
                className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#986F9A] focus:ring-offset-2 ${
                  settings.features.enableQrCodes ? 'bg-[#986F9A]' : 'bg-gray-300'
                }`}
              >
                <span className="sr-only">{t('admin.settings.toggleQRCodes')}</span>
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.features.enableQrCodes ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <span className="text-sm font-semibold text-gray-700">{t('admin.settings.analyticsDashboard')}</span>
                <p className="text-sm text-gray-500 mt-1">{t('admin.settings.analyticsDashboardDesc')}</p>
              </div>
              <button
                onClick={() => updateSetting('features', 'enableAnalytics', !settings.features.enableAnalytics)}
                className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#986F9A] focus:ring-offset-2 ${
                  settings.features.enableAnalytics ? 'bg-[#986F9A]' : 'bg-gray-300'
                }`}
              >
                <span className="sr-only">{t('admin.settings.toggleAnalytics')}</span>
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.features.enableAnalytics ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <span className="text-sm font-semibold text-gray-700">{t('admin.settings.reportsGeneration')}</span>
                <p className="text-sm text-gray-500 mt-1">{t('admin.settings.reportsGenerationDesc')}</p>
              </div>
              <button
                onClick={() => updateSetting('features', 'enableReports', !settings.features.enableReports)}
                className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#986F9A] focus:ring-offset-2 ${
                  settings.features.enableReports ? 'bg-[#986F9A]' : 'bg-gray-300'
                }`}
              >
                <span className="sr-only">{t('admin.settings.toggleReports')}</span>
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.features.enableReports ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <span className="text-sm font-semibold text-gray-700">{t('admin.settings.messagingSystem')}</span>
                <p className="text-sm text-gray-500 mt-1">{t('admin.settings.messagingSystemDesc')}</p>
              </div>
              <button
                onClick={() => updateSetting('features', 'enableMessaging', !settings.features.enableMessaging)}
                className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#986F9A] focus:ring-offset-2 ${
                  settings.features.enableMessaging ? 'bg-[#986F9A]' : 'bg-gray-300'
                }`}
              >
                <span className="sr-only">{t('admin.settings.toggleMessaging')}</span>
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.features.enableMessaging ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Role-Based Access Control */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-[#1E1958]/10 rounded-xl mr-3">
                <Shield className="text-[#1E1958]" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-[#1E1958]">{t('admin.settings.roleBasedAccessControl')}</h2>
            </div>
          </div>
          <div className="p-8">
            <div className="space-y-8">
              {/* Navigation Visibility */}
              <div>
                <h3 className="text-lg font-semibold text-[#1E1958] mb-4">{t('admin.settings.navigationVisibility')}</h3>
                <p className="text-gray-600 mb-6">
                  {t('admin.settings.navigationVisibilityDesc')}
                </p>

                {Object.entries(navigationPermissions.navbar).map(([role, items]) => {
                  // Get the translated role name, defaulting to the role key if not found
                  const roleName = t(`admin.settings.roles.${role}`, { defaultValue: role });
                  return (
                    <div key={role} className="mb-8">
                      <div className="mb-4">
                        <h4 className="text-base font-semibold text-gray-800">{roleName}</h4>
                      </div>
                      <div className="space-y-4">
                        {items.filter(item => item.configurable).map(item => {
                          // Get the translated navigation item label
                          const navKey = item.path.replace(/^\//, '').replace(/\//g, '.');
                          const label = t(`admin.settings.navigation.${navKey}`, { defaultValue: item.label });
                          
                          return (
                            <div key={item.path} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                              <div>
                                <span className="text-sm font-semibold text-gray-700">
                                  {label}
                                </span>
                                <p className="text-xs text-gray-500 mt-1">{item.path}</p>
                              </div>
                              <button
                                onClick={() => toggleNavigationItem(role, item.path)}
                                className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1E1958] focus:ring-offset-2 ${
                                  isNavigationItemDisabled(role, item.path) ? 'bg-gray-300' : 'bg-[#1E1958]'
                                }`}
                                aria-label={t('admin.settings.toggleNavigation', { role: roleName })}
                              >
                                <span className="sr-only">
                                  {t('admin.settings.toggleNavigation', { role: roleName })}
                                </span>
                                <span
                                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                    isNavigationItemDisabled(role, item.path) ? 'translate-x-0' : 'translate-x-6'
                                  }`}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}