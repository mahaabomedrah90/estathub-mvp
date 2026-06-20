import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { clearFeatureFlagCache } from '../lib/featureFlags'
import { logAdminAction, AuditAction } from '../lib/auditService'

export const settingsRouter = Router()

// Default settings values matching AdminSettings.jsx
const DEFAULT_SETTINGS = {
  // General Settings
  platformName: 'Estathub',
  maintenanceMode: 'false',
  allowNewRegistrations: 'true',
  requireEmailVerification: 'true',
  platformFee: '5',
  minInvestmentAmount: '100',
  maxInvestmentAmount: '1000000',

  // Notification Settings
  emailNotifications: 'true',
  newPropertyAlerts: 'true',
  investmentAlerts: 'true',
  systemAlerts: 'true',
  adminEmail: 'admin@estathub.com',

  // Security Settings
  twoFactorAuth: 'false',
  sessionTimeout: '24',
  maxLoginAttempts: '5',
  passwordMinLength: '8',

  // Feature Settings
  enableQrCodes: 'true',
  enableAnalytics: 'true',
  enableReports: 'true',
  enableMessaging: 'true',

  // Service Feature Flags
  purchaseEnabled:     'false',
  depositEnabled:      'true',
  withdrawalEnabled:   'true',
  walletEnabled:       'true',
  deedIssuanceEnabled: 'true',
  deedExportEnabled:   'true',
  blockchainEnabled:   'false',
  distributionEnabled: 'true',
  notificationsEnabled:'false',
}

// Keys treated as service feature flags (for cache clearing + audit log)
const SERVICE_FLAG_KEYS = [
  'purchaseEnabled',
  'depositEnabled',
  'withdrawalEnabled',
  'walletEnabled',
  'deedIssuanceEnabled',
  'deedExportEnabled',
  'blockchainEnabled',
  'distributionEnabled',
  'notificationsEnabled',
  'maintenanceMode',
]

// GET /api/settings - Get all settings (accessible to all authenticated users)
settingsRouter.get('/', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    console.log('📖 Fetching all settings for user:', req.user?.email)

    const settings = await prisma.settings.findMany()

    // Convert array to object format
    const settingsObj: Record<string, any> = {}
    settings.forEach((setting: any) => {
      settingsObj[setting.key] = setting.value
    })

    // Merge with defaults for any missing keys
    const s = { ...DEFAULT_SETTINGS, ...settingsObj }

    const structuredSettings = {
      general: {
        platformName: s.platformName,
        maintenanceMode: s.maintenanceMode === 'true',
        allowNewRegistrations: s.allowNewRegistrations === 'true',
        requireEmailVerification: s.requireEmailVerification === 'true',
        platformFee: parseFloat(s.platformFee) || 0,
        minInvestmentAmount: parseInt(s.minInvestmentAmount) || 100,
        maxInvestmentAmount: parseInt(s.maxInvestmentAmount) || 1000000,
      },
      notifications: {
        emailNotifications: s.emailNotifications === 'true',
        newPropertyAlerts: s.newPropertyAlerts === 'true',
        investmentAlerts: s.investmentAlerts === 'true',
        systemAlerts: s.systemAlerts === 'true',
        adminEmail: s.adminEmail,
      },
      security: {
        twoFactorAuth: s.twoFactorAuth === 'true',
        sessionTimeout: parseInt(s.sessionTimeout),
        maxLoginAttempts: parseInt(s.maxLoginAttempts),
        passwordMinLength: parseInt(s.passwordMinLength),
      },
      features: {
        enableQrCodes: s.enableQrCodes === 'true',
        enableAnalytics: s.enableAnalytics === 'true',
        enableReports: s.enableReports === 'true',
        enableMessaging: s.enableMessaging === 'true',
      },
      services: {
        purchaseEnabled:     s.purchaseEnabled     === 'true',
        depositEnabled:      s.depositEnabled      !== 'false',
        withdrawalEnabled:   s.withdrawalEnabled   !== 'false',
        walletEnabled:       s.walletEnabled       !== 'false',
        deedIssuanceEnabled: s.deedIssuanceEnabled !== 'false',
        deedExportEnabled:   s.deedExportEnabled   !== 'false',
        blockchainEnabled:   s.blockchainEnabled   === 'true',
        distributionEnabled: s.distributionEnabled !== 'false',
        notificationsEnabled:s.notificationsEnabled === 'true',
        maintenanceMode:     s.maintenanceMode     === 'true',
      },
    }

    console.log('✅ Settings fetched successfully')
    return res.json(structuredSettings)
  } catch (error) {
    console.error('❌ Failed to fetch settings:', error)
    return res.status(500).json({ error: 'failed_to_fetch_settings', details: (error as Error)?.message })
  }
})

