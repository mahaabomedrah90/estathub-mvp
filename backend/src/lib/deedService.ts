import crypto from 'node:crypto'
import { prisma } from './prisma'

/**
 * Generate unique deed number
 * Format: DEED-{YEAR}-{SEQUENCE}
 */
export async function generateDeedNumber(): Promise<string> {
  const year = new Date().getFullYear()
  
  // Get count of deeds issued this year
  const count = await prisma.digitalDeed.count({
    where: {
      deedNumber: {
        startsWith: `DEED-${year}-`
      }
    }
  })
  
  const sequence = String(count + 1).padStart(5, '0')
  return `DEED-${year}-${sequence}`
}

/**
 * Calculate SHA-256 hash of deed data
 * Used for PDF verification via QR code
 */
export function calculateDeedHash(deedData: {
  deedNumber: string
  userId: number
  propertyId: number
  ownedTokens: number
  issuedAt: string
}): string {
  const data = JSON.stringify(deedData)
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Generate QR code data for deed verification
 * Format: URL to verification page with deed number and hash
 */
export function generateQRCodeData(deedNumber: string, deedHash: string): string {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  return `${baseUrl}/verify-deed?deed=${deedNumber}&hash=${deedHash}`
}

/**
 * Generate mock PDF deed (placeholder)
 * In production, this would use a PDF library like pdfkit or puppeteer
 */
export async function generateDeedPDF(deedData: {
  deedNumber: string
  userName: string
  propertyTitle: string
  ownedTokens: number
  ownershipPct: number
  issuedAt: string
  municipality: string
  district: string
}): Promise<{ pdfUrl: string; pdfHash: string }> {
  // TODO: Implement actual PDF generation
  // For now, return mock data
  
  const pdfContent = JSON.stringify(deedData)
  const pdfHash = crypto.createHash('sha256').update(pdfContent).digest('hex')
  
  // In production, save PDF to storage and return URL
  const pdfUrl = `/deeds/${deedData.deedNumber}.pdf`
  
  console.log(`📄 Mock PDF generated for deed: ${deedData.deedNumber}`)
  
  return { pdfUrl, pdfHash }
}

/**
 * Validate deed data before issuance
 */
export function validateDeedData(data: {
  userId: number
  propertyId: number
  ownedTokens: number
}): { valid: boolean; error?: string } {
  if (!data.userId || data.userId <= 0) {
    return { valid: false, error: 'Invalid user ID' }
  }
  
  if (!data.propertyId || data.propertyId <= 0) {
    return { valid: false, error: 'Invalid property ID' }
  }
  
  if (!data.ownedTokens || data.ownedTokens <= 0) {
    return { valid: false, error: 'Invalid token amount' }
  }
  
  return { valid: true }
}

/**
 * Issue or update a DigitalDeed after a confirmed payment.
 * Called fire-and-forget from orders.controller — never throws to caller.
 */
export async function issueDeedAfterPayment(params: {
  userId: string
  propertyId: string
  orderId: string
}): Promise<void> {
  const { userId, propertyId, orderId } = params

  const [property, user, holding, existingDeeds] = await Promise.all([
    prisma.property.findUnique({ where: { id: propertyId } }),
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.holding.findUnique({ where: { userId_propertyId: { userId, propertyId } } }),
    prisma.digitalDeed.findMany({
      where: { userId, propertyId },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  if (!property || !user) {
    console.error(`❌ [deed] Cannot issue deed — property or user not found (userId=${userId}, propertyId=${propertyId})`)
    return
  }
  if (!holding || holding.tokens <= 0) {
    console.error(`❌ [deed] No holding found after payment (userId=${userId}, propertyId=${propertyId})`)
    return
  }

  const totalIssuedTokens = existingDeeds.reduce((sum: number, d: any) => sum + d.ownedTokens, 0)
  // Use holding total (not order amount) so repeat buyers are handled correctly
  const newTokens = holding.tokens - totalIssuedTokens
  if (newTokens <= 0) {
    console.log(`ℹ️  [deed] All ${holding.tokens} tokens already covered by existing deed(s) for order ${orderId}`)
    return
  }

  const existing = existingDeeds.find((d: any) => d.status === 'ISSUED') || existingDeeds[0] || null
  const deedNumber = existing?.deedNumber ?? (await generateDeedNumber())
  const updatedTokens = (existing?.ownedTokens ?? 0) + newTokens
  const ownershipPct = (updatedTokens / property.totalTokens) * 100
  const issuedAt = new Date().toISOString()

  const { pdfUrl } = await generateDeedPDF({
    deedNumber,
    userName: user.fullName || user.email,
    propertyTitle: property.title,
    ownedTokens: updatedTokens,
    ownershipPct,
    issuedAt,
    municipality: property.municipality,
    district: property.district,
  })

  // calculateDeedHash expects numeric IDs; hash directly over string IDs instead
  const realHash = require('node:crypto')
    .createHash('sha256')
    .update(JSON.stringify({ deedNumber, userId, propertyId, ownedTokens: updatedTokens, issuedAt }))
    .digest('hex')

  const qrCodeData = generateQRCodeData(deedNumber, realHash)

  const deed = existing
    ? await prisma.digitalDeed.update({
        where: { id: existing.id },
        data: { ownedTokens: updatedTokens, ownershipPct, status: 'ISSUED', deedHash: realHash, qrCodeData, pdfUrl, issuedAt: new Date(issuedAt) },
      })
    : await prisma.digitalDeed.create({
        data: {
          deedNumber,
          userId,
          propertyId,
          orderId,
          ownedTokens: updatedTokens,
          ownershipPct,
          status: 'ISSUED',
          deedHash: realHash,
          qrCodeData,
          pdfUrl,
          issuedAt: new Date(issuedAt),
        },
      })

  await prisma.deedIssuanceEvent.create({
    data: { deedId: deed.id, deltaTokens: newTokens, orderId, note: 'Auto-issued after payment confirmation' },
  })

  console.log(`✅ [deed] Deed ${deedNumber} issued for order ${orderId} (${updatedTokens} tokens, ${ownershipPct.toFixed(2)}%)`)
}

/**
 * Check if user already has a deed for this property
 */
export async function userHasDeedForProperty(
  userId: number,
  propertyId: number
): Promise<boolean> {
  const existingDeed = await prisma.digitalDeed.findFirst({
    where: {
      userId: userId.toString(),
      propertyId: propertyId.toString(),
      status: {
        in: ['ISSUED', 'PENDING_APPROVAL']
      }
    }
  })
  
  return !!existingDeed
}