import { Request, Response, NextFunction } from 'express'
import { getSetting } from '../controllers/settings.controller'

/**
 * Blocks registration when allowNewRegistrations = 'false'.
 * Must run before the register/signup handler.
 */
export async function registrationGuard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const allowed = await getSetting('allowNewRegistrations', 'true')
    if (allowed !== 'true') {
      const lang = req.headers['accept-language']?.includes('ar') ? 'ar' : 'en'
      res.status(403).json({
        error: 'registration_disabled',
        message:
          lang === 'ar'
            ? 'التسجيل غير متاح حالياً'
            : 'Registration is currently unavailable',
      })
      return
    }
    next()
  } catch {
    // If settings read fails, allow through — don't break registration on DB hiccup
    next()
  }
}

/**
 * Blocks all requests when maintenanceMode = 'true'.
 * Role-blind: use on registration routes.
 * For login, use the role-aware check inside the login handler instead.
 */
export async function maintenanceGuard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const active = await getSetting('maintenanceMode', 'false')
    if (active === 'true') {
      const lang = req.headers['accept-language']?.includes('ar') ? 'ar' : 'en'
      res.status(503).json({
        error: 'maintenance_mode',
        message:
          lang === 'ar'
            ? 'المنصة تحت الصيانة حالياً'
            : 'Platform is currently under maintenance',
      })
      return
    }
    next()
  } catch {
    next()
  }
}
