import { Request, Response, NextFunction } from 'express'
import { config } from '../config'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err.statusCode || err.status || 500
  const isDev = config.nodeEnv === 'development' || config.fabricDebug

  const body: any = {
    success: false,
    error: err.code || err.name || 'internal_error',
    message: err.message || 'Internal server error',
  }

  if (err.details) {
    body.details = err.details
  }

  if (isDev && err.stack) {
    body.stack = err.stack
  }

  if (status >= 500) {
    console.error('Gateway error:', err)
  }

  res.status(status).json(body)
}