// PUT /api/settings - Update settings (admin only)
settingsRouter.put('/', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'forbidden', message: 'Admin access required' })
    }

    const { general, notifications, security, features, services } = req.body

    if (!general && !notifications && !security && !features && !services) {
      return res.status(400).json({ error: 'invalid_input', message: 'Settings object required' })
    }

    console.log('💾 Updating settings:', req.body)

    const flatSettings: Record<string, string> = {}

    if (general) {
      flatSettings.platformName = String(general.platformName || 'Estathub')
      flatSettings.maintenanceMode = String(!!general.maintenanceMode)
      flatSettings.allowNewRegistrations = String(general.allowNewRegistrations !== false)
      flatSettings.requireEmailVerification = String(general.requireEmailVerification)
      flatSettings.platformFee = String(general.platformFee)
      flatSettings.minInvestmentAmount = String(general.minInvestmentAmount)
      flatSettings.maxInvestmentAmount = String(general.maxInvestmentAmount)
    }

    if (notifications) {
      flatSettings.emailNotifications = String(notifications.emailNotifications)
      flatSettings.newPropertyAlerts = String(notifications.newPropertyAlerts)
      flatSettings.investmentAlerts = String(notifications.investmentAlerts)
      flatSettings.systemAlerts = String(notifications.systemAlerts)
      flatSettings.adminEmail = String(notifications.adminEmail || 'admin@estathub.com')
    }

    if (security) {
      flatSettings.twoFactorAuth = String(security.twoFactorAuth)
      flatSettings.sessionTimeout = String(security.sessionTimeout)
      flatSettings.maxLoginAttempts = String(security.maxLoginAttempts)
      flatSettings.passwordMinLength = String(security.passwordMinLength)
    }

    if (features) {
      flatSettings.enableQrCodes = String(features.enableQrCodes)
      flatSettings.enableAnalytics = String(features.enableAnalytics)
      flatSettings.enableReports = String(features.enableReports)
      flatSettings.enableMessaging = String(features.enableMessaging)
    }

    if (services) {
      for (const key of SERVICE_FLAG_KEYS) {
        if (key in services) {
          flatSettings[key] = String(!!services[key])
        }
      }
    }

    // Read old values for flag-change audit log
    const oldRows = await prisma.settings.findMany({
      where: { key: { in: Object.keys(flatSettings).filter(k => SERVICE_FLAG_KEYS.includes(k)) } },
    })
    const oldValues: Record<string, string> = {}
    oldRows.forEach((r: any) => { oldValues[r.key] = r.value })

    // Upsert all settings
    const updatePromises = Object.entries(flatSettings).map(([key, value]) =>
      prisma.settings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), category: getCategoryForKey(key) },
      })
    )
    await Promise.all(updatePromises)

    // Clear entire feature flag cache after bulk update
    clearFeatureFlagCache()

    // Audit log for any flag changes
    for (const key of SERVICE_FLAG_KEYS) {
      if (!(key in flatSettings)) continue
      const oldValue = oldValues[key] ?? 'unknown'
      const newValue = flatSettings[key]
      if (oldValue !== newValue) {
        logAdminAction({
          admin: { userId: req.user.userId, email: req.user.email },
          action: AuditAction.FEATURE_FLAG_CHANGED,
          targetType: 'SETTING',
          targetId: key,
          metadata: { key, oldValue, newValue },
          req,
        }).catch(() => {})
      }
    }

    console.log('✅ Settings updated successfully')
    return res.json({ success: true, message: 'Settings updated successfully' })
  } catch (error) {
    console.error('❌ Failed to update settings:', error)
    return res.status(500).json({ error: 'failed_to_update_settings', details: (error as Error)?.message })
  }
})

