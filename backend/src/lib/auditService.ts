import { Request } from 'express'
import { prisma } from './prisma'

export interface AuditAdmin {
  userId?: string
  email?: string
}

export interface AuditInvestor {
  id?: string
  name?: string
}

export interface LogAdminActionParams {
  admin: AuditAdmin | null | undefined
  action: string
  targetType: string
  targetId?: string
  investor?: AuditInvestor | null
  amount?: number
  walletBefore?: number
  walletAfter?: number
  metadata?: Record<string, unknown>
  req?: Request
}

// Supported action constants — import these instead of writing raw strings.
export const AuditAction = {
  DEPOSIT_APPROVED:     'DEPOSIT_APPROVED',
  DEPOSIT_REJECTED:     'DEPOSIT_REJECTED',
  ORDER_APPROVED:       'ORDER_APPROVED',
  ORDER_CANCELLED:      'ORDER_CANCELLED',
  PROPERTY_APPROVED:    'PROPERTY_APPROVED',
  PROPERTY_REJECTED:    'PROPERTY_REJECTED',
  PROPERTY_UPDATED:     'PROPERTY_UPDATED',
  KYC_APPROVED:         'KYC_APPROVED',
  KYC_REJECTED:         'KYC_REJECTED',
  WALLET_ADJUSTMENT:    'WALLET_ADJUSTMENT',
  DIGITAL_DEED_ISSUED:      'DIGITAL_DEED_ISSUED',
  ADMIN_LOGIN:              'ADMIN_LOGIN',
  SETTINGS_CHANGED:         'SETTINGS_CHANGED',
  USER_STATUS_CHANGED:      'USER_STATUS_CHANGED',
  USER_ROLE_CHANGED:        'USER_ROLE_CHANGED',
  USER_VERIFICATION_CHANGED:'USER_VERIFICATION_CHANGED',
  INVESTMENT_PURCHASED:     'INVESTMENT_PURCHASED',
  FEATURE_FLAG_CHANGED:     'FEATURE_FLAG_CHANGED',
  PROPERTY_LEAD_STATUS_CHANGE: 'PROPERTY_LEAD_STATUS_CHANGE',
  PROPERTY_LEAD_RESUBMITTED:   'PROPERTY_LEAD_RESUBMITTED',
  ORDER_CREATED:            'ORDER_CREATED',
  ORDER_CONFIRMED:          'ORDER_CONFIRMED',
  WALLET_DEBITED:           'WALLET_DEBITED',
  HOLDING_CREATED:          'HOLDING_CREATED',
  WITHDRAWAL_APPROVED:      'WITHDRAWAL_APPROVED',
  WITHDRAWAL_REJECTED:      'WITHDRAWAL_REJECTED',
  DEPOSIT_REQUEST_CREATED:  'DEPOSIT_REQUEST_CREATED',
  WITHDRAWAL_REQUEST_CREATED: 'WITHDRAWAL_REQUEST_CREATED',
  USER_LOGIN:               'USER_LOGIN',
} as const

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction]

// Priority: x-forwarded-for → x-real-ip → cf-connecting-ip → req.ip → socket.remoteAddress
function extractClientIp(req: Request): string | null {
  try {
    const candidates: (string | string[] | undefined)[] = [
      req.headers['x-forwarded-for'],
      req.headers['x-real-ip'],
      req.headers['cf-connecting-ip'],
      req.ip,
      req.socket?.remoteAddress,
    ]

    for (const candidate of candidates) {
      if (!candidate) continue
      const raw = Array.isArray(candidate) ? candidate[0] : candidate
      if (!raw) continue
      // Take first IP before any comma (x-forwarded-for can be a list)
      const ip = raw.split(',')[0].trim()
      if (!ip) continue
      // Strip IPv6-mapped IPv4 prefix
      const clean = ip.startsWith('::ffff:') ? ip.slice(7) : ip
      // Sanity-check length (IPv6 max is 39, CIDR adds a few more chars)
      return clean.slice(0, 45) || null
    }
    return null
  } catch {
    return null
  }
}

function extractUserAgent(req: Request | undefined): string | null {
  if (!req) return null
  try {
    // Cast to unknown first — Express types user-agent as string|undefined,
    // but in practice it can arrive as a string[] via some proxies.
    const raw: unknown = req.headers?.['user-agent']
    if (typeof raw === 'string')  return raw.slice(0, 255) || null
    if (Array.isArray(raw)) {
      const first = raw[0]
      return typeof first === 'string' ? first.slice(0, 255) || null : null
    }
    return null
  } catch {
    return null
  }
}

/**
 * Fire-and-forget audit logger. Never throws — failures are only logged.
 * Always await this if you need to ensure ordering, but it is safe to fire without await.
 */
export async function logAdminAction(params: LogAdminActionParams): Promise<void> {
  try {
    const ipAddress  = params.req ? extractClientIp(params.req) : null
    const userAgent  = extractUserAgent(params.req)

    await prisma.adminAuditLog.create({
      data: {
        adminId:      params.admin?.userId   ?? null,
        adminEmail:   params.admin?.email    ?? null,
        action:       params.action,
        targetType:   params.targetType,
        targetId:     params.targetId        ?? null,
        investorId:   params.investor?.id    ?? null,
        investorName: params.investor?.name  ?? null,
        amount:       params.amount          ?? null,
        walletBefore: params.walletBefore    ?? null,
        walletAfter:  params.walletAfter     ?? null,
        metadata:     params.metadata ? (params.metadata as any) : undefined,
        ipAddress,
        userAgent,
      },
    })
  } catch (err: any) {
    console.error('⚠️  [AuditLog] Failed to persist admin action:', err.message)
  }
}
