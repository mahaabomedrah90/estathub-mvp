import { Router, Request, Response } from 'express'
import { config } from '../config'

export const healthRouter = Router()

healthRouter.get('/v1/health', (req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'fabric-gateway',
    fabric: {
      configured: config.useFabric,
      useFabric: config.useFabric,
    },
    time: new Date().toISOString(),
  })
})