// PATCH /api/settings/flag/:key — immediate single feature-flag toggle (admin only)
settingsRouter.patch('/flag/:key', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'forbidden', message: 'Admin access required' })
    }

    const { key } = req.params
    const { value } = req.body

    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'value_required' })
    }

    // Read old value for audit
    const existing = await prisma.settings.findUnique({ where: { key } })
    const oldValue = existing?.value ?? 'unknown'
    const newValue = String(!!value)

    await prisma.settings.upsert({
      where: { key },
      update: { value: newValue },
      create: { key, value: newValue, category: getCategoryForKey(key) },
    })

    clearFeatureFlagCache(key)

    logAdminAction({
      admin: { userId: req.user.userId, email: req.user.email },
      action: AuditAction.FEATURE_FLAG_CHANGED,
      targetType: 'SETTING',
      targetId: key,
      metadata: { key, oldValue, newValue },
      req,
    }).catch(() => {})

    console.log(`✅ Feature flag ${key} changed: ${oldValue} → ${newValue} by ${req.user.email}`)
    return res.json({ success: true, key, value: newValue === 'true' })
  } catch (error) {
    console.error('❌ Failed to update feature flag:', error)
    return res.status(500).json({ error: 'failed_to_update_flag', details: (error as Error)?.message })
  }
})

// GET /api/settings/public — mobile-safe public settings (no auth required)
const PUBLIC_SETTING_KEYS = [
  'platformName',
  'maintenanceMode',
  'allowNewRegistrations',
  'requireEmailVerification',
  'minInvestmentAmount',
  'maxInvestmentAmount',
]

settingsRouter.get('/public', async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.settings.findMany({
      where: { key: { in: PUBLIC_SETTING_KEYS } },
    })

    const map: Record<string, string> = {}
    rows.forEach((s: any) => { map[s.key] = s.value })

    const safeInt = (raw: string | undefined, fallback: string): number => {
      const n = parseInt(raw ?? fallback)
      return Number.isNaN(n) ? parseInt(fallback) : n
    }

    return res.json({
      success: true,
      data: {
        platformName: map.platformName ?? DEFAULT_SETTINGS.platformName,
        maintenanceMode: (map.maintenanceMode ?? DEFAULT_SETTINGS.maintenanceMode) === 'true',
        allowNewRegistrations: (map.allowNewRegistrations ?? DEFAULT_SETTINGS.allowNewRegistrations) === 'true',
        requireEmailVerification: (map.requireEmailVerification ?? DEFAULT_SETTINGS.requireEmailVerification) === 'true',
        minInvestmentAmount: safeInt(map.minInvestmentAmount, DEFAULT_SETTINGS.minInvestmentAmount),
        maxInvestmentAmount: safeInt(map.maxInvestmentAmount, DEFAULT_SETTINGS.maxInvestmentAmount),
      },
    })
  } catch (error) {
    console.error('❌ Failed to fetch public settings:', error)
    return res.status(500).json({ error: 'failed_to_fetch_settings' })
  }
})

// GET /api/settings/:key - Get a specific setting value
settingsRouter.get('/:key', auth(true), async (req: Request, res: Response) => {
  try {
    const { key } = req.params

    const setting = await prisma.settings.findUnique({ where: { key } })

    if (!setting) {
      const defaultValue = DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS]
      if (defaultValue) {
        return res.json({ key, value: defaultValue })
      }
      return res.status(404).json({ error: 'setting_not_found' })
    }

    return res.json({ key: setting.key, value: setting.value })
  } catch (error) {
    console.error('❌ Failed to fetch setting:', error)
    return res.status(500).json({ error: 'failed_to_fetch_setting', details: (error as Error)?.message })
  }
})

// Helper: categorize settings key
function getCategoryForKey(key: string): string {
  if (SERVICE_FLAG_KEYS.includes(key)) return 'features'
  if (key.includes('email') || key.includes('notification') || key.includes('alert') || key === 'adminEmail') {
    return 'notifications'
  }
  if (key.includes('auth') || key.includes('password') || key.includes('session') || key.includes('login') || key.includes('Auth') || key.includes('Factor')) {
    return 'security'
  }
  if (key.includes('enable')) {
    return 'features'
  }
  return 'general'
}

// Helper: read a single setting value with fallback (used by other controllers)
export async function getSetting(key: string, defaultValue?: string): Promise<string> {
  try {
    const setting = await prisma.settings.findUnique({ where: { key } })
    if (setting) {
      return setting.value
    }
    return defaultValue || DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS] || ''
  } catch (error) {
    console.error(`❌ Failed to get setting ${key}:`, error)
    return defaultValue || DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS] || ''
  }
}
