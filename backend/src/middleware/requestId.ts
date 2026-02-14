import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { runWithContext } from '../lib/requestContext'

function generateRequestId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex')
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = (req.header('X-Request-Id') || req.header('x-request-id') || '').trim()
  const requestId = incomingId || generateRequestId()

  res.setHeader('X-Request-Id', requestId)

  runWithContext({ requestId }, () => {
    next()
  })
}
