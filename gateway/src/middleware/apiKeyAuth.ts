import { Request, Response, NextFunction } from 'express'
import { config } from '../config'

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  if (!config.gatewayApiKey && config.nodeEnv === 'development' && config.allowInsecureGateway) {
    return next()
  }

  const key = req.header('X-GATEWAY-KEY') || req.header('x-gateway-key')
  if (!key || key !== config.gatewayApiKey) {
    return res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: 'Invalid or missing X-GATEWAY-KEY header',
    })
  }

  return next()
}
