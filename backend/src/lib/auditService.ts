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
  DIGITAL_DEED_ISSUED:  'DIGITAL_DEED_ISSUED',
  ADMIN_LOGIN:          'ADMIN_LOGIN',
  SETTINGS_CHANGED:     'SETTINGS_CHANGED',
} as const

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction]

function extractIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded
    return first.split(',')[0].trim() || null
  }
  return (req.socket?.remoteAddress) || null
}

/**
 * Fire-and-forget audit logger. Never throws — failures are only logged.
 * Always await this if you need to ensure ordering, but it is safe to fire without await.
 */
export async function logAdminAction(params: LogAdminActionParams): Promise<void> {
  try {
    const ipAddress  = params.req ? extractIp(params.req) : null
    const userAgent  = params.req?.headers?.['user-agent'] ?? null

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
