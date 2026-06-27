import { Router, Request, Response } from 'express'
import { auth } from '../middleware/auth'

export const notificationsRouter = Router()

// GET /api/notifications
// TODO: implement when Notification model is added to Prisma schema.
// Returns empty stable response until then — Flutter can render an empty list.
notificationsRouter.get('/', auth(true), async (req: Request & { user?: any }, res: Response) => {
  const page  = Math.max(1, Number(req.query.page)  || 1)
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))

  return res.json({
    success: true,
    data: [],
    pagination: {
      page,
      limit,
      total: 0,
      pages: 0,
    },
  })
})

// PATCH /api/notifications/:id/read
// TODO: implement when Notification model is added to Prisma schema.
notificationsRouter.patch('/:id/read', auth(true), async (_req: Request, res: Response) => {
  return res.status(200).json({
    success: false,
    code: 'notifications_not_configured',
    message: 'Notifications are not configured yet.',
  })
})
