import React, { useState, useEffect } from 'react'
import { Save, AlertCircle, CheckCircle, Settings, Bell, Shield, Globe, Users, Eye, EyeOff } from 'lucide-react'
import { authHeader, fetchJson, getToken } from '../../lib/api'
import { defaultPermissions, navigationPermissions, updateNavigationVisibility } from '../../lib/api'

export default function AdminSettings() {
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
          <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
          <p className="mt-2 text-gray-600">
            Configure global platform settings and admin preferences.
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
              Saving...
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              Save Settings
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
              <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform Name
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
                  Platform Fee (%)
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
                  Minimum Investment (SAR)
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
                  Maximum Investment (SAR)
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
                  <span className="text-sm font-medium text-gray-700">Maintenance Mode</span>
                  <p className="text-sm text-gray-500">Temporarily disable user access to the platform</p>
                </div>
                <button
                  onClick={() => updateSetting('general', 'maintenanceMode', !settings.general.maintenanceMode)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    settings.general.maintenanceMode ? 'bg-red-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">Toggle maintenance mode</span>
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.general.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Allow New Registrations</span>
                  <p className="text-sm text-gray-500">Enable or disable new user signups</p>
                </div>
                <button
                  onClick={() => updateSetting('general', 'allowNewRegistrations', !settings.general.allowNewRegistrations)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    settings.general.allowNewRegistrations ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">Toggle registrations</span>
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.general.allowNewRegistrations ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Email Verification Required</span>
                  <p className="text-sm text-gray-500">Require users to verify their email address</p>
                </div>
                <button
                  onClick={() => updateSetting('general', 'requireEmailVerification', !settings.general.requireEmailVerification)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    settings.general.requireEmailVerification ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">Toggle email verification</span>
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
              <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Email
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
                  <span className="text-sm font-medium text-gray-700">Email Notifications</span>
                  <p className="text-sm text-gray-500">Receive email alerts for important events</p>
                </div>
                <button
                  onClick={() => updateSetting('notifications', 'emailNotifications', !settings.notifications.emailNotifications)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    settings.notifications.emailNotifications ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">Toggle email notifications</span>
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.notifications.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">New Property Alerts</span>
                  <p className="text-sm text-gray-500">Get notified when new properties are submitted</p>
                </div>
                <button
                  onClick={() => updateSetting('notifications', 'newPropertyAlerts', !settings.notifications.newPropertyAlerts)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    settings.notifications.newPropertyAlerts ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">Toggle property alerts</span>
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.notifications.newPropertyAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Investment Alerts</span>
                  <p className="text-sm text-gray-500">Get notified of new investments</p>
                </div>
                <button
                  onClick={() => updateSetting('notifications', 'investmentAlerts', !settings.notifications.investmentAlerts)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    settings.notifications.investmentAlerts ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">Toggle investment alerts</span>
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.notifications.investmentAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">System Alerts</span>
                  <p className="text-sm text-gray-500">Receive critical system notifications</p>
                </div>
                <button
                  onClick={() => updateSetting('notifications', 'systemAlerts', !settings.notifications.systemAlerts)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    settings.notifications.systemAlerts ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">Toggle system alerts</span>
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
              <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Timeout (hours)
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
                  Max Login Attempts
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
                  Minimum Password Length
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
                  <span className="text-sm font-medium text-gray-700">Two-Factor Authentication</span>
                  <p className="text-sm text-gray-500">Require 2FA for admin accounts</p>
                </div>
                <button
                  onClick={() => updateSetting('security', 'twoFactorAuth', !settings.security.twoFactorAuth)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    settings.security.twoFactorAuth ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">Toggle 2FA</span>
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
              <h2 className="text-lg font-semibold text-gray-900">Feature Settings</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">QR Code Generation</span>
                <p className="text-sm text-gray-500">Enable QR code features for properties</p>
              </div>
              <button
                onClick={() => updateSetting('features', 'enableQrCodes', !settings.features.enableQrCodes)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  settings.features.enableQrCodes ? 'bg-emerald-600' : 'bg-gray-200'
                }`}
              >
                <span className="sr-only">Toggle QR codes</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.features.enableQrCodes ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Analytics Dashboard</span>
                <p className="text-sm text-gray-500">Enable analytics and reporting features</p>
              </div>
              <button
                onClick={() => updateSetting('features', 'enableAnalytics', !settings.features.enableAnalytics)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  settings.features.enableAnalytics ? 'bg-emerald-600' : 'bg-gray-200'
                }`}
              >
                <span className="sr-only">Toggle analytics</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.features.enableAnalytics ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Reports Generation</span>
                <p className="text-sm text-gray-500">Allow admin to generate reports</p>
              </div>
              <button
                onClick={() => updateSetting('features', 'enableReports', !settings.features.enableReports)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  settings.features.enableReports ? 'bg-emerald-600' : 'bg-gray-200'
                }`}
              >
                <span className="sr-only">Toggle reports</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.features.enableReports ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Messaging System</span>
                <p className="text-sm text-gray-500">Enable user-to-user messaging</p>
              </div>
              <button
                onClick={() => updateSetting('features', 'enableMessaging', !settings.features.enableMessaging)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  settings.features.enableMessaging ? 'bg-emerald-600' : 'bg-gray-200'
                }`}
              >
                <span className="sr-only">Toggle messaging</span>
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
                Role-Based Access Control
              </h3>
            </div>

            <div className="space-y-6">
              {/* Navigation Visibility */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Navigation Visibility</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Control which navigation items are visible to each role
                </p>

                {['investor', 'owner', 'admin'].map(role => (
                  <div key={role} className="mb-6">
                    <h5 className="text-sm font-medium text-gray-700 mb-3 capitalize">{role} Navigation</h5>
                    <div className="space-y-2">
                      {navigationPermissions.navbar[role].filter(item => item.configurable).map(item => (
                        <div key={item.path} className="flex items-center justify-between py-2">
                          <div>
                            <span className="text-sm font-medium text-gray-700">{item.label}</span>
                            <p className="text-xs text-gray-500">{item.path}</p>
                          </div>
                          <button
                            onClick={() => toggleNavigationItem(role, item.path)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                              isNavigationItemDisabled(role, item.path) ? 'bg-gray-200' : 'bg-emerald-600'
                            }`}
                          >
                            <span className="sr-only">Toggle {item.label}</span>
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isNavigationItemDisabled(role, item.path) ? 'translate-x-0' : 'translate-x-5'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}