import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'

export const settingsRouter = Router()

// Default settings values matching AdminSettings.jsx
const DEFAULT_SETTINGS = {
  // General Settings
  platformName: 'Estathub',
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
}

// GET /api/settings - Get all settings (accessible to all authenticated users)
settingsRouter.get('/', auth(true), async (req: Request & { user?: any }, res: Response) => {
  try {
    console.log('📖 Fetching all settings for user:', req.user?.email)

    const settings = await prisma.settings.findMany()
    
    // Convert array to object format
    const settingsObj: Record<string, any> = {}
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value
    })

    // Merge with defaults for any missing keys
    const completeSettings = { ...DEFAULT_SETTINGS, ...settingsObj }

    // Convert to the structure expected by frontend
    const structuredSettings = {
      general: {
        platformName: completeSettings.platformName,
        requireEmailVerification: completeSettings.requireEmailVerification === 'true',
        platformFee: parseFloat(completeSettings.platformFee),
        minInvestmentAmount: parseInt(completeSettings.minInvestmentAmount),
        maxInvestmentAmount: parseInt(completeSettings.maxInvestmentAmount),
      },
      notifications: {
        emailNotifications: completeSettings.emailNotifications === 'true',
        newPropertyAlerts: completeSettings.newPropertyAlerts === 'true',
        investmentAlerts: completeSettings.investmentAlerts === 'true',
        systemAlerts: completeSettings.systemAlerts === 'true',
        adminEmail: completeSettings.adminEmail,
      },
      security: {
        twoFactorAuth: completeSettings.twoFactorAuth === 'true',
        sessionTimeout: parseInt(completeSettings.sessionTimeout),
        maxLoginAttempts: parseInt(completeSettings.maxLoginAttempts),
        passwordMinLength: parseInt(completeSettings.passwordMinLength),
      },
      features: {
        enableQrCodes: completeSettings.enableQrCodes === 'true',
        enableAnalytics: completeSettings.enableAnalytics === 'true',
        enableReports: completeSettings.enableReports === 'true',
        enableMessaging: completeSettings.enableMessaging === 'true',
      }
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
    // Only admins can update settings
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'forbidden', message: 'Admin access required' })
    }

    const { general, notifications, security, features } = req.body
    
    if (!general && !notifications && !security && !features) {
      return res.status(400).json({ error: 'invalid_input', message: 'Settings object required' })
    }

    console.log('💾 Updating settings:', req.body)

    // Flatten the structured settings into key-value pairs
    const flatSettings: Record<string, string> = {}
    
    if (general) {
      flatSettings.platformName = String(general.platformName || 'Estathub')
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

    // Update each setting in database
    const updatePromises = Object.entries(flatSettings).map(([key, value]) => {
      return prisma.settings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { 
          key, 
          value: String(value),
          category: getCategoryForKey(key)
        }
      })
    })

    await Promise.all(updatePromises)

    console.log('✅ Settings updated successfully')
    return res.json({ success: true, message: 'Settings updated successfully' })
  } catch (error) {
    console.error('❌ Failed to update settings:', error)
    return res.status(500).json({ error: 'failed_to_update_settings', details: (error as Error)?.message })
  }
})

// GET /api/settings/:key - Get a specific setting value
settingsRouter.get('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params
    
    const setting = await prisma.settings.findUnique({ where: { key } })
    
    if (!setting) {
      // Return default value if exists
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

// Helper function to categorize settings
function getCategoryForKey(key: string): string {
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

// Helper function to get a setting value (for use in other controllers)
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