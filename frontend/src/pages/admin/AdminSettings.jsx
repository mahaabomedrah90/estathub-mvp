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
      platformName: 'Estathub',
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.settings.headerTitle')}</h1>
          <p className="mt-2 text-gray-600">
            {t('admin.settings.headerSubtitle')}
          </p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {isArabic ? 'جاري حفظ الإعدادات...' : 'Saving settings...'}
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              {isArabic ? 'حفظ التغييرات' : 'Save changes'}
            </>
          )}
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="flex">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            <div>{message.text}</div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Settings className="h-5 w-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">{t('admin.settings.generalSettings')}</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.settings.platformName')}
                </label>
                <input
                  type="text"
                  value={settings.general.platformName}
                  onChange={(e) => updateSetting('general', 'platformName', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.settings.platformFee')} (%)
                </label>
                <input
                  type="number"
                  value={settings.general.platformFee}
                  onChange={(e) => updateSetting('general', 'platformFee', parseFloat(e.target.value))}
                  min="0"
                  max="100"
                  step="0.1"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.settings.minInvestment')} (SAR)
                </label>
                <input
                  type="number"
                  value={settings.general.minInvestmentAmount}
                  onChange={(e) => updateSetting('general', 'minInvestmentAmount', parseInt(e.target.value))}
                  min="1"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.settings.maxInvestment')} (SAR)
                </label>
                <input
                  type="number"
                  value={settings.general.maxInvestmentAmount}
                  onChange={(e) => updateSetting('general', 'maxInvestmentAmount', parseInt(e.target.value))}
                  min="1"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">{t('admin.settings.maintenanceMode')}</span>
                  <p className="text-sm text-gray-500">{t('admin.settings.maintenanceModeDesc')}</p>
                </div>
                <button
                  onClick={() => updateSetting('general', 'maintenanceMode', !settings.general.maintenanceMode)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    settings.general.maintenanceMode ? 'bg-red-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">{t('admin.settings.toggleMaintenance')}</span>
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.general.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">{t('admin.settings.allowNewRegistrations')}</span>
                  <p className="text-sm text-gray-500">{t('admin.settings.allowNewRegistrationsDesc')}</p>
                </div>
                <button
                  onClick={() => updateSetting('general', 'allowNewRegistrations', !settings.general.allowNewRegistrations)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    settings.general.allowNewRegistrations ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">{t('admin.settings.toggleRegistrations')}</span>
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.general.allowNewRegistrations ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">{t('admin.settings.requireEmailVerification')}</span>
                  <p className="text-sm text-gray-500">{t('admin.settings.requireEmailVerificationDesc')}</p>
                </div>
                <button
                  onClick={() => updateSetting('general', 'requireEmailVerification', !settings.general.requireEmailVerification)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    settings.general.requireEmailVerification ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">{t('admin.settings.toggleEmailVerification')}</span>
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.general.requireEmailVerification ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Bell className="h-5 w-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">{t('admin.settings.notifications')}</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.settings.adminEmail')}
              </label>
              <input
                type="email"
                value={settings.notifications.adminEmail}
                onChange={(e) => updateSetting('notifications', 'adminEmail', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">{t('admin.settings.emailNotifications')}</span>
                  <p className="text-sm text-gray-500">{t('admin.settings.emailNotificationsDesc')}</p>
                </div>
                <button
                  onClick={() => updateSetting('notifications', 'emailNotifications', !settings.notifications.emailNotifications)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    settings.notifications.emailNotifications ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">{t('admin.settings.toggleEmailNotifications')}</span>
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.notifications.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">{t('admin.settings.newPropertyAlerts')}</span>
                  <p className="text-sm text-gray-500">{t('admin.settings.newPropertyAlertsDesc')}</p>
                </div>
                <button
                  onClick={() => updateSetting('notifications', 'newPropertyAlerts', !settings.notifications.newPropertyAlerts)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    settings.notifications.newPropertyAlerts ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">{t('admin.settings.togglePropertyAlerts')}</span>
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.notifications.newPropertyAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">{t('admin.settings.investmentAlerts')}</span>
                  <p className="text-sm text-gray-500">{t('admin.settings.investmentAlertsDesc')}</p>
                </div>
                <button
                  onClick={() => updateSetting('notifications', 'investmentAlerts', !settings.notifications.investmentAlerts)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    settings.notifications.investmentAlerts ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">{t('admin.settings.toggleInvestmentAlerts')}</span>
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.notifications.investmentAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">{t('admin.settings.systemAlerts')}</span>
                  <p className="text-sm text-gray-500">{t('admin.settings.systemAlertsDesc')}</p>
                </div>
                <button
                  onClick={() => updateSetting('notifications', 'systemAlerts', !settings.notifications.systemAlerts)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    settings.notifications.systemAlerts ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">{t('admin.settings.toggleSystemAlerts')}</span>
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.notifications.systemAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">{t('admin.settings.security')}</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.settings.sessionTimeout')}
                </label>
                <input
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                  min="1"
                  max="168"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.settings.maxLoginAttempts')}
                </label>
                <input
                  type="number"
                  value={settings.security.maxLoginAttempts}
                  onChange={(e) => updateSetting('security', 'maxLoginAttempts', parseInt(e.target.value))}
                  min="1"
                  max="10"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.settings.passwordMinLength')}
                </label>
                <input
                  type="number"
                  value={settings.security.passwordMinLength}
                  onChange={(e) => updateSetting('security', 'passwordMinLength', parseInt(e.target.value))}
                  min="6"
                  max="20"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">{t('admin.settings.twoFactorAuth')}</span>
                  <p className="text-sm text-gray-500">{t('admin.settings.twoFactorAuthDesc')}</p>
                </div>
                <button
                  onClick={() => updateSetting('security', 'twoFactorAuth', !settings.security.twoFactorAuth)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    settings.security.twoFactorAuth ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">{t('admin.settings.toggle2FA')}</span>
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.security.twoFactorAuth ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Settings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Globe className="h-5 w-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">{t('admin.settings.features')}</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">{t('admin.settings.qrCodeGeneration')}</span>
                <p className="text-sm text-gray-500">{t('admin.settings.qrCodeGenerationDesc')}</p>
              </div>
              <button
                onClick={() => updateSetting('features', 'enableQrCodes', !settings.features.enableQrCodes)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  settings.features.enableQrCodes ? 'bg-emerald-600' : 'bg-gray-200'
                }`}
              >
                <span className="sr-only">{t('admin.settings.toggleQRCodes')}</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.features.enableQrCodes ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">{t('admin.settings.analyticsDashboard')}</span>
                <p className="text-sm text-gray-500">{t('admin.settings.analyticsDashboardDesc')}</p>
              </div>
              <button
                onClick={() => updateSetting('features', 'enableAnalytics', !settings.features.enableAnalytics)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  settings.features.enableAnalytics ? 'bg-emerald-600' : 'bg-gray-200'
                }`}
              >
                <span className="sr-only">{t('admin.settings.toggleAnalytics')}</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.features.enableAnalytics ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">{t('admin.settings.reportsGeneration')}</span>
                <p className="text-sm text-gray-500">{t('admin.settings.reportsGenerationDesc')}</p>
              </div>
              <button
                onClick={() => updateSetting('features', 'enableReports', !settings.features.enableReports)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  settings.features.enableReports ? 'bg-emerald-600' : 'bg-gray-200'
                }`}
              >
                <span className="sr-only">{t('admin.settings.toggleReports')}</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.features.enableReports ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">{t('admin.settings.messagingSystem')}</span>
                <p className="text-sm text-gray-500">{t('admin.settings.messagingSystemDesc')}</p>
              </div>
              <button
                onClick={() => updateSetting('features', 'enableMessaging', !settings.features.enableMessaging)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  settings.features.enableMessaging ? 'bg-emerald-600' : 'bg-gray-200'
                }`}
              >
                <span className="sr-only">{t('admin.settings.toggleMessaging')}</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.features.enableMessaging ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Role-Based Access Control */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-6">
              <Shield className="text-emerald-600 mr-3" size={24} />
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {t('admin.settings.roleBasedAccessControl')}
              </h3>
            </div>

            <div className="space-y-6">
              {/* Navigation Visibility */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">{t('admin.settings.navigationVisibility')}</h4>
                <p className="text-sm text-gray-600 mb-4">
                  {t('admin.settings.navigationVisibilityDesc')}
                </p>

                {Object.entries(navigationPermissions.navbar).map(([role, items]) => {
                  // Get the translated role name, defaulting to the role key if not found
                  const roleName = t(`admin.settings.roles.${role}`, { defaultValue: role });
                  return (
                    <div key={role} className="mb-6">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">{roleName}</h5>
                      <div className="space-y-2">
                        {items.filter(item => item.configurable).map(item => {
                          // Get the translated navigation item label
                          const navKey = item.path.replace(/^\//, '').replace(/\//g, '.');
                          const label = t(`admin.settings.navigation.${navKey}`, { defaultValue: item.label });
                          
                          return (
                            <div key={item.path} className="flex items-center justify-between py-2">
                              <div>
                                <span className="text-sm font-medium text-gray-700">
                                  {label}
                                </span>
                                <p className="text-xs text-gray-500">{item.path}</p>
                              </div>
                              <button
                                onClick={() => toggleNavigationItem(role, item.path)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                                  isNavigationItemDisabled(role, item.path) ? 'bg-gray-200' : 'bg-emerald-600'
                                }`}
                                aria-label={t('admin.settings.toggleNavigation', { role: roleName })}
                              >
                                <span className="sr-only">
                                  {t('admin.settings.toggleNavigation', { role: roleName })}
                                </span>
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    isNavigationItemDisabled(role, item.path) ? 'translate-x-0' : 'translate-x-5'
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