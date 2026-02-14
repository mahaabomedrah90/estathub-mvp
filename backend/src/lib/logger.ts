import { getRequestId } from './requestContext'

interface LogMeta {
  [key: string]: any
}

function redact(value: any): any {
  if (!value) return value
  if (typeof value === 'string') {
    if (value.includes('BEGIN PRIVATE KEY') || value.includes('BEGIN CERTIFICATE')) {
      return '[REDACTED_PEM]'
    }
    if (value.toLowerCase().includes('bearer ')) {
      return '[REDACTED_AUTH]'
    }
  }
  return value
}

function baseLog(level: 'info' | 'warn' | 'error', event: string, meta: LogMeta = {}): void {
  const requestId = getRequestId()
  const safeMeta: LogMeta = { ...meta }

  if (safeMeta.authorization) safeMeta.authorization = '[REDACTED_AUTH]'
  if (safeMeta.Authorization) safeMeta.Authorization = '[REDACTED_AUTH]'
  if (safeMeta.FABRIC_GATEWAY_KEY || safeMeta.gatewayKey) {
    safeMeta.FABRIC_GATEWAY_KEY = '[REDACTED]'
    safeMeta.gatewayKey = '[REDACTED]'
  }

  Object.keys(safeMeta).forEach(key => {
    safeMeta[key] = redact(safeMeta[key])
  })

  const payload = {
    level,
    event,
    requestId,
    ...safeMeta,
  }

  const line = JSON.stringify(payload)
  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export function logInfo(event: string, meta?: LogMeta): void {
  baseLog('info', event, meta)
}

export function logWarn(event: string, meta?: LogMeta): void {
  baseLog('warn', event, meta)
}

export function logError(event: string, meta?: LogMeta): void {
  baseLog('error', event, meta)
}
