import { Router, Request, Response } from 'express'
import { auth } from '../middleware/auth'

export const deviceRouter = Router()

// POST /api/device/register
// TODO: implement when Firebase/APNs push infrastructure is added.
// Requires: DeviceToken model in Prisma + FCM server key.
deviceRouter.post('/register', auth(true), async (req: Request & { user?: any }, res: Response) => {
  const { token, platform, deviceId, appVersion } = req.body

  if (!token || !platform) {
    return res.status(400).json({
      success: false,
      code: 'missing_fields',
      message: 'token and platform are required.',
    })
  }

  const validPlatforms = ['ios', 'android']
  if (!validPlatforms.includes(String(platform).toLowerCase())) {
    return res.status(400).json({
      success: false,
      code: 'invalid_platform',
      message: 'platform must be "ios" or "android".',
    })
  }

  // Log the registration attempt for future implementation reference
  console.log(`📱 [DEVICE REGISTER] user=${req.user!.userId} platform=${platform} appVersion=${appVersion || 'unknown'}`)

  return res.status(200).json({
    success: false,
    code: 'push_notifications_not_configured',
    message: 'Push notifications are not configured yet. Token received but not stored.',
  })
})

// POST /api/device/unregister
// TODO: implement when push infrastructure is added.
deviceRouter.post('/unregister', auth(true), async (req: Request & { user?: any }, res: Response) => {
  const { token } = req.body

  if (!token) {
    return res.status(400).json({
      success: false,
      code: 'missing_fields',
      message: 'token is required.',
    })
  }

  console.log(`📱 [DEVICE UNREGISTER] user=${req.user!.userId}`)

  return res.status(200).json({
    success: false,
    code: 'push_notifications_not_configured',
    message: 'Push notifications are not configured yet.',
  })
})
